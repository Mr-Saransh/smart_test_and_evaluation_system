const express = require('express');
const router = express.Router();
const course = require('../controllers/course');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('institute_admin'), course.create);
router.get('/:institute_id', authenticate, course.list);
router.put('/:id', authenticate, authorize('institute_admin'), course.update);

module.exports = router;
