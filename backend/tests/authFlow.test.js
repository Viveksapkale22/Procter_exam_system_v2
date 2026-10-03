const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { getAdminBootstrapConfig } = require('../config/db');
const {
  normalizeProfileInput,
  isProfileComplete,
  canGoogleLoginAsRole,
  completeProfile,
  getCurrentUser,
  updateUser,
  updateUserByAdmin,
} = require('../controllers/authController');

test('normalizeProfileInput trims and lowercases email and keeps profile fields', () => {
  const result = normalizeProfileInput({
    email: '  USER@EXAMPLE.COM ',
    name: '  Alice Smith  ',
    branch: '   CSE   ',
    rollNumber: '  2024-CS-12 ',
    role: 'student',
  });

  assert.equal(result.email, 'user@example.com');
  assert.equal(result.name, 'Alice Smith');
  assert.equal(result.branch, 'CSE');
  assert.equal(result.rollNumber, '2024-CS-12');
  assert.equal(result.role, 'student');
});

test('isProfileComplete requires email and core profile data for normal login', () => {
  assert.equal(isProfileComplete({ email: 'user@example.com', name: 'Alice', branch: 'CSE', rollNumber: '2024-CS-12' }), true);
  assert.equal(isProfileComplete({ email: 'user@example.com', name: 'Alice', branch: '', rollNumber: '2024-CS-12' }), false);
  assert.equal(isProfileComplete({ email: 'user@example.com', name: '', branch: 'CSE', rollNumber: '2024-CS-12' }), false);
});

test('Google login only allows admins if the account already has admin role', () => {
  assert.equal(canGoogleLoginAsRole({ role: 'admin' }, 'admin'), true);
  assert.equal(canGoogleLoginAsRole({ role: 'student' }, 'admin'), false);
  assert.equal(canGoogleLoginAsRole({ role: 'student' }, 'student'), true);
  assert.equal(canGoogleLoginAsRole(null, 'admin'), false);
});

test('admin bootstrap configuration requires a strong password and normalizes email', () => {
  assert.equal(getAdminBootstrapConfig({}), null);
  assert.deepEqual(getAdminBootstrapConfig({
    ADMIN_EMAIL: '  ADMIN@EXAMPLE.COM ',
    ADMIN_PASSWORD: 'long-enough-password',
  }), {
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'long-enough-password',
  });
  assert.throws(() => getAdminBootstrapConfig({ ADMIN_EMAIL: 'admin@example.com' }), /ADMIN_PASSWORD/);
  assert.throws(() => getAdminBootstrapConfig({
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'short',
  }), /at least 12 characters/);
});

test('public profile completion cannot promote a student to admin', async () => {
  const originalFindOne = User.findOne;
  const existingUser = {
    _id: 'user-1',
    name: 'Student',
    email: 'student@example.com',
    rollNumber: 'R1',
    branch: 'CSE',
    department: 'CSE',
    role: 'student',
    save: async () => {},
  };
  let responseBody;
  User.findOne = async () => existingUser;

  try {
    await completeProfile({
      body: {
        name: 'Student',
        email: 'student@example.com',
        rollNumber: 'R1',
        branch: 'CSE',
        role: 'admin',
      },
    }, {
      status: () => ({ json: (body) => { responseBody = body; } }),
      json: (body) => { responseBody = body; },
    });

    assert.equal(existingUser.role, 'student');
    assert.equal(responseBody.user.role, 'student');
  } finally {
    User.findOne = originalFindOne;
  }
});

test('admin user update changes profile and role while keeping password hashed', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const originalCountDocuments = User.countDocuments;
  const user = {
    _id: 'student-1',
    name: 'Old Name',
    email: 'old@example.com',
    role: 'student',
    rollNumber: 'R1',
    branch: 'CSE',
    department: 'CSE',
    password: '',
    save: async () => {},
  };
  let responseBody;
  let responseStatus = 200;
  User.findById = async () => user;
  User.findOne = async () => null;
  User.countDocuments = async () => 1;

  try {
    await updateUserByAdmin({
      params: { userId: 'student-1' },
      user: { _id: 'admin-1', role: 'admin' },
      body: {
        name: 'New Name',
        email: 'new@example.com',
        role: 'admin',
        rollNumber: 'ADMIN-1',
        branch: 'CSE',
        department: 'Computer Science',
        picture: 'https://example.com/avatar.png',
        password: 'new-password-at-least-12',
      },
    }, {
      status: (code) => {
        responseStatus = code;
        return { json: (body) => { responseBody = body; } };
      },
      json: (body) => { responseBody = body; },
    });

    assert.equal(responseStatus, 200);
    assert.equal(user.name, 'New Name');
    assert.equal(user.email, 'new@example.com');
    assert.equal(user.role, 'admin');
    assert.equal(user.department, 'Computer Science');
    assert.equal(await require('bcryptjs').compare('new-password-at-least-12', user.password), true);
    assert.equal(responseBody.user.password, undefined);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    User.countDocuments = originalCountDocuments;
  }
});

test('current profile fetch returns full safe profile without password', async () => {
  const originalFindById = User.findById;
  const profile = {
    _id: 'user-1',
    name: 'Google User',
    email: 'user@example.com',
    picture: 'https://example.com/photo.png',
    password: 'sensitive-hash',
    role: 'student',
    googleId: 'google-subject',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  let responseBody;
  User.findById = () => ({ select: async () => profile });

  try {
    await getCurrentUser({ user: { _id: 'user-1' } }, {
      status: () => ({ json: (body) => { responseBody = body; } }),
      json: (body) => { responseBody = body; },
    });

    assert.equal(responseBody.picture, profile.picture);
    assert.equal(responseBody.googleId, profile.googleId);
    assert.equal(responseBody.createdAt, profile.createdAt);
    assert.equal(responseBody.password, undefined);
  } finally {
    User.findById = originalFindById;
  }
});

test('self profile update cannot change role or linked Google identity', async () => {
  const originalFindById = User.findById;
  const originalFindOne = User.findOne;
  const user = {
    _id: 'user-1',
    name: 'Student',
    email: 'student@example.com',
    rollNumber: 'R1',
    branch: 'CSE',
    department: 'CSE',
    picture: '',
    role: 'student',
    googleId: 'trusted-google-id',
    authProvider: 'google',
    password: 'existing-password-hash',
    save: async () => {},
  };
  let responseBody;
  User.findById = async () => user;
  User.findOne = async () => null;

  try {
    await updateUser({
      params: { userId: 'user-1' },
      user: { _id: 'user-1', role: 'student' },
      body: {
        name: 'Updated Student',
        email: 'student@example.com',
        role: 'admin',
        picture: 'https://example.com/new-photo.png',
        googleId: 'untrusted-google-id',
        authProvider: 'local',
        password: 'should-not-change-password',
      },
    }, {
      status: () => ({ json: (body) => { responseBody = body; } }),
      json: (body) => { responseBody = body; },
    });

    assert.equal(user.name, 'Updated Student');
    assert.equal(user.picture, 'https://example.com/new-photo.png');
    assert.equal(user.role, 'student');
    assert.equal(user.googleId, 'trusted-google-id');
    assert.equal(user.authProvider, 'google');
    assert.equal(user.password, 'existing-password-hash');
    assert.equal(responseBody.user.password, undefined);
  } finally {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
  }
});
