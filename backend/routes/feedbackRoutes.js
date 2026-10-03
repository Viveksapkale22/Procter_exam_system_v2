const express = require('express');
const { createFeedback, getFeedback, markFeedbackRead } = require('../controllers/feedbackController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createFeedback);
router.get('/', protect, requireAdmin, getFeedback);
router.patch('/:feedbackId/read', protect, requireAdmin, markFeedbackRead);

module.exports = router;
