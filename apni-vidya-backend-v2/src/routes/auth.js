const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { signupSchema, loginSchema, changePasswordSchema, forgotSchema, resetSchema } = require('../schemas/auth');

router.post('/signup', validate(signupSchema), auth.signup);
router.post('/login', validate(loginSchema), auth.login);
router.post('/forgot', validate(forgotSchema), auth.forgotPassword);
router.post('/reset', validate(resetSchema), auth.resetPassword);
router.get('/me', authenticate, auth.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), auth.changePassword);

module.exports = router;
