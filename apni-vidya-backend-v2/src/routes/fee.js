const express = require('express');
const router = express.Router();
const fee = require('../controllers/fee');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { feePaymentSchema } = require('../schemas/misc');

router.post('/structures', authenticate, authorize('institute_admin'), fee.createStructure);
router.get('/structures/:institute_id', authenticate, authorize('institute_admin', 'teacher'), fee.listStructures);
router.get('/all/:institute_id', authenticate, authorize('institute_admin', 'teacher'), fee.listAllRecords);
router.get('/mine', authenticate, authorize('student', 'parent'), fee.listStudentFees);
router.get('/records/:structure_id', authenticate, authorize('institute_admin', 'teacher'), fee.listRecords);
router.post('/records/:record_id/pay', authenticate, authorize('institute_admin', 'teacher'), validate(feePaymentSchema), fee.recordPayment);
router.get('/reminders/:institute_id', authenticate, authorize('institute_admin', 'teacher'), fee.dueReminders);

module.exports = router;
