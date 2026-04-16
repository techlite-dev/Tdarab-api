const cron = require('node-cron')
const prisma = require('../lib/prisma')

const downgradeExpiredPlans = async () => {
  const result = await prisma.user.updateMany({
    where: {
      planExpiresAt: { lt: new Date() },
      planId: { not: 1 },
    },
    data: {
      planId: 1,
      planExpiresAt: null,
    },
  })

  if (result.count > 0) {
    console.log(`[cron] Downgraded ${result.count} expired user(s) to free plan`)
  }
}

const cleanupExpiredTokens = async () => {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  if (result.count > 0) {
    console.log(`[cron] Deleted ${result.count} expired refresh token(s)`)
  }
}

cron.schedule('0 0 * * *', async () => {
  await downgradeExpiredPlans()
  await cleanupExpiredTokens()
}, {
  timezone: 'Asia/Damascus',
})

module.exports = { downgradeExpiredPlans, cleanupExpiredTokens }
