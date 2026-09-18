const Admin = require('../models/Admin');
const Counter = require('../models/Counter');
const Employee = require('../models/Employee');
const Candidate = require('../models/Candidate');
const Customer = require('../models/Customer');
const { createAccountController, hashPassword } = require('./accountController');
const { logAudit } = require('../utils/audit');
const { isEmail, isObjectId, isStrongPassword, missingFields, toStr } = require('../utils/validators');

const account = createAccountController({
  Model: Admin,
  label: 'Admin',
  idField: 'adminId',
  updateEvent: 'adminUpdateResponse',
});

async function fetchAdmins(req, res, next) {
  try {
    const admins = await Admin.find().sort({ createdAt: 1 });
    return res.status(200).json({ admins });
  } catch (error) {
    return next(error);
  }
}

async function getAdmin(req, res, next) {
  try {
    const admin = isObjectId(req.params.id) ? await Admin.findById(req.params.id) : null;
    if (!admin) return res.status(404).json({ message: 'Admin not found' });
    return res.status(200).json({ admin });
  } catch (error) {
    return next(error);
  }
}

async function registerAdmin(req, res, next) {
  try {
    const missing = missingFields(req.body, ['firstName', 'lastName', 'email', 'password']);
    if (missing.length) return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });

    const email = toStr(req.body.email).toLowerCase();
    if (!isEmail(email)) return res.status(400).json({ message: 'Invalid email address' });
    if (!isStrongPassword(req.body.password)) {
      return res.status(400).json({ message: 'Password must be 8-128 characters long' });
    }
    if (await Admin.exists({ email })) {
      return res.status(409).json({ message: 'An admin with this email is already registered' });
    }

    const seq = await Counter.next('adminId');
    const admin = await Admin.create({
      firstName: toStr(req.body.firstName),
      lastName: toStr(req.body.lastName),
      email,
      password: await hashPassword(req.body.password),
      adminId: `ADM${seq}`,
      role: 'admin',
    });
    await logAudit(req, 'admin.created', { target: admin._id, meta: { email, adminId: admin.adminId } });

    return res.status(201).json({ message: 'Admin registered successfully', admin });
  } catch (error) {
    return next(error);
  }
}

async function deleteAdmin(req, res, next) {
  try {
    if (!isObjectId(req.params.id)) return res.status(404).json({ message: 'Admin not found' });
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const target = await Admin.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Admin not found' });
    if (target.role === 'masteradmin') {
      return res.status(403).json({ message: 'The master admin account cannot be deleted' });
    }

    await target.deleteOne();
    await logAudit(req, 'admin.deleted', { target: target._id, meta: { email: target.email } });
    return res.status(200).json({ message: 'Admin deleted successfully', admin: target });
  } catch (error) {
    return next(error);
  }
}

/** Dashboard analytics: pipeline, revenue and top performers. */
async function getStats(req, res, next) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5, 1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [employees, admins, candidatesByStatus, paymentsByStatus, monthly, topEmployees, recentCustomers] =
      await Promise.all([
        Employee.countDocuments(),
        Admin.countDocuments(),
        Candidate.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Customer.aggregate([
          { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
        ]),
        Customer.aggregate([
          { $match: { paymentStatus: 'paid', 'payment.paidAt': { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { y: { $year: '$payment.paidAt' }, m: { $month: '$payment.paidAt' } },
              revenue: { $sum: '$amount' },
              sales: { $sum: 1 },
            },
          },
          { $sort: { '_id.y': 1, '_id.m': 1 } },
        ]),
        Customer.aggregate([
          {
            $group: {
              _id: '$referralId',
              customers: { $sum: 1 },
              revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] } },
            },
          },
          { $sort: { revenue: -1, customers: -1 } },
          { $limit: 5 },
          { $lookup: { from: 'employees', localField: '_id', foreignField: 'referralId', as: 'employee' } },
          { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              referralId: '$_id',
              customers: 1,
              revenue: 1,
              employeeId: '$employee._id',
              name: { $concat: [{ $ifNull: ['$employee.firstName', 'Unknown'] }, ' ', { $ifNull: ['$employee.lastName', ''] }] },
            },
          },
        ]),
        Customer.find().sort({ createdAt: -1 }).limit(5),
      ]);

    // Fill in months with no sales so charts have a continuous axis.
    const months = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(sixMonthsAgo.getMonth() + i);
      const found = monthly.find((row) => row._id.y === d.getFullYear() && row._id.m === d.getMonth() + 1);
      months.push({
        month: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        revenue: found?.revenue || 0,
        sales: found?.sales || 0,
      });
    }

    const byStatus = (rows) => Object.fromEntries(rows.map((row) => [row._id, row]));
    const payments = byStatus(paymentsByStatus);
    const candidates = Object.fromEntries(candidatesByStatus.map((row) => [row._id, row.count]));

    return res.status(200).json({
      totals: {
        employees,
        admins,
        customers: paymentsByStatus.reduce((sum, row) => sum + row.count, 0),
        candidates: candidatesByStatus.reduce((sum, row) => sum + row.count, 0),
        revenue: payments.paid?.amount || 0,
        paidSales: payments.paid?.count || 0,
        pendingPayments: payments.pending?.count || 0,
      },
      candidates,
      monthly: months,
      topEmployees,
      recentCustomers,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { ...account, fetchAdmins, getAdmin, registerAdmin, deleteAdmin, getStats };
