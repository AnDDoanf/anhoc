import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import * as MathService from '../services/mathService';
import { masteryService } from '../services/masteryService';
import { createNotification, NotificationType, notifyAdmins } from '../services/notificationService.ts';
import {
  canAccessLessonForViewer,
  canRequestSubjectAccess,
  getAllowedSubjectIdsForViewer,
  getSubjectCatalogForViewer,
  getVisibleGradeWhereForViewer,
  getVisibleLessonWhereForViewer,
  getVisibleTemplateWhereForViewer,
} from '../services/contentAccessService.ts';
import { getLearnUnitMemberIds, getLearnUnitForUser } from '../services/learnUnitService.ts';

const router = Router();

const normalizeDifficulty = (difficulty: unknown): string | null => {
  const value = String(difficulty || "all").toLowerCase();
  if (["easy", "medium", "hard"].includes(value)) return value;
  return null;
};

const normalizeBooleanFlag = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  if (typeof value === "number") return value === 1;
  return false;
};

const getAllowedSubjectIds = async (req: any): Promise<number[] | null> => (
  getAllowedSubjectIdsForViewer(req.user)
);

const isCreatedByAdmin = async (createdById: string | null): Promise<boolean> => {
  if (!createdById) return true;
  const creator = await prisma.user.findUnique({
    where: { id: createdById },
    select: { role: { select: { name: true } } }
  });
  return !creator || creator.role.name === "admin";
};

const subjectWhere = (subjectIds: number[] | null) => {
  if (subjectIds === null) return {};
  return { subject_id: { in: subjectIds } };
};

const canAccessSubject = (subjectIds: number[] | null, subjectId: number) => {
  return subjectIds === null || subjectIds.includes(subjectId);
};

const requireAdminRole = (req: any, res: any) => {
  if (req.user?.role !== "admin" && req.user?.role !== "supervisor") {
    res.status(403).json({ error: "Admin or Supervisor access required" });
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

const enforceLearnUnitCreationLimit = async (
  userId: string,
  contentType: "subject" | "grade" | "lesson"
): Promise<string | null> => {
  const learnUnit = await getLearnUnitForUser(userId);
  if (!learnUnit) return null;

  const memberIds = await getLearnUnitMemberIds(learnUnit.id);

  let limit: number | null | undefined;
  let currentCount = 0;
  let label = "";

  if (contentType === "subject") {
    limit = learnUnit.max_subjects;
    currentCount = await prisma.subject.count({ where: { created_by: { in: memberIds } } });
    label = "subject";
  } else if (contentType === "grade") {
    limit = learnUnit.max_grades;
    currentCount = await prisma.grade.count({ where: { created_by: { in: memberIds } } });
    label = "grade";
  } else {
    limit = learnUnit.max_lessons;
    currentCount = await prisma.lesson.count({ where: { created_by: { in: memberIds } } });
    label = "lesson";
  }

  if (limit !== null && typeof limit !== "undefined" && currentCount >= limit) {
    return `Access denied: ${label} creation limit reached`;
  }

  return null;
};

// Create a new lesson (Admin or Teacher can have 'manage' permission)
router.post('/', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const { title_en, title_vi, content_markdown_en, content_markdown_vi, grade_id, subject_id, order_index } = req.body;
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  if (!canAccessSubject(allowedSubjectIds, Number(subject_id))) {
    return res.status(403).json({ error: "You do not have access to this subject" });
  }

  const createdBy = (req as any).user.id;
  const userRole = (req as any).user.role;
  const isPremium = userRole === "admin" ? normalizeBooleanFlag(req.body?.is_premium) : false;

  if (userRole !== "admin") {
    const limitError = await enforceLearnUnitCreationLimit(createdBy, "lesson");
    if (limitError) {
      return res.status(403).json({ error: limitError });
    }
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
      is_premium: isPremium,
      created_by: createdBy
    }
  });
  res.json(lesson);
});

// Get all lessons (With hierarchy metadata)
router.get('/', optionalAuthenticate, async (req, res) => {
  const lessonWhere = await getVisibleLessonWhereForViewer((req as any).user);
  const lessons = await prisma.lesson.findMany({
    where: lessonWhere,
    orderBy: { order_index: 'asc' },
    include: {
      grade: true,
      subject: true
    }
  });

  const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
  const responseLessons = lessons.map((lesson) => ({
    ...lesson,
    is_locked: lesson.is_premium && isFreeOrGuest
  }));
  res.json(responseLessons);
});

