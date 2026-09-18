const rateLimit = require('express-rate-limit');
const config = require('../config/config');

function limiter(windowMinutes, max, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    message: { message },
  });
}

module.exports = {
  loginLimiter: limiter(15, 20, 'Too many login attempts, please try again in a few minutes'),
  sensitiveLimiter: limiter(15, 30, 'Too many attempts, please try again later'),
  publicFormLimiter: limiter(60, 30, 'Too many submissions from this network, please try again later'),
};
