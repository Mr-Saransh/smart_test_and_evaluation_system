const express = require('express');
const router = express.Router();
const batch = require('../controllers/batch');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin'), batch.create);
router.get('/:institute_id', authenticate, batch.list);
router.put('/:id', authenticate, authorize('institute_admin'), batch.update);

module.exports = router;
