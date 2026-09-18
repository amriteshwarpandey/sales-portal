const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const config = require('../config/config');
const gateway = require('../utils/paymentGateway');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { logAudit } = require('../utils/audit');
const { emitToAdmins, emitToUser } = require('../socket');
const { isAdminRole } = require('../middlewares/auth');
const { PAYMENT_STATUSES } = require('../models/Customer');
const { isEmail, isObjectId, missingFields, escapeRegex, toStr } = require('../utils/validators');

const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'city', 'notes'];

function broadcast(customer, employeeId) {
  const payload = { id: String(customer._id), referralId: customer.referralId, paymentStatus: customer.paymentStatus };
  emitToAdmins('customerUpdate', payload);
  if (employeeId) emitToUser(employeeId, 'customerUpdate', payload);
}

/** Admins can see any customer; employees only the customers they referred. */
function canAccess(req, customer) {
  return isAdminRole(req) || (req.user.role === 'employee' && req.account.referralId === customer.referralId);
}

async function loadCustomer(req, res) {
  const customer = isObjectId(req.params.customerId) ? await Customer.findById(req.params.customerId) : null;
  if (!customer) {
    res.status(404).json({ message: 'Customer not found' });
    return null;
  }
  return customer;
}

function getPlans(req, res) {
  const plans = Object.entries(config.plans).map(([id, plan]) => ({ id, ...plan, currency: config.currency }));
  res.status(200).json({ plans });
}