// Get all grades
router.get('/grades', authenticate, async (req, res) => {
  const gradeWhere = await getVisibleGradeWhereForViewer((req as any).user);
  const grades = await prisma.grade.findMany({
    where: gradeWhere,
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

    const createdBy = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin") {
      const limitError = await enforceLearnUnitCreationLimit(createdBy, "grade");
      if (limitError) {
        return res.status(403).json({ error: limitError });
      }
    }

    const grade = await prisma.grade.create({
      data: {
        slug,
        title_en: titleEn,
        title_vi: titleVi,
        subject_id: subjectId,
        created_by: createdBy
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

router.get('/subjects/catalog', authenticate, async (req, res) => {
  try {
    const catalog = await getSubjectCatalogForViewer((req as any).user);
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subject catalog" });
  }
});

router.post('/subjects', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  if (!requireAdminRole(req, res)) return;

  try {
    const titleEn = String(req.body.title_en || "").trim();
    const titleVi = String(req.body.title_vi || "").trim();
    const requestedSlug = String(req.body.slug || "").trim();
    const color = typeof req.body.color === "string" ? req.body.color.trim() : undefined;
    const isClassified = Boolean(req.body.is_classified);

    if (!titleEn || !titleVi) {
      return res.status(400).json({ error: "title_en and title_vi are required" });
    }

    const createdBy = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== "admin") {
      const limitError = await enforceLearnUnitCreationLimit(createdBy, "subject");
      if (limitError) {
        return res.status(403).json({ error: limitError });
      }
    }

    const subject = await prisma.subject.create({
      data: {
        slug: requestedSlug || slugify(titleEn),
        title_en: titleEn,
        title_vi: titleVi,
        color,
        is_classified: isClassified,
        created_by: createdBy
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

router.patch('/subjects/:id', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  if (!requireAdminRole(req, res)) return;

  try {
    const subjectId = Number(req.params.id);
    const titleEn = typeof req.body.title_en === "string" ? req.body.title_en.trim() : undefined;
    const titleVi = typeof req.body.title_vi === "string" ? req.body.title_vi.trim() : undefined;
    const requestedSlug = typeof req.body.slug === "string" ? req.body.slug.trim() : undefined;
    const color = typeof req.body.color === "string" ? req.body.color.trim() : undefined;
    const isClassified = typeof req.body.is_classified === "boolean" ? req.body.is_classified : undefined;

    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ error: "Invalid subject id" });
    }

    const userRole = (req as any).user.role;
    if (userRole === "supervisor") {
      const existingSubject = await prisma.subject.findUnique({ where: { id: subjectId } });
      if (existingSubject && await isCreatedByAdmin(existingSubject.created_by)) {
        return res.status(403).json({ error: "Access denied: supervisors cannot modify admin-created subjects" });
      }
    }

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: {
        ...(titleEn ? { title_en: titleEn } : {}),
        ...(titleVi ? { title_vi: titleVi } : {}),
        ...(requestedSlug ? { slug: slugify(requestedSlug) } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(isClassified !== undefined ? { is_classified: isClassified } : {}),
      }
    });

    res.json(subject);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Subject not found" });
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Subject slug already exists" });
    }
    res.status(500).json({ error: "Failed to update subject", details: error.message });
  }
});

router.post('/subjects/:id/request-access', authenticate, async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const userId = (req as any).user.id as string;

    if (!Number.isInteger(subjectId)) {
      return res.status(400).json({ error: "Invalid subject id" });
    }

    const accessCheck = await canRequestSubjectAccess((req as any).user, subjectId);
    if (!accessCheck.allowed) {
      const statusCode = accessCheck.reason === "Subject not found or not visible" ? 404 : 400;
      return res.status(statusCode).json({ error: accessCheck.reason });
    }

    const subjectDetails = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        slug: true,
        title_en: true,
        title_vi: true
      }
    });

    const request = await prisma.userSubjectAccessRequest.upsert({
      where: {
        user_id_subject_id: {
          user_id: userId,
          subject_id: subjectId
        }
      },
      update: {
        status: "pending",
        requested_at: new Date(),
        reviewed_at: null,
        reviewed_by: null,
      },
      create: {
        user_id: userId,
        subject_id: subjectId,
        status: "pending"
      }
    });

    await notifyAdmins({
      actorId: userId,
      type: NotificationType.SubjectAccessRequested,
      entityType: 'subject_access_request',
      entityId: String(request.id),
      payload: {
        request_id: request.id,
        subject_id: subjectId,
        subject_slug: subjectDetails?.slug || null,
        subject_title_en: subjectDetails?.title_en || null,
        subject_title_vi: subjectDetails?.title_vi || null,
      }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: "Failed to request subject access" });
  }
});

