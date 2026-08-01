const express = require('express');
const router = express.Router();
const question = require('../controllers/question');
const { authenticate, authorize } = require('../middleware/auth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', authenticate, authorize('institute_admin', 'teacher'), question.create);
router.post('/bulk', authenticate, authorize('institute_admin', 'teacher'), question.bulkCreate);
router.post('/upload-pdf', authenticate, authorize('institute_admin', 'teacher'), upload.single('file'), question.uploadPdf);
router.post('/extract-text', authenticate, authorize('institute_admin', 'teacher'), question.extractText);
router.put('/:id', authenticate, authorize('institute_admin', 'teacher'), question.update);
router.get('/:institute_id', authenticate, authorize('institute_admin', 'teacher'), question.list);
router.get('/:institute_id/taxonomy', authenticate, authorize('institute_admin', 'teacher'), question.taxonomy);
router.delete('/:id', authenticate, authorize('institute_admin', 'teacher'), question.remove);

module.exports = router;