/** Public: a customer signs up using an employee's referral ID. */
async function registerCustomer(req, res, next) {
  try {
    const missing = missingFields(req.body, ['firstName', 'lastName', 'email', 'phone', 'referralId', 'plan']);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });

    const email = toStr(req.body.email).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ message: 'Invalid email address' });

    const plan = config.plans[req.body.plan];
    if (!plan) return res.status(400).json({ message: 'Invalid plan selected' });

    const referralId = toStr(req.body.referralId).toUpperCase();
    const employee = await Employee.findOne({ referralId });
    if (!employee) return res.status(400).json({ message: 'Invalid referral ID' });

    const customer = await Customer.create({
      firstName: toStr(req.body.firstName),
      lastName: toStr(req.body.lastName),
      email,
      phone: toStr(req.body.phone),
      city: toStr(req.body.city) || undefined,
      notes: toStr(req.body.notes).slice(0, 2000) || undefined,
      referralId,
      employee: employee._id,
      plan: req.body.plan,
      amount: plan.amount,
      currency: config.currency,
    });
    await Employee.updateOne({ _id: employee._id }, { $inc: { totalCustomers: 1 } });
    broadcast(customer, employee._id);

    return res.status(201).json({
      message: 'Registration successful',
      customer: {
        _id: customer._id,
        firstName: customer.firstName,
        plan: customer.plan,
        amount: customer.amount,
        currency: customer.currency,
        paymentStatus: customer.paymentStatus,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/** Customers referred by an employee (`:id` is the employee). */
async function getCustomersByEmployee(req, res, next) {
  try {
    const employee = isObjectId(req.params.id) ? await Employee.findById(req.params.id) : null;
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const filter = { referralId: employee.referralId };
    if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;

    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ customers });
  } catch (error) {
    return next(error);
  }
}

async function getAllCustomers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const filter = {};
    if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.referralId) filter.referralId = toStr(req.query.referralId).toUpperCase();
    const search = toStr(req.query.q);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { phone: re }, { referralId: re }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      customers,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    return next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;
    if (!canAccess(req, customer)) return res.status(403).json({ message: 'You do not have access to this customer' });
    return res.status(200).json({ customer });
  } catch (error) {
    return next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;
    if (!canAccess(req, customer)) return res.status(403).json({ message: 'You do not have access to this customer' });

    for (const field of EDITABLE_FIELDS) {
      if (req.body?.[field] !== undefined) customer[field] = toStr(req.body[field]);
    }
    if (customer.isModified('email') && !isEmail(customer.email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (req.body?.plan !== undefined && req.body.plan !== customer.plan) {
      const plan = config.plans[req.body.plan];
      if (!plan) return res.status(400).json({ message: 'Invalid plan selected' });
      if (customer.paymentStatus !== 'pending') {
        return res.status(400).json({ message: 'The plan cannot be changed after payment' });
      }
      customer.plan = req.body.plan;
      customer.amount = plan.amount;
      customer.payment = undefined; // any earlier order was for the old amount
    }

    await customer.save();
    await logAudit(req, 'customer.updated', { target: customer._id });
    broadcast(customer, customer.employee);
    return res.status(200).json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    return next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;

    await customer.deleteOne();
    await Employee.updateOne(
      { referralId: customer.referralId, totalCustomers: { $gt: 0 } },
      { $inc: { totalCustomers: -1 } }
    );
    await logAudit(req, 'customer.deleted', { target: customer._id, meta: { email: customer.email } });
    broadcast({ ...customer.toJSON(), paymentStatus: 'deleted' }, customer.employee);
    return res.status(200).json({ message: 'Customer deleted successfully', customer });
  } catch (error) {
    return next(error);
  }
}

/** Public: start checkout for a registered customer. */
async function initiatePayment(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;
    if (customer.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already paid' });

    const order = await gateway.createOrder({
      amount: customer.amount,
      currency: customer.currency,
      receipt: String(customer._id),
    });
    customer.payment = { orderId: order.orderId };
    customer.paymentStatus = 'pending';
    await customer.save();

    return res.status(200).json({
      orderId: order.orderId,
      amount: customer.amount,
      currency: customer.currency,
      plan: config.plans[customer.plan],
      customerName: `${customer.firstName} ${customer.lastName}`,
      gateway: gateway.name,
    });
  } catch (error) {
    return next(error);
  }
}

/** Public: complete checkout. The order ID must match the one issued by initiatePayment. */
async function confirmPayment(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;
    if (customer.paymentStatus === 'paid') return res.status(400).json({ message: 'This order is already paid' });

    const orderId = toStr(req.body?.orderId);
    if (!orderId || orderId !== customer.payment?.orderId) {
      return res.status(400).json({ message: 'Invalid or expired order, please start checkout again' });
    }

    const capture = await gateway.capturePayment({ orderId, method: toStr(req.body?.method) || 'card' });
    if (capture.status !== 'captured') {
      customer.paymentStatus = 'failed';
      await customer.save();
      broadcast(customer, customer.employee);
      return res.status(402).json({ message: 'Payment failed' });
    }

    customer.paymentStatus = 'paid';
    customer.payment = {
      orderId,
      transactionId: capture.transactionId,
      method: capture.method,
      paidAt: new Date(),
      confirmedBy: gateway.name,
    };
    await customer.save();
    await logAudit(req, 'payment.captured', {
      target: customer._id,
      meta: { amount: customer.amount, transactionId: capture.transactionId },
    });

    try {
      await sendEmail({ to: customer.email, subject: 'Payment confirmed', html: templates.paymentReceipt(customer) });
    } catch {
      // The payment itself succeeded; a failed receipt email is not fatal.
    }
    broadcast(customer, customer.employee);

    return res.status(200).json({
      message: 'Payment successful',
      transactionId: capture.transactionId,
      amount: customer.amount,
      paidAt: customer.payment.paidAt,
    });
  } catch (error) {
    return next(error);
  }
}

/** Admin: record an offline payment, a refund, or a failure. */
async function updatePaymentStatus(req, res, next) {
  try {
    const customer = await loadCustomer(req, res);
    if (!customer) return undefined;

    const status = req.body?.paymentStatus;
    if (!PAYMENT_STATUSES.includes(status)) {
      return res.status(400).json({ message: `paymentStatus must be one of: ${PAYMENT_STATUSES.join(', ')}` });
    }
    if (status === customer.paymentStatus) {
      return res.status(400).json({ message: `Payment is already ${status}` });
    }

    const previous = customer.paymentStatus;
    customer.paymentStatus = status;
    if (status === 'paid') {
      customer.payment = {
        ...customer.payment?.toObject?.(),
        transactionId: toStr(req.body?.transactionId) || `manual_${Date.now()}`,
        method: toStr(req.body?.method) || 'offline',
        paidAt: new Date(),
        confirmedBy: `${req.account.firstName} ${req.account.lastName}`,
      };
    }
    await customer.save();
    await logAudit(req, 'payment.statusChanged', { target: customer._id, meta: { from: previous, to: status } });
    broadcast(customer, customer.employee);

    return res.status(200).json({ message: `Payment marked as ${status}`, customer });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPlans,
  registerCustomer,
  getCustomersByEmployee,
  getAllCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  initiatePayment,
  confirmPayment,
  updatePaymentStatus,
};
