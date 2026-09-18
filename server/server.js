const http = require('http');
const config = require('./config/config');
const { connectDB, disconnectDB } = require('./config/database');
const { createApp } = require('./app');
const { initSocket } = require('./socket');
const { isMailConfigured } = require('./utils/sendEmail');

async function start() {
  await connectDB(config.mongoUri);

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    console.log(`[server] listening on http://localhost:${config.port}`);
    if (!isMailConfigured()) {
      console.log('[server] EMAIL/EMAIL_PASSWORD not set - emails (OTPs, invites, credentials) are printed here instead');
    }
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('[server] failed to start:', error);
  process.exit(1);
});
