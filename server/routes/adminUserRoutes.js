const express = require('express');
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createUserRules, updateUserRules, resetPasswordRules } = require('../validators/userValidators');

const router = express.Router();

const MANAGE_ROLES = ['admin', 'super_admin'];

router.get('/', requireAuth, requireRole(...MANAGE_ROLES), userController.listUsers);
router.post('/', requireAuth, requireRole(...MANAGE_ROLES), createUserRules, userController.createUser);
router.put('/:id', requireAuth, requireRole(...MANAGE_ROLES), updateUserRules, userController.updateUser);
router.post('/:id/reset-password', requireAuth, requireRole(...MANAGE_ROLES), resetPasswordRules, userController.resetPassword);
router.delete('/:id', requireAuth, requireRole('super_admin'), userController.deleteUser);

module.exports = router;
