import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// Create a new lesson (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  const { title_vi, content_markdown, grade_level } = req.body;
  const lesson = await prisma.lesson.create({
    data: { title_vi, content_markdown, grade_level, created_by: (req as any).user.id }
  });
  res.json(lesson);
});

// Get all lessons (For the kid)
router.get('/', authenticate, async (req, res) => {
  const lessons = await prisma.lesson.findMany({ orderBy: { order_index: 'asc' } });
  res.json(lessons);
});

export default router;