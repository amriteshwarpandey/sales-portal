const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const TOKEN_COOKIE = 'token';

function signToken(id, role) {
  return jwt.sign({ id: String(id), role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Strict',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, { ...cookieOptions(), maxAge: config.cookieMaxAgeMs });
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, cookieOptions());
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

// Keyed hash, so the resume link can't be derived from a known email address.
function emailHash(email) {
  return crypto.createHmac('sha256', config.jwtSecret).update(email.toLowerCase().trim()).digest('hex');
}

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function generatePassword(length = 12) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  // Fisher-Yates shuffle so the required classes aren't always first.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function generateReferralId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'EMP';
  for (let i = 0; i < 6; i += 1) id += alphabet[crypto.randomInt(alphabet.length)];
  return id;
}

module.exports = {
  TOKEN_COOKIE,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  generateOtp,
  hashValue,
  emailHash,
  timingSafeEqualStr,
  generatePassword,
  generateReferralId,
};
