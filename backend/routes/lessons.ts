import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize } from '../middleware/auth';
import * as MathService from '../services/mathService';
import { masteryService } from '../services/masteryService';

const router = Router();

const normalizeDifficulty = (difficulty: unknown): string | null => {
  const value = String(difficulty || "all").toLowerCase();
  if (["easy", "medium", "hard"].includes(value)) return value;
  return null;
};

const getAllowedSubjectIds = async (req: any): Promise<number[] | null> => {
  if (req.user?.role === "admin") return null;

  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: {
      role: {
        select: {
          subject_permissions: {
            select: { subject_id: true }
          }
        }
      }
    }
  });

  return user?.role.subject_permissions.map((permission) => permission.subject_id) ?? [];
};

const subjectWhere = (subjectIds: number[] | null) => {
  if (subjectIds === null) return {};
  return { subject_id: { in: subjectIds } };
};

const canAccessSubject = (subjectIds: number[] | null, subjectId: number) => {
  return subjectIds === null || subjectIds.includes(subjectId);
};

const requireAdminRole = (req: any, res: any) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
};

const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
};

const buildUniqueGradeSlug = async (title: string, subjectId: number) => {
  const baseSlug = slugify(title).replace(/^item$/, "grade");
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { slug: true }
  });

  if (!subject) return null;

  const candidates = [baseSlug, `${subject.slug}-${baseSlug}`];

  for (const candidate of candidates) {
    const existing = await prisma.grade.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }

  let suffix = 2;
  while (suffix < 1000) {
    const candidate = `${subject.slug}-${baseSlug}-${suffix}`;
    const existing = await prisma.grade.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }

  return `${subject.slug}-${baseSlug}-${Date.now()}`;
};

// Create a new lesson (Admin or Teacher can have 'manage' permission)
router.post('/', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const { title_en, title_vi, content_markdown_en, content_markdown_vi, grade_id, subject_id, order_index } = req.body;
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  if (!canAccessSubject(allowedSubjectIds, Number(subject_id))) {
    return res.status(403).json({ error: "You do not have access to this subject" });
  }

  const lesson = await prisma.lesson.create({
    data: {
      title_en,
      title_vi,
      content_markdown_en,
      content_markdown_vi,
      grade_id,
      subject_id,
      order_index,
      created_by: (req as any).user.id
    }
  });
  res.json(lesson);
});

// Get all lessons (With hierarchy metadata)
router.get('/', authenticate, async (req, res) => {
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  const lessons = await prisma.lesson.findMany({
    where: subjectWhere(allowedSubjectIds),
    orderBy: { order_index: 'asc' },
    include: {
      grade: true,
      subject: true
    }
  });
  res.json(lessons);
});

// Get all grades
router.get('/grades', authenticate, async (req, res) => {
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  const grades = await prisma.grade.findMany({
    where: allowedSubjectIds === null
      ? {}
      : { subject_id: { in: allowedSubjectIds } },
    include: { subject: true },
    orderBy: { id: 'asc' }
  });
  res.json(grades);
});

router.post('/grades', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  if (!requireAdminRole(req, res)) return;

  try {
    const titleEn = String(req.body.title_en || "").trim();
    const titleVi = String(req.body.title_vi || "").trim();
    const requestedSlug = String(req.body.slug || "").trim();
    const subjectId = Number(req.body.subject_id);

    if (!titleEn || !titleVi || !Number.isInteger(subjectId)) {
      return res.status(400).json({ error: "title_en, title_vi, and subject_id are required" });
    }

    const slug = requestedSlug ? slugify(requestedSlug) : await buildUniqueGradeSlug(titleEn, subjectId);
    if (!slug) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const grade = await prisma.grade.create({
      data: {
        slug,
        title_en: titleEn,
        title_vi: titleVi,
        subject_id: subjectId
      },
      include: { subject: true }
    });

    res.status(201).json(grade);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Grade slug already exists" });
    }
    res.status(500).json({ error: "Failed to create grade", details: error.message });
  }
});

// Get all subjects
router.get('/subjects', authenticate, async (req, res) => {
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  const subjects = await prisma.subject.findMany({
    where: allowedSubjectIds === null ? {} : { id: { in: allowedSubjectIds } },
    orderBy: { id: 'asc' }
  });
  res.json(subjects);
});

router.post('/subjects', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  if (!requireAdminRole(req, res)) return;

  try {
    const titleEn = String(req.body.title_en || "").trim();
    const titleVi = String(req.body.title_vi || "").trim();
    const requestedSlug = String(req.body.slug || "").trim();
    const color = typeof req.body.color === "string" ? req.body.color.trim() : undefined;

    if (!titleEn || !titleVi) {
      return res.status(400).json({ error: "title_en and title_vi are required" });
    }

    const subject = await prisma.subject.create({
      data: {
        slug: requestedSlug || slugify(titleEn),
        title_en: titleEn,
        title_vi: titleVi,
        color
      }
    });

    res.status(201).json(subject);
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Subject slug already exists" });
    }
    res.status(500).json({ error: "Failed to create subject", details: error.message });
  }
});

