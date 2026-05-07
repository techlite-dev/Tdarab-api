const prisma = require('../lib/prisma')
const bcrypt = require('bcrypt')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt.util')
const asyncHandler = require('../utils/asyncHandler')

const MAX_REFRESH_TOKENS_PER_USER = 5

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

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: refreshExpiresAt },
    })

    const existing = await tx.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (existing.length > MAX_REFRESH_TOKENS_PER_USER) {
      const idsToDelete = existing.slice(MAX_REFRESH_TOKENS_PER_USER).map((t) => t.id)
      await tx.refreshToken.deleteMany({ where: { id: { in: idsToDelete } } })
    }
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

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } })
      return res.status(401).json({ data: null, message: null, error: 'Refresh token expired' })
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

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })

  if (!stored || stored.userId !== req.user.id) {
    return res.status(403).json({ data: null, message: null, error: 'Token does not belong to this user' })
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })

  return res.json({ data: null, message: 'Logged out successfully', error: null })
})

module.exports = { register, login, refresh, logout }