// Get Lessons that have practice questions available
router.get('/practice-available', optionalAuthenticate, async (req, res) => {
  try {
    const lessonWhere = await getVisibleLessonWhereForViewer((req as any).user);
    const templateWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const lessons = await prisma.lesson.findMany({
      where: {
        templates: {
          some: templateWhere
        },
        AND: [lessonWhere],
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

    const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
    const responseLessons = lessons.map((lesson) => ({
      ...lesson,
      is_locked: lesson.is_premium && isFreeOrGuest
    }));
    res.json(responseLessons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch practice-ready lessons" });
  }
});

// Start a Practice Session for a Lesson
router.post('/:id/practice', optionalAuthenticate, async (req, res) => {
  const lesson_id = req.params.id as string;
  const userId = (req as any).user?.id || null;
  const difficulty = normalizeDifficulty(req.body?.difficulty);

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lesson_id },
      select: { subject_id: true, is_premium: true }
    });

    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!(await canAccessLessonForViewer((req as any).user, lesson_id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    // Access check for premium lesson
    if (lesson.is_premium) {
      if (!(req as any).user || (req as any).user.role === 'free_student') {
        return res.status(403).json({ error: "Access denied: premium lesson practice requires a subscription." });
      }
    }

    // 1. Fetch templates associated with this lesson
    const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
    const templateVisibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const templates = await prisma.questionTemplate.findMany({
      where: {
        AND: [
          templateVisibilityWhere,
          { lesson_id },
        ],
        ...(difficulty ? { difficulty } : {}),
        ...(isFreeOrGuest ? { is_premium: false } : {})
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
router.get('/:id', optionalAuthenticate, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
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
    if (!(await canAccessLessonForViewer((req as any).user, id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    // Access check for premium lesson
    if (lesson.is_premium) {
      if (!(req as any).user || (req as any).user.role === 'free_student') {
        return res.status(403).json({ error: "Access denied: this is a premium lesson." });
      }
    }

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// Update a lesson
router.put('/:id', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const id = req.params.id as string;
  const { title_en, title_vi, content_markdown_en, content_markdown_vi, grade_id, subject_id, order_index, is_premium } = req.body;
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    if (!canAccessSubject(allowedSubjectIds, Number(subject_id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }
    if (!(await canAccessLessonForViewer((req as any).user, id))) {
      return res.status(403).json({ error: "You do not have access to this lesson" });
    }

    const userRole = (req as any).user.role;
    const existingLesson = await prisma.lesson.findUnique({ where: { id } });
    if (!existingLesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    if (userRole === "supervisor") {
      if (await isCreatedByAdmin(existingLesson.created_by)) {
        return res.status(403).json({ error: "Access denied: supervisors cannot modify admin-created lessons" });
      }
    }

    const nextPremiumValue = userRole === "admin"
      ? normalizeBooleanFlag(is_premium)
      : existingLesson.is_premium;

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
        is_premium: nextPremiumValue,
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
  const user = (req as any).user;
  const userId = user.id;

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { is_premium: true }
    });

    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }
    if (!(await canAccessLessonForViewer((req as any).user, lessonId))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    if (lesson.is_premium && user.role === 'free_student') {
      return res.status(403).json({ error: "Access denied: cannot track study time for premium lessons." });
    }

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
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      select: { subject_id: true, created_by: true }
    });
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    if (!(await canAccessLessonForViewer((req as any).user, id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    const userRole = (req as any).user.role;
    if (userRole === "supervisor") {
      if (await isCreatedByAdmin(lesson.created_by)) {
        return res.status(403).json({ error: "Access denied: supervisors cannot delete admin-created lessons" });
      }
    }

    await prisma.lesson.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

export default router;
