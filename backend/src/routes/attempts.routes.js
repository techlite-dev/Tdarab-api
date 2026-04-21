const { Router } = require('express')
const { submitAttempt } = require('../controllers/attempts.controller')
const authMiddleware = require('../middleware/auth.middleware')

const router = Router()

router.post('/', authMiddleware, submitAttempt)

module.exports = router
