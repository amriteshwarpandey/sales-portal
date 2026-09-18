const Employee = require('../models/Employee');
const Customer = require('../models/Customer');
const { createAccountController } = require('./accountController');
const { logAudit } = require('../utils/audit');
const { emitToAdmins } = require('../socket');
const { isObjectId, escapeRegex, toStr } = require('../utils/validators');

const account = createAccountController({
  Model: Employee,
  label: 'Employee',
  idField: 'referralId',
  updateEvent: 'employeeUpdateResponse',
});

const SORTABLE_FIELDS = ['_id', 'firstName', 'lastName', 'email', 'referralId', 'totalCustomers', 'createdAt'];

async function findEmployee(id) {
  return isObjectId(id) ? Employee.findById(id) : null;
}

async function getEmployee(req, res, next) {
  try {
    const employee = await findEmployee(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    return res.status(200).json({ employee });
  } catch (error) {
    return next(error);
  }
}

/** Recounts the employee's customers, stores the total and returns it. */
async function getTotalCustomers(req, res, next) {
  try {
    const employee = await findEmployee(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const [totalCustomers, paidCustomers] = await Promise.all([
      Customer.countDocuments({ referralId: employee.referralId }),
      Customer.countDocuments({ referralId: employee.referralId, paymentStatus: 'paid' }),
    ]);
    if (employee.totalCustomers !== totalCustomers) {
      employee.totalCustomers = totalCustomers;
      await employee.save();
    }

    return res.status(200).json({ employeeId: employee._id, totalCustomers, paidCustomers });
  } catch (error) {
    return next(error);
  }
}

async function fetchEmployees(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const sortField = SORTABLE_FIELDS.includes(req.query.sortField) ? req.query.sortField : '_id';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const filter = {};
    const search = toStr(req.query.q);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { referralId: re }];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .sort({ [sortField]: sortOrder, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Employee.countDocuments(filter),
    ]);

    return res.status(200).json({
      employees,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
      sort: { sortField, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const employee = await findEmployee(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await employee.deleteOne();
    await logAudit(req, 'employee.deleted', {
      target: employee._id,
      meta: { email: employee.email, referralId: employee.referralId },
    });
    emitToAdmins('employeeDeleted', { id: String(employee._id) });

    return res.status(200).json({ message: 'Employee deleted successfully', employee });
  } catch (error) {
    return next(error);
  }
}

module.exports = { ...account, getEmployee, getTotalCustomers, fetchEmployees, deleteEmployee };
