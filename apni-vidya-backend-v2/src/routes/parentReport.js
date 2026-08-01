const express = require('express');
const router = express.Router();
const pr = require('../controllers/parentReport');
const { authenticate, authorize } = require('../middleware/auth');

// Schedule management — admin only.
router.post('/jobs', authenticate, authorize('institute_admin'), pr.upsertJob);
router.get('/jobs/:institute_id', authenticate, authorize('institute_admin', 'teacher'), pr.listJobs);
router.patch('/jobs/:id', authenticate, authorize('institute_admin'), pr.setActive);
router.delete('/jobs/:id', authenticate, authorize('institute_admin'), pr.removeJob);

// Ad-hoc send.
router.post('/run-now/:institute_id', authenticate, authorize('institute_admin', 'teacher'), pr.runNow);

// Cron entrypoint. Accepts either an institute_admin session OR a valid
// X-Cron-Secret header. We still run `authenticate` so req.user is populated
// when present, but the controller resolves the auth choice.
const optionalAuth = (req, res, next) => {
  // If the caller sends a cron secret, skip JWT validation entirely so
  // schedulers don't need a token.
  if (req.headers['x-cron-secret']) return next();
  return authenticate(req, res, next);
};
router.post('/tick', optionalAuth, pr.tick);

module.exports = router;
