const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const normalizeProfileInput = (payload = {}) => {
  const cleaned = {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    role: String(payload.role || 'student').trim().toLowerCase(),
    rollNumber: String(payload.rollNumber || '').trim(),
    branch: String(payload.branch || payload.department || '').trim(),
    department: String(payload.department || payload.branch || '').trim(),
    password: String(payload.password || '').trim(),
    picture: String(payload.picture || '').trim(),
    googleId: String(payload.googleId || '').trim(),
    authProvider: String(payload.authProvider || 'local').trim().toLowerCase(),
  };

  if (cleaned.role === 'admin') {
    cleaned.role = 'admin';
  } else {
    cleaned.role = 'student';
  }

  return cleaned;
};

const isProfileComplete = (profile = {}) => {
  const normalized = normalizeProfileInput(profile);
  return Boolean(
    normalized.email &&
    normalized.name &&
    normalized.branch &&
    normalized.rollNumber &&
    normalized.role
  );
};

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: '1d' }
);

const canGoogleLoginAsRole = (user, requestedRole = 'student') => {
  const role = String(requestedRole || 'student').trim().toLowerCase();

  if (role === 'admin') {
    return Boolean(user && user.role === 'admin');
  }

  return true;
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  rollNumber: user.rollNumber || '',
  branch: user.branch || user.department || '',
  department: user.department || user.branch || '',
  role: user.role,
  picture: user.picture || '',
  authProvider: user.authProvider || 'local',
  isProfileComplete: !!user.isProfileComplete,
  googleId: user.googleId || '',
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
});

exports.normalizeProfileInput = normalizeProfileInput;
exports.isProfileComplete = isProfileComplete;
exports.canGoogleLoginAsRole = canGoogleLoginAsRole;

exports.register = async (req, res) => {
  try {
    const profile = normalizeProfileInput(req.body);

    if (!profile.name || !profile.email || !profile.password || !profile.branch || !profile.rollNumber) {
      return res.status(400).json({ message: 'Name, email, password, branch, and roll number are required.' });
    }

    if (profile.role === 'admin') {
      return res.status(403).json({ message: 'Admin account is managed by the system owner. Use the admin login credentials.' });
    }

    const existingUser = await User.findOne({ email: profile.email });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const existingRoll = await User.findOne({ rollNumber: profile.rollNumber });
    if (existingRoll) {
      return res.status(409).json({ message: 'This roll number is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(profile.password, 10);
    const user = await User.create({
      name: profile.name,
      email: profile.email,
      password: hashedPassword,
      rollNumber: profile.rollNumber,
      branch: profile.branch,
      department: profile.department || profile.branch,
      role: 'student',
      authProvider: 'local',
      isProfileComplete: true,
    });

    const token = generateToken(user);
    return res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to register user.', error: error.message });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const profile = normalizeProfileInput(req.body);
    const { email } = profile;

    if (!email || !profile.name || !profile.branch || !profile.rollNumber) {
      return res.status(400).json({ message: 'Email, name, branch, and roll number are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found. Please log in again.' });
    }

    if (existingUser.rollNumber && existingUser.rollNumber !== profile.rollNumber && existingUser.role !== 'admin') {
      const duplicate = await User.findOne({ rollNumber: profile.rollNumber, _id: { $ne: existingUser._id } });
      if (duplicate) {
        return res.status(409).json({ message: 'This roll number is already assigned to another user.' });
      }
    }

    existingUser.name = profile.name;
    existingUser.rollNumber = profile.rollNumber;
    existingUser.branch = profile.branch;
    existingUser.department = profile.department || profile.branch;
    existingUser.isProfileComplete = true;

    if (profile.password) {
      existingUser.password = await bcrypt.hash(profile.password, 10);
    }

    await existingUser.save();
    const token = generateToken(existingUser);
    return res.json({ token, user: sanitizeUser(existingUser) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to save profile.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password || '');
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.role === 'admin') {
      const token = generateToken(user);
      return res.json({ token, user: sanitizeUser(user) });
    }

    if (!user.isProfileComplete || !user.rollNumber || !user.branch) {
      return res.status(403).json({
        message: 'Complete your profile before accessing the student dashboard.',
        requiresProfile: true,
        user: sanitizeUser(user),
      });
    }

    const token = generateToken(user);
    return res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body || {};
    const requestedRole = String(role || 'student').trim().toLowerCase();

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential required.' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured on the server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ success: false, message: 'Unverified Google email.' });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (requestedRole === 'admin') {
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin Google login is only allowed for an existing admin account in the database.',
        });
      }
    } else if (!user) {
      const generatedName = payload.name || payload.given_name || 'New User';
      const generatedRoll = `GOOGLE-${Date.now().toString().slice(-6)}`;
      user = await User.create({
        name: generatedName,
        email,
        googleId: payload.sub,
        picture: payload.picture || '',
        authProvider: 'google',
        role: 'student',
        isProfileComplete: false,
        rollNumber: generatedRoll,
        branch: '',
        department: '',
      });
    }

    if (!canGoogleLoginAsRole(user, requestedRole)) {
      return res.status(403).json({
        success: false,
        message: 'This Google account is not allowed to sign in as an admin.',
      });
    }

    if (payload.sub && user.googleId !== payload.sub) {
      user.googleId = payload.sub;
    }

    if (payload.picture) {
      user.picture = payload.picture;
    }

    if (!user.name && payload.name) user.name = payload.name;
    user.authProvider = user.authProvider || 'google';
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);
    if (user.role === 'admin') {
      return res.json({ success: true, token, user: sanitizeUser(user) });
    }

    if (!user.isProfileComplete || !user.rollNumber || !user.branch) {
      return res.json({ success: true, token, user: sanitizeUser(user), needsProfile: true });
    }

    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Google authentication failed:', error.message);
    return res.status(401).json({ success: false, message: 'Google token verification failed.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return res.json(users.map((user) => sanitizeUser(user)));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load users.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.json(sanitizeUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load user.' });
  }
};

