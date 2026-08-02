const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboard');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/student', authenticate, authorize('student'), dashboard.studentDashboard);
router.get('/parent', authenticate, authorize('parent'), dashboard.parentDashboard);
router.get('/report/student/:student_id', authenticate, authorize('institute_admin', 'teacher'), dashboard.studentReport);
router.get('/report/batch/:batch_id', authenticate, authorize('institute_admin', 'teacher'), dashboard.batchReport);
router.post('/portfolio/:student_id/enable', authenticate, dashboard.enablePortfolio);
router.get('/report/weekly/:institute_id', authenticate, authorize('institute_admin', 'teacher'), dashboard.weeklyReport);

module.exports = router;