// Get Lessons that have practice questions available
router.get('/practice-available', authenticate, async (req, res) => {
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const lessons = await prisma.lesson.findMany({
      where: {
        ...subjectWhere(allowedSubjectIds),
        templates: {
          some: {} // At least one template
        }
      },
      include: {
        grade: true,
        subject: true,
        _count: {
          select: { templates: true }
        }
      },
      orderBy: { order_index: 'asc' }
    });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch practice-ready lessons" });
  }
});

// Start a Practice Session for a Lesson
router.post('/:id/practice', authenticate, async (req, res) => {
  const lesson_id = req.params.id as string;
  const userId = (req as any).user.id;
  const difficulty = normalizeDifficulty(req.body?.difficulty);

  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const lesson = await prisma.lesson.findUnique({
      where: { id: lesson_id },
      select: { subject_id: true }
    });

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!canAccessSubject(allowedSubjectIds, lesson.subject_id)) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    // 1. Fetch templates associated with this lesson
    const templates = await prisma.questionTemplate.findMany({
      where: {
        lesson_id,
        ...(difficulty ? { difficulty } : {})
      }
    });

    if (templates.length === 0) {
      return res.status(404).json({
        error: difficulty
          ? `No ${difficulty} templates found for this lesson to practice.`
          : "No templates found for this lesson to practice."
      });
    }

    // 2. Create a practice TestAttempt
    const attempt = await prisma.testAttempt.create({
      data: { 
        user_id: userId,
        lesson_id: lesson_id,
        is_practice: true
      }
    });

    // Generate question snapshots
    const questionsToCreate = [];
    const targetCount = Math.min(20, templates.length * 5);

    let templatePool = [];
    const repeatsPerTemplate = Math.ceil(targetCount / templates.length);

    for (let i = 0; i < repeatsPerTemplate; i++) {
      templatePool = templatePool.concat(templates);
    }

    for (let i = templatePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [templatePool[i], templatePool[j]] = [templatePool[j], templatePool[i]];
    }

    const selection = templatePool.slice(0, targetCount);

    for (const template of selection) {
      const isTheoretical = template.template_type === "theoretical_question";
      const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);

      const right_answers = isTheoretical
        ? template.accepted_formulas.slice(0, 1).filter(Boolean)
        : template.accepted_formulas
          .map(f => MathService.evaluateFormula(f, vars))
          .filter(ans => ans !== null);

      questionsToCreate.push({
        attempt_id: attempt.id,
        template_id: template.id,
        generated_variables: vars,
        right_answers: right_answers
      });
    }

    // Batch insert snapshots
    await prisma.questionSnapshot.createMany({
      data: questionsToCreate
    });

    // Fetch the attempt with snapshots to return
    const attemptWithQuestions = await prisma.testAttempt.findUnique({
      where: { id: attempt.id },
      include: { 
        snapshots: {
          include: { 
            template: {
              include: {
                lesson: {
                  include: { grade: true }
                }
              }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    res.json(attemptWithQuestions);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create practice session.", details: error.message });
  }
});

// Get single lesson by ID
router.get('/:id', authenticate, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        grade: true,
        subject: true
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    if (!canAccessSubject(allowedSubjectIds, lesson.subject_id)) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// Update a lesson
router.put('/:id', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const id = req.params.id as string;
  const { title_en, title_vi, content_markdown_en, content_markdown_vi, grade_id, subject_id, order_index } = req.body;
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    if (!canAccessSubject(allowedSubjectIds, Number(subject_id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title_en,
        title_vi,
        content_markdown_en,
        content_markdown_vi,
        grade_id,
        subject_id,
        order_index,
      }
    });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// Get all mastery records for current user
router.get('/mastery/all', authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const records = await prisma.userLessonMastery.findMany({
      where: { user_id: userId }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch mastery records" });
  }
});

// Update study time
router.post('/:id/study-time', authenticate, async (req, res) => {
  const lessonId = req.params.id as string;
  const { seconds } = req.body;
  const userId = (req as any).user.id;

  try {
    await masteryService.trackStudyTime(userId, lessonId, seconds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to track study time" });
  }
});

// Delete a lesson
router.delete('/:id', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const id = req.params.id as string;
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { subject_id: true }
    });
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!canAccessSubject(allowedSubjectIds, lesson.subject_id)) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    await prisma.lesson.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

export default router;
