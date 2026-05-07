const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')

const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.id

  const attempts = await prisma.attempt.findMany({
    where: { userId },
    include: {
      question: {
        include: {
          chapter: {
            include: {
              subSection: {
                include: { section: true },
              },
            },
          },
        },
      },
    },
  })

  const total = attempts.length
  const correct = attempts.filter((a) => a.isCorrect).length
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100)

  const groupMap = {}

  for (const attempt of attempts) {
    const sub = attempt.question.chapter.subSection
    if (!groupMap[sub.id]) {
      groupMap[sub.id] = {
        id: sub.id,
        name: sub.name,
        sectionName: sub.section.name,
        total: 0,
        correct: 0,
        percentage: 0,
      }
    }
    groupMap[sub.id].total++
    if (attempt.isCorrect) groupMap[sub.id].correct++
  }

  const bySubSection = Object.values(groupMap).map((g) => ({
    ...g,
    percentage: g.total === 0 ? 0 : Math.round((g.correct / g.total) * 100),
  }))

  return res.json({
    data: { overall: { total, correct, percentage }, bySubSection },
    message: null,
    error: null,
  })
})

const getSubSectionStats = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const subSectionId = parseInt(req.params.subSectionId)

  if (isNaN(subSectionId)) {
    return res.status(400).json({ data: null, message: null, error: 'Invalid subSectionId' })
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      question: { chapter: { subSectionId } },
    },
    include: {
      question: true,
      selectedChoice: true,
    },
  })

  const total = attempts.length
  const correct = attempts.filter((a) => a.isCorrect).length
  const wrong = total - correct
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100)

  const attemptDetails = attempts.map((a) => ({
    questionText: a.question.text,
    selectedAnswer: a.selectedChoice.text,
    isCorrect: a.isCorrect,
    explanation: a.question.explanation,
  }))

  return res.json({
    data: { subSectionId, total, correct, wrong, percentage, attempts: attemptDetails },
    message: null,
    error: null,
  })
})

module.exports = { getUserStats, getSubSectionStats }
