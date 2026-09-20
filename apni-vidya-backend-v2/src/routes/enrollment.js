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

// Route aliases to support /enrollment/request/:id/approve and /enrollment/request/:id/reject
router.post(
  '/request/:request_id/approve',
  authenticate,
  authorize('institute_admin', 'teacher'),
  enrollment.approveRequest
);

router.post(
  '/request/:request_id/reject',
  authenticate,
  authorize('institute_admin', 'teacher'),
  enrollment.rejectRequest
);

router.post(
  '/request/:request_id/:action',
  authenticate,
  authorize('institute_admin', 'teacher'),
  (req, res, next) => {
    if (req.params.action === 'approve') return enrollment.approveRequest(req, res, next);
    if (req.params.action === 'reject') return enrollment.rejectRequest(req, res, next);
    return res.status(400).json({ error: `Unknown action: ${req.params.action}` });
  }
);

module.exports = router;
