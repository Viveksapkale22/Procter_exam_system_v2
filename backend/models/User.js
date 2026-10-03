const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: { type: String, default: '' },
    rollNumber: { type: String, default: '', trim: true },
    branch: { type: String, default: '', trim: true },
    department: { type: String, default: '', trim: true },
    picture: { type: String, default: '' },
    googleId: { type: String, default: '' },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    isProfileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function preSave(next) {
  if (!this.email) {
    return next(new Error('User email is required.'));
  }

  next();
});

module.exports = mongoose.model('User', UserSchema);
