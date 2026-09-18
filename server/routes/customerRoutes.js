const express = require('express');
const customer = require('../controllers/customerController');
const { authenticate, allowRoles, validateAdminView, validateEmployee } = require('../middlewares/auth');
const { publicFormLimiter } = require('../middlewares/rateLimit');

const router = express.Router();
const anyStaff = [authenticate, allowRoles('admin', 'masteradmin', 'employee')];

// Public: plans, sign-up with a referral ID, and checkout.
router.get('/plans', customer.getPlans);
router.post('/register', publicFormLimiter, customer.registerCustomer);
router.post('/payment/initiate/:customerId', publicFormLimiter, customer.initiatePayment);
router.post('/payment/confirm/:customerId', publicFormLimiter, customer.confirmPayment);

// Admin
router.get('/all', validateAdminView, customer.getAllCustomers);
router.put('/payment/status/:customerId', validateAdminView, customer.updatePaymentStatus);
router.delete('/:customerId', validateAdminView, customer.deleteCustomer);

// Admin, or the employee who referred the customer
router.get('/detail/:customerId', anyStaff, customer.getCustomer);
router.put('/:customerId', anyStaff, customer.updateCustomer);

// Customers referred by an employee (`:id` is the employee)
router.get('/:id', validateEmployee, customer.getCustomersByEmployee);

module.exports = router;
