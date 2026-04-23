const { Router } = require('express')
const authMiddleware = require('../middleware/auth.middleware')
const { getUserStats, getSubSectionStats } = require('../controllers/stats.controller')

const router = Router()

router.get('/me/stats', authMiddleware, getUserStats)
router.get('/me/stats/:subSectionId', authMiddleware, getSubSectionStats)

module.exports = router
