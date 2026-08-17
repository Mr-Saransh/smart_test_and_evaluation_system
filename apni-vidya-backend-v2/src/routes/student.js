const express = require('express');
const router = express.Router();
const student = require('../controllers/student');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin'), student.create);
router.post('/bulk-admit', authenticate, authorize('institute_admin'), student.bulkAdmit);
router.get('/me', authenticate, authorize('student'), student.getMyProfile);
router.put('/me', authenticate, authorize('student'), student.profileSetup);
router.post('/profile-setup', authenticate, authorize('student'), student.profileSetup);
router.get('/profile-status/:institute_id', authenticate, authorize('institute_admin'), student.profileStatus);
router.get('/:institute_id', authenticate, authorize('institute_admin', 'teacher'), student.list);
router.put('/:id', authenticate, authorize('institute_admin'), student.update);
router.delete('/:id', authenticate, authorize('institute_admin'), student.remove);

module.exports = router;
