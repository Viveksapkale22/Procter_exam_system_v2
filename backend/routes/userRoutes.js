const express = require('express');
const { getUsers, getCurrentUser, getUserById, updateUser, updateUserByAdmin, deleteUser } = require('../controllers/authController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, requireAdmin, getUsers);
router.get('/me', protect, getCurrentUser);
router.get('/:userId', protect, requireAdmin, getUserById);
router.patch('/:userId', protect, requireAdmin, updateUserByAdmin);
router.put('/:userId', protect, updateUser);
router.delete('/:userId', protect, requireAdmin, deleteUser);

module.exports = router;
