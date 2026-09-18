const express = require('express');
const admin = require('../controllers/adminController');
const {
  validateAdmin,
  validateAdminSelf,
  validateAdminView,
  validateMasterAdmin,
} = require('../middlewares/auth');
const { loginLimiter, sensitiveLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

// Static paths first, so they are not captured by "/:id".
router.get('/fetchadmin', validateAdminView, admin.fetchAdmins);
router.get('/stats/summary', validateAdminView, admin.getStats);
router.post('/login', loginLimiter, admin.login);
router.post('/logout', admin.logout);
router.post('/register', validateMasterAdmin, admin.registerAdmin);

// Email change: password check + OTP -> verify OTP -> update email
router.post('/checkPass/:id', sensitiveLimiter, validateAdminSelf, admin.checkPassAndSendOtp);
router.post('/otp/:id', sensitiveLimiter, validateAdminSelf, admin.verifyOtp);
router.put('/updateEmail/:id', validateAdminSelf, admin.updateEmail);

// Password change: check current password -> update password
router.post('/checkpass-pass/:id', sensitiveLimiter, validateAdminSelf, admin.checkPassword);
router.put('/passupdate/:id', sensitiveLimiter, validateAdminSelf, admin.updatePassword);

router.get('/:id', validateAdmin, admin.getAdmin);
router.delete('/:id', validateMasterAdmin, admin.deleteAdmin);

module.exports = router;