exports.updateUserByAdmin = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || '').trim().toLowerCase();
    const rollNumber = String(req.body.rollNumber || '').trim();
    const branch = String(req.body.branch || '').trim();
    const department = String(req.body.department || '').trim();
    const picture = String(req.body.picture || '').trim();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A name and valid email are required.' });
    }
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be student or admin.' });
    }
    if (String(req.user._id) === String(user._id) && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin role.' });
    }

    if (email !== user.email) {
      const duplicateEmail = await User.findOne({ email, _id: { $ne: user._id } });
      if (duplicateEmail) {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
    }

    if (rollNumber && rollNumber !== user.rollNumber) {
      const duplicateRollNumber = await User.findOne({ rollNumber, _id: { $ne: user._id } });
      if (duplicateRollNumber) {
        return res.status(409).json({ message: 'This roll number is already in use.' });
      }
    }

    if (user.role === 'admin' && role !== 'admin' && await User.countDocuments({ role: 'admin' }) <= 1) {
      return res.status(409).json({ message: 'The last admin account cannot be changed to a student.' });
    }

    if (password) {
      if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
        return res.status(400).json({ message: 'New passwords must be at least 12 characters and no more than 72 UTF-8 bytes.' });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    user.name = name;
    user.email = email;
    user.role = role;
    user.rollNumber = rollNumber;
    user.branch = branch;
    user.department = department || branch;
    user.picture = picture;
    user.isProfileComplete = role === 'admin' || Boolean(name && email && rollNumber && (branch || department));

    await user.save();
    return res.json({ message: 'User updated.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update user.' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;
    const profile = normalizeProfileInput(req.body);

    if (String(requester._id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only edit your own profile.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!profile.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      return res.status(400).json({ message: 'A name and valid email are required.' });
    }

    if (profile.email && profile.email !== user.email) {
      const duplicateEmail = await User.findOne({ email: profile.email, _id: { $ne: user._id } });
      if (duplicateEmail) {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
    }

    if (profile.rollNumber && profile.rollNumber !== user.rollNumber) {
      const duplicateRoll = await User.findOne({ rollNumber: profile.rollNumber, _id: { $ne: user._id } });
      if (duplicateRoll) {
        return res.status(409).json({ message: 'This roll number belongs to another user.' });
      }
    }

    if (profile.email !== user.email && user.googleId) {
      return res.status(400).json({ message: 'Google-linked account email must be changed through Google account settings.' });
    }

    user.name = profile.name;
    user.email = profile.email;
    user.rollNumber = profile.rollNumber;
    user.branch = profile.branch;
    user.department = profile.department || profile.branch;
    user.picture = profile.picture;
    user.isProfileComplete = user.role === 'admin' || !!(user.name && user.email && user.rollNumber && (user.branch || user.department));

    await user.save();
    return res.json({ message: 'Profile updated.', user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update user.', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin account cannot be deleted.' });
    }
    await user.deleteOne();
    return res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete user.', error: error.message });
  }
};
