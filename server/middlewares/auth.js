const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const { TOKEN_COOKIE, verifyToken } = require('../utils/security');

const ADMIN_ROLES = ['admin', 'masteradmin'];

function readToken(req) {
  const fromCookie = req.cookies?.[TOKEN_COOKIE];
  if (fromCookie) return fromCookie;
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Verifies the JWT and loads the account behind it, so deleted accounts lose
 * access immediately. Sets `req.user` ({ id, role }) and `req.account`.
 */
async function authenticate(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Session expired, please log in again' });
  }

  try {
    const Model = ADMIN_ROLES.includes(payload.role) ? Admin : Employee;
    const account = await Model.findById(payload.id);
    if (!account) return res.status(401).json({ message: 'Account no longer exists' });

    // Use the role stored in the database, not the one in the token.
    const role = ADMIN_ROLES.includes(payload.role) ? account.role : 'employee';
    req.user = { id: String(account._id), role };
    req.account = account;
    return next();
  } catch (error) {
    return next(error);
  }
}

const allowRoles = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have access to this resource' });

const isAdminRole = (req) => ADMIN_ROLES.includes(req.user.role);
const isSelf = (req, param = 'id') => req.user.id === String(req.params[param]);

/** Admin acting on their own record (`:id`), or the master admin. */
const validateAdmin = [
  authenticate,
  (req, res, next) =>
    req.user.role === 'masteradmin' || (req.user.role === 'admin' && isSelf(req))
      ? next()
      : res.status(403).json({ message: 'You do not have access to this admin account' }),
];

/** Admin acting as themselves only (password / email changes). */
const validateAdminSelf = [
  authenticate,
  (req, res, next) =>
    isAdminRole(req) && isSelf(req) ? next() : res.status(403).json({ message: 'You can only change your own account' }),
];

/** Any admin (admin or master admin). */
const validateAdminView = [authenticate, allowRoles(...ADMIN_ROLES)];

/** Master admin only. */
const validateMasterAdmin = [authenticate, allowRoles('masteradmin')];

/** The employee themself, or any admin. */
const validateEmployee = [
  authenticate,
  (req, res, next) =>
    isAdminRole(req) || (req.user.role === 'employee' && isSelf(req))
      ? next()
      : res.status(403).json({ message: 'You do not have access to this employee account' }),
];

/** The employee themself only (password / email changes). */
const validateEmployeeSelf = [
  authenticate,
  (req, res, next) =>
    req.user.role === 'employee' && isSelf(req)
      ? next()
      : res.status(403).json({ message: 'You can only change your own account' }),
];

module.exports = {
  ADMIN_ROLES,
  readToken,
  authenticate,
  allowRoles,
  isAdminRole,
  validateAdmin,
  validateAdminSelf,
  validateAdminView,
  validateMasterAdmin,
  validateEmployee,
  validateEmployeeSelf,
};
