require('dotenv').config()
const express = require('express')
const prisma = require('./lib/prisma')
const cors = require('cors')
const path = require('path')

const authRoutes = require('./routes/auth.routes')
const sectionsRoutes = require('./routes/sections.routes')
const chaptersRoutes = require('./routes/chapters.routes')
const attemptsRoutes = require('./routes/attempts.routes')
const userRoutes = require('./routes/user.routes')
const statsRoutes = require('./routes/stats.routes')
const errorHandler = require('./middleware/error.middleware')

require('./utils/cron')

const app = express()

const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS) || 1
app.set('trust proxy', trustProxyHops)

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS === '*' || !process.env.ALLOWED_ORIGINS
    ? true
    : process.env.ALLOWED_ORIGINS.split(','),
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '10kb' }))

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ data: { status: 'ok', db: 'ok' }, message: 'Server is running', error: null })
  } catch (err) {
    res.status(503).json({ data: { status: 'ok', db: 'unreachable' }, message: null, error: 'Database unreachable' })
  }
})

app.get('/whoami', (req, res) => {
  const info = {
    ip: req.ip,
    ips: req.ips,
    xForwardedFor: req.headers['x-forwarded-for'] || null,
    cfConnectingIp: req.headers['cf-connecting-ip'] || null,
    trustProxyHops: Number(process.env.TRUST_PROXY_HOPS) || 1,
  }
  console.log(`[whoami] Connection from IP: ${req.ip} | X-Forwarded-For: ${info.xForwardedFor}`)
  res.json({ data: info, message: null, error: null })
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
app.use('/api/chapters', chaptersRoutes)
app.use('/api/attempts', attemptsRoutes)
app.use('/api', userRoutes)
app.use('/api', statsRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
