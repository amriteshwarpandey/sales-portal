const express = require('express');
const employee = require('../controllers/employeeController');
const { validateAdminView, validateEmployee, validateEmployeeSelf } = require('../middlewares/auth');
const { loginLimiter, sensitiveLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

router.get('/fetchemployees', validateAdminView, employee.fetchEmployees);
router.get('/employee/total-customers/:id', validateEmployee, employee.getTotalCustomers);
router.get('/adminview/:id', validateAdminView, employee.getEmployee);
router.post('/login', loginLimiter, employee.login);
router.post('/logout', employee.logout);

// Email change: password check + OTP -> verify OTP -> update email
router.post('/checkPass/:id', sensitiveLimiter, validateEmployeeSelf, employee.checkPassAndSendOtp);
router.post('/otp/:id', sensitiveLimiter, validateEmployeeSelf, employee.verifyOtp);
router.put('/updateEmail/:id', validateEmployeeSelf, employee.updateEmail);

// Password change: check current password -> update password
router.post('/cpass/:id', sensitiveLimiter, validateEmployeeSelf, employee.checkPassword);
router.put('/updateUser/:id', sensitiveLimiter, validateEmployeeSelf, employee.updatePassword);

router.get('/:id', validateEmployee, employee.getEmployee);
router.delete('/:id', validateAdminView, employee.deleteEmployee);

module.exports = router;
