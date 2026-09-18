require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }
  jwtSecret = 'dev-only-insecure-secret';
  if (!isTest) console.warn('[config] JWT_SECRET not set - using an insecure development secret');
}

// Products a customer can buy. Prices are decided server-side (in paise, INR).
const PLANS = {
  basic: { name: 'Basic', amount: 499900 },
  standard: { name: 'Standard', amount: 999900 },
  premium: { name: 'Premium', amount: 1999900 },
};

// CLIENT_URL may list several origins (comma-separated); the first is used in email links.
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

module.exports = {
  isProduction,
  isTest,
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/salesportal',
  clientUrl: clientUrls[0],
  clientUrls,
  jwtSecret,
  jwtExpiresIn: '1h',
  // Secure cookies need HTTPS (browsers exempt localhost). Defaults to on in production;
  // set COOKIE_SECURE=false when serving over plain HTTP on a LAN.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
  cookieMaxAgeMs: 60 * 60 * 1000,
  email: process.env.EMAIL || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  hrEmail: process.env.HR_EMAIL || process.env.EMAIL || 'hr@salesportal.local',
  otpTtlSeconds: 300,
  otpMaxAttempts: 5,
  // How long after a verified OTP the email may be changed
  otpVerifiedWindowSeconds: 600,
  plans: PLANS,
  currency: 'INR',
};
