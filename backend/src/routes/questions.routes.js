const { Router } = require('express')
const { getQuestions } = require('../controllers/questions.controller')
const authMiddleware = require('../middleware/auth.middleware')

const router = Router()

router.get('/:id/questions', authMiddleware, getQuestions)

module.exports = router
