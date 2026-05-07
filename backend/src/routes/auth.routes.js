const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const { register, login, refresh, logout } = require('../controllers/auth.controller')
const authMiddleware = require('../middleware/auth.middleware')

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({ data: null, message: null, error: 'Too many login attempts, please try again later' })
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).json({ data: null, message: null, error: 'Too many registration attempts, please try again later' })
  },
})

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({ data: null, message: null, error: 'Too many token refresh attempts, please try again later' })
  },
})

const router = Router()

router.post('/register', registerLimiter, register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refreshLimiter, refresh)
router.post('/logout', authMiddleware, logout)

module.exports = router
