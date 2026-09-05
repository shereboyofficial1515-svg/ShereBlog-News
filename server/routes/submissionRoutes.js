const express = require('express');
const submissionController = require('../controllers/submissionController');
const { createSubmissionRules } = require('../validators/submissionValidators');

const router = express.Router();

router.post('/', createSubmissionRules, submissionController.createSubmission);

module.exports = router;
