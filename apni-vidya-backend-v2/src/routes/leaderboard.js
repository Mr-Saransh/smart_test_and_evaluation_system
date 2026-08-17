const express = require('express');
const router = express.Router();
const leaderboard = require('../controllers/leaderboard');
const { authenticate, authorize } = require('../middleware/auth');

// New batch leaderboard for students
router.get('/mine', authenticate, authorize('student'), leaderboard.getMyLeaderboard);

// New batch leaderboard for teachers
router.get('/batch/:batch_id', authenticate, authorize('institute_admin', 'teacher'), leaderboard.getBatchLeaderboard);

// Existing institute leaderboard (kept as /:institute_id for compatibility with pages/shared/Leaderboard.jsx)
// Placed at the bottom to avoid matching /mine or /batch as an institute_id
router.get('/:institute_id', authenticate, authorize('institute_admin', 'teacher'), leaderboard.getInstituteLeaderboard);

module.exports = router;
