const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')
const {
  getSubSectionEffectivePlan,
  getChapterEffectivePlan,
} = require('../lib/effectivePlan')

/**
 * GET /api/sections
 * Get all sections with subsection summaries (no chapter details for performance)
 */
const getSections = asyncHandler(async (req, res) => {
  const userLevel = req.user.plan.level

  const sections = await prisma.section.findMany({
    orderBy: { order: 'asc' },
    include: {
      subSections: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { chapters: true } },
        },
      },
    },
  })

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
        const subEffective = getSubSectionEffectivePlan(sub, section)
        const subLocked = userLevel < subEffective

        if (subLocked) {
          return {
            id: sub.id,
            locked: true,
            requiredPlanLevel: subEffective,
          }
        }

        return {
          id: sub.id,
          name: sub.name,
          order: sub.order,
          requiredPlanLevel: subEffective,
          locked: false,
          totalChapters: sub._count.chapters,
        }
      }),
    }
  })

  return res.json({ data: result, message: null, error: null })
})

/**
 * GET /api/sections/:id/subsections
 * Get subsections for a section with chapter summaries
 */
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
      chapters: {
        orderBy: { order: 'asc' },
        include: {
          _count: { select: { questions: true } },
        },
      },
    },
  })

  // Get user attempts for questions in these subsections
  const userAttempts = await prisma.attempt.findMany({
    where: {
      userId: req.user.id,
      question: { chapter: { subSectionId: { in: subSections.map((s) => s.id) } } },
    },
    select: {
      isCorrect: true,
      question: { select: { chapterId: true } },
    },
  })

  const statsByChapter = {}
  for (const attempt of userAttempts) {
    const chapterId = attempt.question.chapterId
    if (!statsByChapter[chapterId]) {
      statsByChapter[chapterId] = { answered: 0, correct: 0 }
    }
    statsByChapter[chapterId].answered++
    if (attempt.isCorrect) statsByChapter[chapterId].correct++
  }

  const result = subSections.map((sub) => {
    const subEffective = getSubSectionEffectivePlan(sub, section)
    const subLocked = userLevel < subEffective

    if (subLocked) {
      return {
        id: sub.id,
        locked: true,
        requiredPlanLevel: subEffective,
      }
    }

    const chapters = sub.chapters.map((chapter) => {
      const chapterEffective = getChapterEffectivePlan(chapter, sub, section)
      const chapterLocked = userLevel < chapterEffective

      if (chapterLocked) {
        return {
          id: chapter.id,
          locked: true,
          requiredPlanLevel: chapterEffective,
        }
      }

      const stats = statsByChapter[chapter.id] || { answered: 0, correct: 0 }

      return {
        id: chapter.id,
        name: chapter.name,
        order: chapter.order,
        subSectionId: chapter.subSectionId,
        requiredPlanLevel: chapterEffective,
        locked: false,
        totalQuestions: chapter._count.questions,
        userStats: stats,
      }
    })

    return {
      id: sub.id,
      name: sub.name,
      order: sub.order,
      sectionId: sub.sectionId,
      requiredPlanLevel: subEffective,
      locked: false,
      totalChapters: sub.chapters.length,
      chapters,
    }
  })

  return res.json({ data: result, message: null, error: null })
})

module.exports = { getSections, getSubSections }
