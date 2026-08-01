const express = require('express');
const router = express.Router();
const attendance = require('../controllers/attendance');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/mark', authenticate, authorize('institute_admin', 'teacher'), attendance.mark);
router.get('/sheet/:batch_id', authenticate, authorize('institute_admin', 'teacher'), attendance.sheet);
router.get('/summary/:batch_id', authenticate, authorize('institute_admin', 'teacher'), attendance.summary);
router.get('/student/:student_id', authenticate, attendance.studentSummary);

module.exports = router;
