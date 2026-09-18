const config = require('../config/config');

function requestLogger(req, res, next) {
  if (config.isTest) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  return next();
}

module.exports = requestLogger;
