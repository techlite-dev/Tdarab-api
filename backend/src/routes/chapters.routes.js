const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { getChapters, getChapterQuestions } = require('../controllers/chapters.controller');

// Get chapters for a subsection
router.get('/subsection/:id', authMiddleware, getChapters);

// Get questions for a chapter
router.get('/:id/questions', authMiddleware, getChapterQuestions);

module.exports = router;
