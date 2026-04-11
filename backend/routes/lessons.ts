import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, authorize } from '../middleware/auth';

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