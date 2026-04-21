const prisma = require('../lib/prisma')
const asyncHandler = require('../utils/asyncHandler')

const submitAttempt = asyncHandler(async (req, res) => {
  const { questionId, selectedChoiceId } = req.body
  const userId = req.user.id

  if (!questionId || !selectedChoiceId) {
    return res.status(400).json({
      data: null,
      message: null,
      error: 'questionId and selectedChoiceId are required',
    })
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      choices: true,
    },
  })

  if (!question) {
    return res.status(404).json({ data: null, message: null, error: 'Question not found' })
  }

  if (req.user.plan.level < question.requiredPlanLevel) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: question.requiredPlanLevel,
    })
  }

  const selectedChoice = question.choices.find((c) => c.id === selectedChoiceId)

  if (!selectedChoice) {
    return res.status(400).json({ data: null, message: null, error: 'Invalid choice for this question' })
  }

  const correctChoice = question.choices.find((c) => c.isCorrect)
  const isCorrect = selectedChoice.isCorrect

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      questionId,
      selectedChoiceId,
      isCorrect,
    },
  })

  return res.status(201).json({
    data: {
      attemptId: attempt.id,
      isCorrect,
      explanation: question.explanation,
      correctChoice: {
        id: correctChoice.id,
        text: correctChoice.text,
      },
    },
    message: isCorrect ? 'Correct!' : 'Wrong answer',
    error: null,
  })
})

module.exports = { submitAttempt }
