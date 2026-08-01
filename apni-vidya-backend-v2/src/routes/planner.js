const express = require('express');
const router = express.Router();
const planner = require('../controllers/planner');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin', 'teacher'), planner.create);
router.get('/batch/:batch_id', authenticate, authorize('institute_admin', 'teacher'), planner.listForBatch);
router.get('/mine', authenticate, authorize('student'), planner.myTasks);
router.post('/:task_id/toggle', authenticate, authorize('student'), planner.toggle);
router.get('/reminders/:institute_id', authenticate, authorize('institute_admin', 'teacher'), planner.dueReminders);

module.exports = router;
