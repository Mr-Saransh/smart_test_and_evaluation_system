const express = require('express');
const router = express.Router();
const notification = require('../controllers/notification');
const { authenticate, authorize } = require('../middleware/auth');

// All dispatch + log endpoints are admin/teacher only.
router.post('/fee-reminders/:institute_id', authenticate, authorize('institute_admin', 'teacher'), notification.sendFeeReminders);
router.post('/planner-reminders/:institute_id', authenticate, authorize('institute_admin', 'teacher'), notification.sendPlannerReminders);
router.post('/send', authenticate, authorize('institute_admin', 'teacher'), notification.sendCustom);
router.get('/:institute_id', authenticate, authorize('institute_admin', 'teacher'), notification.list);

module.exports = router;
