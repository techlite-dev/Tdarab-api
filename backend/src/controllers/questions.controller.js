const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')

const getQuestions = asyncHandler(async (req, res) => {
  const subSectionId = parseInt(req.params.id)

  if (isNaN(subSectionId)) {
    return res.status(400).json({ data: null, message: null, error: 'Invalid subsection ID' })
  }

  const userLevel = req.user.plan.level

  const subSection = await prisma.subSection.findUnique({ where: { id: subSectionId } })

  if (!subSection) {
    return res.status(404).json({ data: null, message: null, error: 'SubSection not found' })
  }

  if (userLevel < subSection.requiredPlanLevel) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: subSection.requiredPlanLevel,
    })
  }

  const questions = await prisma.question.findMany({
    where: { subSectionId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      text: true,
      imageUrl: true,
      requiredPlanLevel: true,
      choices: {
        select: {
          id: true,
          text: true,
        },
      },
    },
  })

  const result = questions.map((q) => {
    if (userLevel < q.requiredPlanLevel) {
      return { id: q.id, locked: true, requiredPlanLevel: q.requiredPlanLevel }
    }
    return q
  })

  return res.json({ data: result, message: null, error: null })
})

module.exports = { getQuestions }
