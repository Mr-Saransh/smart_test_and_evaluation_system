const express = require('express');
const router = express.Router();
const announcement = require('../controllers/announcement');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin', 'teacher'), announcement.create);
router.get('/institute/:institute_id', authenticate, authorize('institute_admin', 'teacher'), announcement.listForInstitute);
router.get('/feed', authenticate, authorize('student', 'parent'), announcement.myFeed);

module.exports = router;
