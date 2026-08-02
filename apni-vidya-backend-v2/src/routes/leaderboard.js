const express = require('express');
const router = express.Router();
const leaderboard = require('../controllers/leaderboard');
const { authenticate } = require('../middleware/auth');

router.get('/:institute_id', authenticate, leaderboard.getInstituteLeaderboard);

module.exports = router;
