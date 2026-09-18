const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config/config');
const requestLogger = require('./middlewares/requestLogger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientUrls, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/session', require('./routes/sessionRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api/employee', require('./routes/employeeRoutes'));
  app.use('/api/candidate', require('./routes/candidateRoutes'));
  app.use('/api/customer', require('./routes/customerRoutes'));
  app.use('/api/master', require('./routes/masterAdminRoutes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
