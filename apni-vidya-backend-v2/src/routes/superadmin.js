const express = require('express');
const router = express.Router();
const superadmin = require('../controllers/superadmin');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('super_admin'));

router.get('/metrics', superadmin.dashboardMetrics);
router.get('/institutes', superadmin.listInstitutes);
router.put('/institutes/:id/status', superadmin.toggleInstitute);
router.put('/institutes/:id/subscription', superadmin.updateInstituteSubscription);
router.get('/users', superadmin.listUsers);

module.exports = router;
