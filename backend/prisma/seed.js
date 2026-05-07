const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  // ── Plans ──────────────────────────────────────────────
  const freePlan = await prisma.plan.upsert({
    where: { level: 1 },
    update: {},
    create: { name: 'مجاني', level: 1, price: 0, currency: 'USD', isActive: true },
  })

  const paidPlan = await prisma.plan.upsert({
    where: { level: 2 },
    update: {},
    create: { name: 'خطة أولى', level: 2, price: 9.99, currency: 'USD', isActive: true },
  })

  console.log(`✓ Plans:`)
  console.log(`    [${freePlan.level}] ${freePlan.name} — $${freePlan.price}`)
  console.log(`    [${paidPlan.level}] ${paidPlan.name} — $${paidPlan.price}`)

  // ── Section 1 — السنة الأولى (level 1) ────────────────
  const section1 = await prisma.section.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'السنة الأولى', order: 1, requiredPlanLevel: 1 },
  })

  // SubSection 1.1 — التشريح (level 1)
  const sub1 = await prisma.subSection.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'التشريح', order: 1, sectionId: section1.id, requiredPlanLevel: 1 },
  })

  // SubSection 1.2 — الفسيولوجيا (level 2)
  const sub2 = await prisma.subSection.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'الفسيولوجيا', order: 2, sectionId: section1.id, requiredPlanLevel: 2 },
  })

  // ── Section 2 — السنة الثانية (level 2) ───────────────
  const section2 = await prisma.section.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'السنة الثانية', order: 2, requiredPlanLevel: 2 },
  })

  // SubSection 2.1 — الباثولوجيا (level 2)
  const sub3 = await prisma.subSection.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'الباثولوجيا', order: 1, sectionId: section2.id, requiredPlanLevel: 2 },
  })

  console.log(`✓ Sections & SubSections: 2 sections, 3 subsections`)

  // ── Chapters ───────────────────────────────────────────
  const ch1 = await prisma.chapter.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'الجهاز الهيكلي', order: 1, subSectionId: sub1.id, requiredPlanLevel: 1 },
  })

  const ch2 = await prisma.chapter.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'الجهاز الدوري', order: 1, subSectionId: sub2.id, requiredPlanLevel: 2 },
  })

  const ch3 = await prisma.chapter.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'الأمراض الشائعة', order: 1, subSectionId: sub3.id, requiredPlanLevel: 2 },
  })

  console.log(`✓ Chapters: 3 chapters`)

  // ── Questions ──────────────────────────────────────────
  const q1 = await prisma.question.upsert({
    where: { id: 1 },
    update: {},
    create: {
      text: 'كم عدد عظام جسم الإنسان البالغ؟',
      explanation: 'يحتوي جسم الإنسان البالغ على 206 عظمة.',
      chapterId: ch1.id,
      requiredPlanLevel: 1,
    },
  })

  await prisma.choice.createMany({
    skipDuplicates: true,
    data: [
      { id: 1, questionId: q1.id, text: '206', isCorrect: true },
      { id: 2, questionId: q1.id, text: '208', isCorrect: false },
      { id: 3, questionId: q1.id, text: '200', isCorrect: false },
      { id: 4, questionId: q1.id, text: '212', isCorrect: false },
    ],
  })

  const q2 = await prisma.question.upsert({
    where: { id: 2 },
    update: {},
    create: {
      text: 'ما هو أصغر عظمة في جسم الإنسان؟',
      explanation: 'الركابة (Stapes) في الأذن الوسطى هي أصغر عظمة في الجسم.',
      chapterId: ch1.id,
      requiredPlanLevel: 1,
    },
  })

  await prisma.choice.createMany({
    skipDuplicates: true,
    data: [
      { id: 5, questionId: q2.id, text: 'المطرقة', isCorrect: false },
      { id: 6, questionId: q2.id, text: 'الركابة', isCorrect: true },
      { id: 7, questionId: q2.id, text: 'السندان', isCorrect: false },
      { id: 8, questionId: q2.id, text: 'الترقوة', isCorrect: false },
    ],
  })

  const q3 = await prisma.question.upsert({
    where: { id: 3 },
    update: {},
    create: {
      text: 'ما هو الضغط الطبيعي للدم؟',
      explanation: 'الضغط الطبيعي هو 120/80 ملم زئبق.',
      chapterId: ch2.id,
      requiredPlanLevel: 2,
    },
  })

  await prisma.choice.createMany({
    skipDuplicates: true,
    data: [
      { id: 9,  questionId: q3.id, text: '120/80', isCorrect: true },
      { id: 10, questionId: q3.id, text: '140/90', isCorrect: false },
      { id: 11, questionId: q3.id, text: '100/60', isCorrect: false },
      { id: 12, questionId: q3.id, text: '160/100', isCorrect: false },
    ],
  })

  const q4 = await prisma.question.upsert({
    where: { id: 4 },
    update: {},
    create: {
      text: 'ما هو أكثر أنواع السرطان شيوعاً لدى الرجال؟',
      explanation: 'سرطان البروستاتا هو الأكثر شيوعاً لدى الرجال عالمياً.',
      chapterId: ch3.id,
      requiredPlanLevel: 2,
    },
  })

  await prisma.choice.createMany({
    skipDuplicates: true,
    data: [
      { id: 13, questionId: q4.id, text: 'سرطان الرئة', isCorrect: false },
      { id: 14, questionId: q4.id, text: 'سرطان البروستاتا', isCorrect: true },
      { id: 15, questionId: q4.id, text: 'سرطان القولون', isCorrect: false },
      { id: 16, questionId: q4.id, text: 'سرطان المعدة', isCorrect: false },
    ],
  })

  console.log(`✓ Questions & Choices: 4 questions, 16 choices`)

  // ── Test Users (dev-only — never use in production) ───
  const passwordHash = await bcrypt.hash('123456', 10)

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      planId: paidPlan.id,
      planExpiresAt: new Date('2030-01-01'),
    },
  })

  const freeUser = await prisma.user.upsert({
    where: { email: 'free@example.com' },
    update: {},
    create: {
      email: 'free@example.com',
      name: 'Free User',
      passwordHash,
      planId: freePlan.id,
    },
  })

  console.log(`✓ Test Users (dev-only — password: 123456):`)
  console.log(`    [${testUser.email}] — plan: ${paidPlan.name}`)
  console.log(`    [${freeUser.email}] — plan: ${freePlan.name}`)

  // ── Activation Codes ───────────────────────────────────
  const testCode = await prisma.activationCode.upsert({
    where: { code: 'TEST-CODE-2026' },
    update: {},
    create: { code: 'TEST-CODE-2026', planLevel: 2, durationDays: 30, isUsed: false, expiresAt: new Date('2030-01-01') },
  })

  const usedCode = await prisma.activationCode.upsert({
    where: { code: 'USED-CODE-2026' },
    update: {},
    create: { code: 'USED-CODE-2026', planLevel: 2, durationDays: 30, isUsed: true, usedByUserId: testUser.id, usedAt: new Date() },
  })

  const expiredCode = await prisma.activationCode.upsert({
    where: { code: 'EXPR-CODE-2026' },
    update: {},
    create: { code: 'EXPR-CODE-2026', planLevel: 2, durationDays: 30, isUsed: false, expiresAt: new Date('2020-01-01') },
  })

  console.log(`✓ Activation Codes:`)
  console.log(`    [${testCode.code}] — valid, unused`)
  console.log(`    [${usedCode.code}] — used`)
  console.log(`    [${expiredCode.code}] — expired`)

  // ── Sample Attempts ────────────────────────────────────
  const existingAttempts = await prisma.attempt.count({ where: { userId: testUser.id } })

  if (existingAttempts === 0) {
    await prisma.attempt.createMany({
      data: [
        { userId: testUser.id, questionId: q1.id, selectedChoiceId: 1, isCorrect: true },
        { userId: testUser.id, questionId: q2.id, selectedChoiceId: 5, isCorrect: false },
        { userId: testUser.id, questionId: q2.id, selectedChoiceId: 6, isCorrect: true },
        { userId: testUser.id, questionId: q3.id, selectedChoiceId: 9, isCorrect: true },
        { userId: testUser.id, questionId: q3.id, selectedChoiceId: 10, isCorrect: false },
        { userId: testUser.id, questionId: q4.id, selectedChoiceId: 13, isCorrect: false },
      ],
    })
    console.log(`✓ Sample Attempts: 6 attempts`)
  } else {
    console.log(`✓ Sample Attempts: skipped (${existingAttempts} already exist)`)
  }

  console.log(``)
  console.log(`Seed complete ✓`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
