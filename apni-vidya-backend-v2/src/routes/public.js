const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboard');

// Public shareable student portfolio — no auth.
router.get('/portfolio/:token', dashboard.publicPortfolio);

module.exports = router;
