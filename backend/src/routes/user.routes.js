const { Router } = require('express')
const { getMe, getPlans, activateCode } = require('../controllers/user.controller')
const authMiddleware = require('../middleware/auth.middleware')
const rateLimit = require('express-rate-limit')

const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({ data: null, message: null, error: 'Too many requests, please try again later' })
  },
})

const router = Router()

router.get('/me', authMiddleware, getMe)
router.get('/plans', getPlans)
router.post('/activate', activateLimiter, authMiddleware, activateCode)

module.exports = router
