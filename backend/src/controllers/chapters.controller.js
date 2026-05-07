const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getChapterEffectivePlan, getSubSectionEffectivePlan } = require('../lib/effectivePlan');

/**
 * GET /api/chapters/:id
 * Get chapters for a subsection with effective plan levels
 */
const getChapters = asyncHandler(async (req, res) => {
  const subSectionId = parseInt(req.params.id);

  if (isNaN(subSectionId)) {
    return res.status(400).json({
      data: null,
      message: null,
      error: 'Invalid subsection ID',
    });
  }

  const userLevel = req.user.plan.level;

  const subSection = await prisma.subSection.findUnique({
    where: { id: subSectionId },
    include: { section: true },
  });

  if (!subSection) {
    return res.status(404).json({
      data: null,
      message: null,
      error: 'SubSection not found',
    });
  }

  const section = subSection.section;

  // Check section-level access
  if (userLevel < section.requiredPlanLevel) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: section.requiredPlanLevel,
    });
  }

  // Check subsection-level access
  const subSectionEffective = getSubSectionEffectivePlan(subSection, section);

  if (userLevel < subSectionEffective) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: subSectionEffective,
    });
  }

  const chapters = await prisma.chapter.findMany({
    where: { subSectionId },
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { questions: true } },
    },
  });

  // Get user attempts for questions in these chapters
  const userAttempts = await prisma.attempt.findMany({
    where: {
      userId: req.user.id,
      question: { chapter: { subSectionId } },
    },
    select: {
      isCorrect: true,
      question: { select: { chapterId: true } },
    },
  });

  const statsByChapter = {};
  for (const attempt of userAttempts) {
    const chapterId = attempt.question.chapterId;
    if (!statsByChapter[chapterId]) {
      statsByChapter[chapterId] = { answered: 0, correct: 0 };
    }
    statsByChapter[chapterId].answered++;
    if (attempt.isCorrect) statsByChapter[chapterId].correct++;
  }

  const result = chapters.map((chapter) => {
    const effectivePlan = getChapterEffectivePlan(chapter, subSection, section);
    const chapterLocked = userLevel < effectivePlan;

    if (chapterLocked) {
      return {
        id: chapter.id,
        locked: true,
        requiredPlanLevel: effectivePlan,
      };
    }

    const stats = statsByChapter[chapter.id] || { answered: 0, correct: 0 };

    return {
      id: chapter.id,
      name: chapter.name,
      order: chapter.order,
      subSectionId: chapter.subSectionId,
      requiredPlanLevel: effectivePlan,
      locked: false,
      totalQuestions: chapter._count.questions,
      userStats: stats,
    };
  });

  return res.json({ data: result, message: null, error: null });
});

/**
 * GET /api/chapters/:id/questions
 * Get questions for a specific chapter
 */
const getChapterQuestions = asyncHandler(async (req, res) => {
  const chapterId = parseInt(req.params.id);

  if (isNaN(chapterId)) {
    return res.status(400).json({
      data: null,
      message: null,
      error: 'Invalid chapter ID',
    });
  }

  const userLevel = req.user.plan.level;

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      subSection: { include: { section: true } },
    },
  });

  if (!chapter) {
    return res.status(404).json({
      data: null,
      message: null,
      error: 'Chapter not found',
    });
  }

  const subSection = chapter.subSection;
  const section = subSection.section;

  // Calculate effective plan level for this chapter
  const effectivePlan = getChapterEffectivePlan(chapter, subSection, section);

  if (userLevel < effectivePlan) {
    return res.status(403).json({
      data: null,
      message: null,
      error: 'Access denied',
      locked: true,
      requiredPlanLevel: effectivePlan,
    });
  }

  const questions = await prisma.question.findMany({
    where: { chapterId },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      text: true,
      imageUrl: true,
      requiredPlanLevel: true,
      choices: {
        where: { text: { not: '' } },
        select: {
          id: true,
          text: true,
        },
      },
    },
  });

  // Calculate effective plan for each question
  const result = questions.map((q) => {
    const questionEffective = Math.max(q.requiredPlanLevel, effectivePlan);

    if (userLevel < questionEffective) {
      return {
        id: q.id,
        locked: true,
        requiredPlanLevel: questionEffective,
      };
    }
    return {
      ...q,
      requiredPlanLevel: questionEffective,
    };
  });

  return res.json({ data: result, message: null, error: null });
});

module.exports = {
  getChapters,
  getChapterQuestions,
};
