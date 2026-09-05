const express = require('express');
const commentController = require('../controllers/commentController');
const { createCommentRules, listPublicCommentsRules } = require('../validators/commentValidators');

const router = express.Router();

router.post('/', createCommentRules, commentController.createComment);
router.get('/', listPublicCommentsRules, commentController.listPublicComments);

module.exports = router;