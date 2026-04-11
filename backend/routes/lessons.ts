import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

// Create a new lesson (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
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

export default router;