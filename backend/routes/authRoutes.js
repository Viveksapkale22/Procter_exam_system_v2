const express = require('express');
const { register, login, googleLogin, completeProfile } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/complete-profile', completeProfile);

module.exports = router;
