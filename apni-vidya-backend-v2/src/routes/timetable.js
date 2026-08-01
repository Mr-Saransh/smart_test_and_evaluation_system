const express = require('express');
const router = express.Router();
const timetable = require('../controllers/timetable');
const { authenticate, authorize } = require('../middleware/auth');

// Student/parent view of their own batch's week. Must be declared before '/:id'-style routes.
router.get('/me', authenticate, timetable.myTimetable);

// Teacher/admin manage slots.
router.post('/', authenticate, authorize('institute_admin', 'teacher'), timetable.create);
router.get('/batch/:batch_id', authenticate, timetable.listForBatch);
router.put('/:id', authenticate, authorize('institute_admin', 'teacher'), timetable.update);
router.delete('/:id', authenticate, authorize('institute_admin', 'teacher'), timetable.remove);

module.exports = router;
