const express = require('express');
const router = express.Router();
const institute = require('../controllers/institute');
const { authenticate, authorize } = require('../middleware/auth');

// Public: get institute info by enrollment slug (for QR scan landing page)
router.get('/enroll/:slug', institute.getBySlug);

// Protected: institute admin routes
router.post('/', authenticate, authorize('institute_admin'), institute.create);
router.get('/mine', authenticate, authorize('institute_admin', 'teacher', 'student', 'parent'), institute.getMyInstitute);
router.get('/:id/billing-summary', authenticate, authorize('institute_admin'), institute.getBillingSummary);
router.post('/:id/subscription/order', authenticate, authorize('institute_admin'), institute.createSubscriptionOrder);
router.post('/:id/subscription/verify', authenticate, authorize('institute_admin'), institute.verifySubscription);
router.put('/:id', authenticate, authorize('institute_admin'), institute.update);
router.post('/:id/regenerate-qr', authenticate, authorize('institute_admin'), institute.regenerateQR);

module.exports = router;
