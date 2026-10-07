const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { initSocket } = require('./socket/socketHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const examRoutes = require('./routes/examRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

const app = express();
const server = http.createServer(app);

// Explicit list of allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://procter-exam-system-v2.vercel.app',
  'https://test.vivek-22.tech',
  'https://www.vivek-22.tech/',
  'https://procter.vivek-22.tech'
];

// FRONTEND_URL may contain one or more deployed frontend origins, separated by
// commas. Vite preview deployments are also allowed for this Vercel project.
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

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server requests or matching origin domains
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      // Pass false instead of throwing an Error object to prevent 500 crashes
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT',"PATCH",'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.send('Proctor Exam System API is running, by vivek sapkale');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/feedback', feedbackRoutes);

initSocket(server);

async function startServer() {
  try {
    await connectDB();

    const port = Number(process.env.PORT) || 5000;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
