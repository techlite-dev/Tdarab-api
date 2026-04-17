const prisma = require('../lib/prisma')
const bcrypt = require('bcrypt')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.util')
const asyncHandler = require('../utils/asyncHandler')

const register = asyncHandler(async (req, res) => {
  const { email, name, password } = req.body

  if (!email || !name || !password) {
    return res.status(400).json({ data: null, message: null, error: 'email, name, and password are required' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ data: null, message: null, error: 'Email already in use' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, name, passwordHash, planId: 1 },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      plan: { select: { id: true, name: true, level: true } },
    },
  })

  return res.status(201).json({ data: user, message: 'Registration successful', error: null })
})

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ data: null, message: null, error: 'email and password are required' })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      planExpiresAt: true,
      plan: { select: { id: true, name: true, level: true } },
    },
  })

  if (!user) {
    return res.status(401).json({ data: null, message: null, error: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ data: null, message: null, error: 'Invalid credentials' })
  }

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)

  const refreshExpiresAt = new Date()
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30)

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt },
  })

  return res.json({
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
      },
    },
    message: 'Login successful',
    error: null,
  })
  // passwordHash is intentionally excluded from the response above
})

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ data: null, message: null, error: 'refreshToken is required' })
  }

  try {
    const payload = verifyRefreshToken(refreshToken)

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
    if (!stored) {
      return res.status(401).json({ data: null, message: null, error: 'Invalid refresh token' })
    }

    const accessToken = signAccessToken(payload.userId)

    return res.json({ data: { accessToken }, message: 'Token refreshed', error: null })
  } catch (err) {
    return res.status(401).json({ data: null, message: null, error: 'Invalid or expired refresh token' })
  }
})

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({ data: null, message: null, error: 'refreshToken is required' })
  }

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })

  return res.json({ data: null, message: 'Logged out successfully', error: null })
})

module.exports = { register, login, refresh, logout }
