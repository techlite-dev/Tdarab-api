require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.routes')
const sectionsRoutes = require('./routes/sections.routes')
const questionsRoutes = require('./routes/questions.routes')
const attemptsRoutes = require('./routes/attempts.routes')
const userRoutes = require('./routes/user.routes')
const statsRoutes = require('./routes/stats.routes')
const errorHandler = require('./middleware/error.middleware')

require('./utils/cron')

const app = express()

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS === '*' || !process.env.ALLOWED_ORIGINS
    ? true
    : process.env.ALLOWED_ORIGINS.split(','),
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '10kb' }))

app.get('/health', (req, res) => {
  res.json({ data: { status: 'ok' }, message: 'Server is running' })
})

const docsEnabled = process.env.ENABLE_DOCS === 'true'

if (docsEnabled) {
  app.use('/docs', express.static(path.join(__dirname, '../../docs')))
  app.get('/', (req, res) => res.redirect('/docs'))
} else {
  app.get('/', (req, res) => {
    res.json({
      data: null,
      message: 'TDARAB API - This is a private API built exclusively for the TDARAB medical education platform. Unauthorized access is not permitted.',
      error: null,
    })
  })
}

app.use('/api/auth', authRoutes)
app.use('/api/sections', sectionsRoutes)
app.use('/api/subsections', questionsRoutes)
app.use('/api/attempts', attemptsRoutes)
app.use('/api', userRoutes)
app.use('/api', statsRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
