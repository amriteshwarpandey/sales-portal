const { Server } = require('socket.io');
const cookie = require('cookie');
const config = require('./config/config');
const { TOKEN_COOKIE, verifyToken } = require('./utils/security');

let io = null;

/**
 * Real-time updates. Each authenticated socket joins `user:<id>`, and admins also
 * join the `admins` room, so events only reach the people allowed to see them.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrls, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies[TOKEN_COOKIE] || socket.handshake.auth?.token;
      if (!token) return next(new Error('unauthorized'));
      socket.user = verifyToken(token);
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    if (role === 'admin' || role === 'masteradmin') socket.join('admins');
    if (role === 'masteradmin') socket.join('masteradmins');
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

function emitToAdmins(event, payload) {
  if (io) io.to('admins').emit(event, payload);
}

function getIO() {
  return io;
}

module.exports = { initSocket, emitToUser, emitToAdmins, getIO };
