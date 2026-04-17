const prisma = require('../lib/prisma')
const { verifyAccessToken } = require('../utils/jwt.util')

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, message: null, error: 'Unauthorized' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        planId: true,
        planExpiresAt: true,
        plan: {
          select: { id: true, name: true, level: true },
        },
      },
    })

    if (!user) {
      return res.status(401).json({ data: null, message: null, error: 'Unauthorized' })
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ data: null, message: null, error: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
