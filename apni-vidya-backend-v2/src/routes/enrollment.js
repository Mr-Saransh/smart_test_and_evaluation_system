const express = require('express');
const router = express.Router();
const enrollment = require('../controllers/enrollment');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { enrollmentSchema } = require('../schemas/misc');

// Public: student/parent submits enrollment form after scanning QR
router.post('/request/:slug', validate(enrollmentSchema), enrollment.submitRequest);

// Protected: institute views and manages enrollment requests
router.get(
  '/requests/:institute_id',
  authenticate,
  authorize('institute_admin', 'teacher'),
  enrollment.listRequests
);

router.post(
  '/approve/:request_id',
  authenticate,
  authorize('institute_admin', 'teacher'),
  enrollment.approveRequest
);

router.post(
  '/reject/:request_id',
  authenticate,
  authorize('institute_admin', 'teacher'),
  enrollment.rejectRequest
);

module.exports = router;
