const express = require('express');
const router = express.Router();
const teacher = require('../controllers/teacher');
const { authenticate, authorize, enforceTenant } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin'), teacher.create);
router.get('/:institute_id', authenticate, authorize('institute_admin', 'teacher'), teacher.list);
router.put('/:id', authenticate, authorize('institute_admin'), teacher.update);
router.delete('/:id', authenticate, authorize('institute_admin'), teacher.remove);

module.exports = router;
