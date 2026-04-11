import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize } from '../middleware/auth';
import * as MathService from '../services/mathService';
import { masteryService } from '../services/masteryService';

const router = Router();

// Create a new lesson (Admin or Teacher can have 'manage' permission)
router.post('/', authenticate, authorize('manage', 'lesson'), async (req, res) => {
  const { title_en, title_vi, content_markdown_en, content_markdown_vi, grade_id, subject_id, order_index } = req.body;
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
  const lessons = await prisma.lesson.findMany({
    orderBy: { order_index: 'asc' },
    include: {
      grade: true,
      subject: true
    }
  });
  res.json(lessons);
});

// Get all grades
router.get('/grades', async (req, res) => {
  const grades = await prisma.grade.findMany({ orderBy: { id: 'asc' } });
  res.json(grades);
});

// Get all subjects
router.get('/subjects', async (req, res) => {
  const subjects = await prisma.subject.findMany();
  res.json(subjects);
});

// Get Lessons that have practice questions available
router.get('/practice-available', authenticate, async (req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
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

  try {
    // 1. Fetch templates associated with this lesson
    const templates = await prisma.questionTemplate.findMany({
      where: { lesson_id }
    });

    if (templates.length === 0) {
      return res.status(404).json({ error: "No templates found for this lesson to practice." });
    }

    // 2. Create a practice TestAttempt
    const attempt = await prisma.testAttempt.create({
      data: { 
        user_id: userId,
        lesson_id: lesson_id,
        is_practice: true
      }
    });

    // 3. Generate 20 snapshots randomly chosen from the templates
    const questionsToCreate = [];
    const count = Math.min(20, templates.length * 5); // Allow some repetition if few templates
    for (let i = 0; i < count; i++) {
      // Pick a random template
      const template = templates[Math.floor(Math.random() * templates.length)];
      // Generate random variables based on the template's logic config
      const vars = MathService.generateVars(template.logic_config);
      
      // Pre-calculate all valid answers
      const right_answers = template.accepted_formulas
        .map(f => MathService.evaluateFormula(f, vars))
        .filter(ans => ans !== null) as string[];

      questionsToCreate.push({
        attempt_id: attempt.id,
        template_id: template.id,
        generated_variables: vars as any,
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
    await prisma.lesson.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

export default router;