const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')

const getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      planExpiresAt: true,
      plan: {
        select: { id: true, name: true, level: true },
      },
    },
  })

  return res.json({ data: user, message: null, error: null })
})

const getPlans = asyncHandler(async (req, res) => {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
    select: {
      id: true,
      name: true,
      level: true,
      price: true,
      currency: true,
    },
  })

  const plansWithContent = await Promise.all(
    plans.map(async (plan) => {
      const sections = await prisma.section.findMany({
        where: { requiredPlanLevel: { lte: plan.level } },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          subSections: {
            where: { requiredPlanLevel: { lte: plan.level } },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              chapters: {
                where: { requiredPlanLevel: { lte: plan.level } },
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  _count: { select: { questions: true } },
                },
              },
            },
          },
        },
      })

      const subSectionsCount = sections.reduce(
        (acc, s) => acc + s.subSections.length,
        0
      )

      const chaptersCount = sections.reduce(
        (acc, s) =>
          acc + s.subSections.reduce((a, sub) => a + sub.chapters.length, 0),
        0
      )

      const questionsCount = sections.reduce(
        (acc, s) =>
          acc +
          s.subSections.reduce(
            (a, sub) =>
              a + sub.chapters.reduce((b, ch) => b + ch._count.questions, 0),
            0
          ),
        0
      )

      const sectionsFormatted = sections.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        subSectionsCount: s.subSections.length,
        subSections: s.subSections.map((sub) => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
          chaptersCount: sub.chapters.length,
          chapters: sub.chapters.map((ch) => ({
            id: ch.id,
            name: ch.name,
            description: ch.description,
            questionsCount: ch._count.questions,
          })),
        })),
      }))

      return {
        ...plan,
        content: {
          sectionsCount: sections.length,
          subSectionsCount,
          chaptersCount,
          questionsCount,
          sections: sectionsFormatted,
        },
      }
    })
  )

  return res.json({ data: plansWithContent, message: null, error: null })
})

const activateCode = asyncHandler(async (req, res) => {
  const { code } = req.body
  const userId = req.user.id

  if (!code) {
    return res.status(400).json({ data: null, message: null, error: 'code is required' })
  }

  const activation = await prisma.activationCode.findUnique({ where: { code } })

  if (!activation) {
    return res.status(404).json({ data: null, message: null, error: 'Invalid code' })
  }

  if (activation.isUsed) {
    return res.status(400).json({ data: null, message: null, error: 'Code already used' })
  }

  if (activation.expiresAt && activation.expiresAt < new Date()) {
    return res.status(400).json({ data: null, message: null, error: 'Code has expired' })
  }

  const plan = await prisma.plan.findFirst({ where: { level: activation.planLevel } })

  if (!plan) {
    return res.status(400).json({ data: null, message: null, error: 'Plan not found for this code' })
  }

  const endDate = new Date()
  endDate.setDate(endDate.getDate() + activation.durationDays)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.activationCode.updateMany({
        where: { id: activation.id, isUsed: false },
        data: { isUsed: true, usedByUserId: userId, usedAt: new Date() },
      })

      if (claim.count === 0) {
        throw new Error('CODE_ALREADY_CLAIMED')
      }

      const subscription = await tx.subscription.create({
        data: { userId, planLevel: activation.planLevel, endDate, activationCodeId: activation.id },
      })

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { planId: plan.id, planExpiresAt: endDate },
        select: {
          id: true,
          email: true,
          name: true,
          planExpiresAt: true,
          plan: { select: { id: true, name: true, level: true } },
        },
      })

      return { subscription, user: updatedUser }
    })

    return res.json({
      data: result,
      message: 'Plan activated successfully',
      error: null,
    })
  } catch (err) {
    if (err.message === 'CODE_ALREADY_CLAIMED') {
      return res.status(400).json({ data: null, message: null, error: 'Code already used' })
    }
    throw err
  }
})

module.exports = { getMe, getPlans, activateCode }
