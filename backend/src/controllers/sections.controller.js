const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')

const getSections = asyncHandler(async (req, res) => {
  const userLevel = req.user.plan.level

  const sections = await prisma.section.findMany({
    orderBy: { order: 'asc' },
    include: {
      subSections: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { questions: true } },
        },
      },
    },
  })

  const userAttempts = await prisma.attempt.findMany({
    where: { userId: req.user.id },
    select: { questionId: true, isCorrect: true, question: { select: { subSectionId: true } } },
  })

  const statsBySubSection = {}
  for (const attempt of userAttempts) {
    const subId = attempt.question.subSectionId
    if (!statsBySubSection[subId]) {
      statsBySubSection[subId] = { answered: 0, correct: 0 }
    }
    statsBySubSection[subId].answered++
    if (attempt.isCorrect) statsBySubSection[subId].correct++
  }

  const result = sections.map((section) => {
    const sectionLocked = userLevel < section.requiredPlanLevel

    if (sectionLocked) {
      return {
        id: section.id,
        locked: true,
        requiredPlanLevel: section.requiredPlanLevel,
      }
    }

    return {
      id: section.id,
      name: section.name,
      order: section.order,
      requiredPlanLevel: section.requiredPlanLevel,
      locked: false,
      subSections: section.subSections.map((sub) => {
        const subLocked = userLevel < sub.requiredPlanLevel

        if (subLocked) {
          return {
            id: sub.id,
            locked: true,
            requiredPlanLevel: sub.requiredPlanLevel,
          }
        }

        const stats = statsBySubSection[sub.id] || { answered: 0, correct: 0 }

        return {
          id: sub.id,
          name: sub.name,
          order: sub.order,
          requiredPlanLevel: sub.requiredPlanLevel,
          locked: false,
          totalQuestions: sub._count.questions,
          userStats: stats,
        }
      }),
    }
  })

  return res.json({ data: result, message: null, error: null })
})

const getSubSections = asyncHandler(async (req, res) => {
  const sectionId = parseInt(req.params.id)

  if (isNaN(sectionId)) {
    return res.status(400).json({ data: null, message: null, error: 'Invalid section ID' })
  }

  const userLevel = req.user.plan.level

  const section = await prisma.section.findUnique({ where: { id: sectionId } })

  if (!section) {
    return res.status(404).json({ data: null, message: null, error: 'Section not found' })
  }

  if (userLevel < section.requiredPlanLevel) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: section.requiredPlanLevel,
    })
  }

  const subSections = await prisma.subSection.findMany({
    where: { sectionId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { questions: true } },
    },
  })

  const userAttempts = await prisma.attempt.findMany({
    where: {
      userId: req.user.id,
      question: { subSectionId: { in: subSections.map((s) => s.id) } },
    },
    select: { isCorrect: true, question: { select: { subSectionId: true } } },
  })

  const statsBySubSection = {}
  for (const attempt of userAttempts) {
    const subId = attempt.question.subSectionId
    if (!statsBySubSection[subId]) {
      statsBySubSection[subId] = { answered: 0, correct: 0 }
    }
    statsBySubSection[subId].answered++
    if (attempt.isCorrect) statsBySubSection[subId].correct++
  }

  const result = subSections.map((sub) => {
    const subLocked = userLevel < sub.requiredPlanLevel

    if (subLocked) {
      return {
        id: sub.id,
        locked: true,
        requiredPlanLevel: sub.requiredPlanLevel,
      }
    }

    const stats = statsBySubSection[sub.id] || { answered: 0, correct: 0 }

    return {
      id: sub.id,
      name: sub.name,
      order: sub.order,
      sectionId: sub.sectionId,
      requiredPlanLevel: sub.requiredPlanLevel,
      locked: false,
      totalQuestions: sub._count.questions,
      userStats: stats,
    }
  })

  return res.json({ data: result, message: null, error: null })
})

module.exports = { getSections, getSubSections }
