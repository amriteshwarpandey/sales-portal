const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { sendEmail } = require('../utils/sendEmail');
const templates = require('../utils/emailTemplates');
const { logAudit } = require('../utils/audit');
const { emitToUser, emitToAdmins } = require('../socket');
const {
  TOKEN_COOKIE,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  generateOtp,
  hashValue,
  timingSafeEqualStr,
} = require('../utils/security');
const { isEmail, isObjectId, isStrongPassword, toStr } = require('../utils/validators');

const BCRYPT_ROUNDS = 10;
const OTP_SELECT = '+otp +otpCreatedAt +otpAttempts +otpVerifiedAt';

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function logout(req, res) {
  if (!req.cookies?.[TOKEN_COOKIE]) {
    return res.status(400).json({ message: 'No active session to log out from' });
  }
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Logged out successfully' });
}

/**
 * Builds the login / email-change / password-change handlers shared by admins
 * and employees.
 *
 * @param {object} opts
 * @param {import('mongoose').Model} opts.Model
 * @param {string} opts.label        Human readable name ("Admin", "Employee")
 * @param {string} opts.idField      Alternate login field (adminId / referralId)
 * @param {string} opts.updateEvent  Socket.IO event emitted after an email change
 */
function createAccountController({ Model, label, idField, updateEvent }) {
  async function findAccount(id, select = '') {
    if (!isObjectId(id)) return null;
    return Model.findById(id).select(select);
  }

  async function login(req, res, next) {
    try {
      const identifier = toStr(req.body?.email);
      const password = req.body?.password;
      if (!identifier || typeof password !== 'string' || !password) {
        return res.status(400).json({ message: 'Email/ID and password are required' });
      }

      let account = await Model.findOne({ email: identifier.toLowerCase() }).select('+password');
      if (!account) account = await Model.findOne({ [idField]: identifier.toUpperCase() }).select('+password');
      if (!account) {
        return res.status(400).json({ message: 'Incorrect email or ID' });
      }

      const matches = await bcrypt.compare(password, account.password);
      if (!matches) {
        await logAudit(req, 'login.failed', { actor: account, target: account._id });
        return res.status(401).json({ message: 'Incorrect password' });
      }

      const role = account.role || 'employee';
      const token = signToken(account._id, role);
      setAuthCookie(res, token);
      await logAudit(req, 'login', { actor: account, target: account._id });

      return res.status(200).json({
        message: 'Login successful',
        token,
        role,
        user: account.toJSON(),
      });
    } catch (error) {
      return next(error);
    }
  }

  /** Step 1 of an email change: confirm the password, then email an OTP. */
  async function checkPassAndSendOtp(req, res, next) {
    try {
      const { currentPassword } = req.body || {};
      const account = await findAccount(req.params.id, '+password');
      if (!account) return res.status(404).json({ message: `${label} not found` });

      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, account.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const otp = generateOtp();
      await Model.updateOne(
        { _id: account._id },
        { $set: { otp: hashValue(otp), otpCreatedAt: new Date(), otpAttempts: 0 }, $unset: { otpVerifiedAt: 1 } }
      );
      await sendEmail({
        to: account.email,
        subject: 'Your Sales Portal verification code',
        html: templates.otp(account.firstName, otp),
      });

      return res.status(200).json({ message: `OTP sent to ${account.email}. It is valid for 5 minutes.` });
    } catch (error) {
      return next(error);
    }
  }

  /** Step 2: verify the OTP. A verified OTP unlocks the email change for a short window. */
  async function verifyOtp(req, res, next) {
    try {
      const otp = toStr(req.body?.OTP ?? req.body?.otp);
      const account = await findAccount(req.params.id, OTP_SELECT);
      if (!account || !account.otp) {
        return res.status(404).json({ message: 'No pending OTP for this account' });
      }

      const ageSeconds = (Date.now() - account.otpCreatedAt.getTime()) / 1000;
      if (ageSeconds > config.otpTtlSeconds) {
        await Model.updateOne({ _id: account._id }, { $unset: { otp: 1, otpCreatedAt: 1 } });
        return res.status(410).json({ message: 'OTP has expired, please request a new one' });
      }

      if (!otp || !timingSafeEqualStr(hashValue(otp), account.otp)) {
        const attempts = (account.otpAttempts || 0) + 1;
        if (attempts >= config.otpMaxAttempts) {
          await Model.updateOne({ _id: account._id }, { $unset: { otp: 1, otpCreatedAt: 1 }, $set: { otpAttempts: 0 } });
          return res.status(429).json({ message: 'Too many incorrect attempts, please request a new OTP' });
        }
        await Model.updateOne({ _id: account._id }, { $set: { otpAttempts: attempts } });
        return res.status(401).json({ message: 'Invalid OTP' });
      }

      await Model.updateOne(
        { _id: account._id },
        { $unset: { otp: 1, otpCreatedAt: 1 }, $set: { otpAttempts: 0, otpVerifiedAt: new Date() } }
      );
      return res.status(200).json({ message: 'OTP verified' });
    } catch (error) {
      return next(error);
    }
  }

  /** Step 3: change the email. Requires an OTP verified in the last few minutes. */
  async function updateEmail(req, res, next) {
    try {
      const newEmail = toStr(req.body?.newEmail).toLowerCase();
      if (!isEmail(newEmail)) return res.status(400).json({ message: 'A valid new email is required' });

      const account = await findAccount(req.params.id, '+otpVerifiedAt');
      if (!account) return res.status(404).json({ message: `${label} not found` });

      const verifiedAt = account.otpVerifiedAt?.getTime() || 0;
      if (Date.now() - verifiedAt > config.otpVerifiedWindowSeconds * 1000) {
        return res.status(403).json({ message: 'Please verify the OTP before changing your email' });
      }
      if (newEmail === account.email) {
        return res.status(400).json({ message: 'New email must be different from the current email' });
      }
      if (await Model.exists({ email: newEmail })) {
        return res.status(409).json({ message: 'This email is already in use' });
      }

      const oldEmail = account.email;
      account.email = newEmail;
      account.otpVerifiedAt = undefined;
      await account.save();
      await logAudit(req, 'email.updated', { target: account._id, meta: { from: oldEmail, to: newEmail } });

      const payload = { id: String(account._id), email: newEmail };
      emitToUser(account._id, updateEvent, payload);
      emitToAdmins(updateEvent, payload);

      return res.status(200).json({ message: 'Email updated successfully', user: account.toJSON() });
    } catch (error) {
      return next(error);
    }
  }

  async function checkPassword(req, res, next) {
    try {
      const { currentPassword } = req.body || {};
      const account = await findAccount(req.params.id, '+password');
      if (!account) return res.status(404).json({ message: `${label} not found` });
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, account.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      return res.status(200).json({ message: 'Password verified' });
    } catch (error) {
      return next(error);
    }
  }

  /** Changes the password. The current password is re-checked here, not only in checkPassword. */
  async function updatePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: 'New password must be 8-128 characters long' });
      }

      const account = await findAccount(req.params.id, '+password');
      if (!account) return res.status(404).json({ message: `${label} not found` });
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, account.password))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      if (await bcrypt.compare(newPassword, account.password)) {
        return res.status(400).json({ message: 'New password must be different from the current one' });
      }

      account.password = await hashPassword(newPassword);
      await account.save();
      await logAudit(req, 'password.updated', { target: account._id });

      return res.status(200).json({ message: 'Password updated successfully', user: account.toJSON() });
    } catch (error) {
      return next(error);
    }
  }

  return { login, logout, checkPassAndSendOtp, verifyOtp, updateEmail, checkPassword, updatePassword };
}

module.exports = { createAccountController, hashPassword, logout, BCRYPT_ROUNDS };
