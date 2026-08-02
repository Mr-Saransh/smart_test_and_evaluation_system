const express = require('express');
const router = express.Router();
const test = require('../controllers/test');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin', 'teacher'), test.create);
router.get('/student/mine', authenticate, authorize('student'), test.listForStudent);
router.get('/:test_id/attempts', authenticate, authorize('student'), test.attempts);
router.get('/student/:test_id', authenticate, authorize('student', 'institute_admin', 'teacher'), test.getForStudent);
router.get('/batch/:batch_id', authenticate, test.list);
router.post('/:test_id/submit', authenticate, authorize('student'), test.submit);
router.get('/:test_id/results', authenticate, authorize('institute_admin', 'teacher'), test.results);
router.get('/:test_id/result-detail', authenticate, authorize('student', 'institute_admin', 'teacher', 'parent'), test.resultDetail);
router.get('/:test_id/analysis', authenticate, authorize('institute_admin', 'teacher'), test.analysis);
router.put('/submissions/:submission_id/grade', authenticate, authorize('institute_admin', 'teacher'), test.gradeSubjective);

module.exports = router;
