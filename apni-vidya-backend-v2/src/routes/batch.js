const express = require('express');
const router = express.Router();
const batch = require('../controllers/batch');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin'), batch.create);
router.get('/all/:institute_id', authenticate, batch.listAll);
router.get('/details/:id', authenticate, batch.getDetails);
router.get('/:institute_id', authenticate, batch.list);
router.put('/:id', authenticate, authorize('institute_admin'), batch.update);
router.put('/:id/meet-link', authenticate, authorize('institute_admin', 'teacher'), batch.updateMeetLink);
router.delete('/:id', authenticate, authorize('institute_admin'), batch.remove);

router.post('/:id/subscription/order', authenticate, authorize('institute_admin'), batch.createSubscriptionOrder);
router.post('/:id/subscription/verify', authenticate, authorize('institute_admin'), batch.verifySubscription);

module.exports = router;
