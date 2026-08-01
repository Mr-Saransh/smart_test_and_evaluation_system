const express = require('express');
const router = express.Router();
const material = require('../controllers/material');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../services/storage');

router.post('/', authenticate, authorize('institute_admin', 'teacher'), upload.single('file'), material.create);
router.get('/institute/:institute_id', authenticate, authorize('institute_admin', 'teacher'), material.listForInstitute);
router.get('/batch/:batch_id', authenticate, authorize('institute_admin', 'teacher'), material.listForBatch);
router.get('/mine', authenticate, authorize('student'), material.mine);
router.delete('/:id', authenticate, authorize('institute_admin', 'teacher'), material.remove);

module.exports = router;
