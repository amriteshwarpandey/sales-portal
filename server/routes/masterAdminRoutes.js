const express = require('express');
const admin = require('../controllers/adminController');
const master = require('../controllers/masterAdminController');
const { validateMasterAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(validateMasterAdmin);

router.get('/admins', admin.fetchAdmins);
router.post('/admins', admin.registerAdmin);
router.delete('/admins/:id', admin.deleteAdmin);
router.get('/overview', admin.getStats);
router.get('/audit-logs', master.getAuditLogs);

module.exports = router;
