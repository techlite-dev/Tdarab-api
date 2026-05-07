/**
 * Calculate effective plan level for an entity
 * Effective plan = max(entity's own plan, all ancestor plans)
 *
 * Hierarchy: Section -> SubSection -> Chapter -> Question
 */

/**
 * Get effective plan level for a Section
 * (Section has no parent, so it's just its own level)
 */
function getSectionEffectivePlan(section) {
  return section.requiredPlanLevel;
}

/**
 * Get effective plan level for a SubSection
 * max(subSection.planLevel, section.planLevel)
 */
function getSubSectionEffectivePlan(subSection, section) {
  return Math.max(
    subSection.requiredPlanLevel,
    section.requiredPlanLevel
  );
}

/**
 * Get effective plan level for a Chapter
 * max(chapter.planLevel, subSection.effective, section.effective)
 */
function getChapterEffectivePlan(chapter, subSection, section) {
  const subSectionEffective = getSubSectionEffectivePlan(subSection, section);
  return Math.max(
    chapter.requiredPlanLevel,
    subSectionEffective
  );
}

/**
 * Get effective plan level for a Question
 * max(question.planLevel, chapter.effective, subSection.effective, section.effective)
 */
function getQuestionEffectivePlan(question, chapter, subSection, section) {
  const chapterEffective = getChapterEffectivePlan(chapter, subSection, section);
  return Math.max(
    question.requiredPlanLevel,
    chapterEffective
  );
}

module.exports = {
  getSectionEffectivePlan,
  getSubSectionEffectivePlan,
  getChapterEffectivePlan,
  getQuestionEffectivePlan,
};
