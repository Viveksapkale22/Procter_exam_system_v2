const { Server } = require('socket.io');

let io;

function initSocket(server) {
  // Explicit base allowed origins
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://procter-exam-system-v2.vercel.app',
    'https://test.vivek-22.tech',
    'https://www.vivek-22.tech',
    'https://procter.vivek-22.tech'
  ];

  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  configuredOrigins.forEach((origin) => {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  });

  const isAllowedOrigin = (origin) => {
    if (!origin || allowedOrigins.includes(origin)) return true;
    try {
      return new URL(origin).hostname.endsWith('.vercel.app');
    } catch {
      return false;
    }
  };

  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps/curl) or explicit allowed origins
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          // Returning false safely rejects without throwing uncaught server errors
          callback(null, false);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-admin-room', () => {
      socket.join('admin-room');
    });

    socket.on('join-student-room', ({ studentId }) => {
      if (studentId) {
        socket.join(`student-${studentId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

function emitExamLockStatus(examId, isLocked) {
  if (!io) return;
  io.emit('exam-lock-status', { examId, isLocked });
}

function emitSubmissionUpdate(submission) {
  if (!io) return;
  io.to('admin-room').emit('submission-update', submission);
}

module.exports = {
  initSocket,
  emitExamLockStatus,
  emitSubmissionUpdate,
};
