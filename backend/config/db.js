const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

let memoryServer;

function getAdminBootstrapConfig(env = process.env) {
  const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.ADMIN_PASSWORD || '');

  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error('Both ADMIN_EMAIL and ADMIN_PASSWORD are required to bootstrap an admin account.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }

  return {
    name: String(env.ADMIN_NAME || 'System Admin').trim() || 'System Admin',
    email,
    password,
  };
}

async function seedDefaultAdmin() {
  const adminConfig = getAdminBootstrapConfig();
  if (!adminConfig) return null;

  let admin = await User.findOne({ email: adminConfig.email });
  const passwordIsCurrent = admin?.password
    ? await bcrypt.compare(adminConfig.password, admin.password)
    : false;
  const hashedPassword = passwordIsCurrent
    ? admin.password
    : await bcrypt.hash(adminConfig.password, 10);

  if (!admin) {
    admin = new User({ email: adminConfig.email });
  }

  admin.name = adminConfig.name;
  admin.email = adminConfig.email;
  admin.password = hashedPassword;
  admin.role = 'admin';
  admin.isProfileComplete = true;
  await admin.save();

  console.log('Admin account bootstrap completed.');
  return admin;
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri, {
        dbName: process.env.DB_NAME || 'proctor_exam_system',
      });
      console.log('MongoDB connected using configured URI');
    } else {
      memoryServer = await MongoMemoryServer.create();
      const uri = memoryServer.getUri();

      await mongoose.connect(uri, {
        dbName: process.env.DB_NAME || 'proctor_exam_system',
      });

      console.log('MongoDB connected using in-memory server');
    }

    await seedDefaultAdmin();
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
}

module.exports = { connectDB, disconnectDB, seedDefaultAdmin, getAdminBootstrapConfig };
