const { Router } = require('express')
const { getSections, getSubSections } = require('../controllers/sections.controller')
const authMiddleware = require('../middleware/auth.middleware')

const router = Router()

router.get('/', authMiddleware, getSections)
router.get('/:id/subsections', authMiddleware, getSubSections)

module.exports = router
