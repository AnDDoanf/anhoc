import { Router } from 'express';
import prisma from '../lib/db';
import * as MathService from '../services/mathService';
import { authenticate } from '../middleware/auth';

const router = Router();

// 2. Get a Test Attempt
router.get('/attempts/:id', authenticate, async (req, res) => {
  const attemptId = req.params.id as string;
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
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
  if (!attempt) return res.status(404).json({ error: "Attempt not found" });
  res.json(attempt);
});

// 3. Submit Answer for a Snapshot
router.post('/submit-answer', async (req, res) => {
  const { snapshotId, studentAnswer } = req.body;

  const snapshot = await prisma.questionSnapshot.findUnique({
    where: { id: snapshotId },
    include: { template: true }
  });

  if (!snapshot || !snapshot.template) return res.status(404).send("Question not found");

  const primaryFormula = (snapshot.template.accepted_formulas?.[0]) || "0";
  const isCorrect = MathService.checkAnswer(
    primaryFormula,
    snapshot.generated_variables,
    studentAnswer,
    snapshot.template.accepted_formulas?.slice(1)
  );

  const updated = await prisma.questionSnapshot.update({
    where: { id: snapshotId },
    data: {
      student_answer: studentAnswer,
      is_correct: isCorrect,
      points_earned: isCorrect ? 10 : 0, // Logic for weighting
      responded_at: new Date()
    }
  });

  res.json({ isCorrect, explanation: snapshot.template.explanation_template_vi });
});

// 3. Finish or Abandon a Test Attempt
router.post('/attempts/:id/finish', authenticate, async (req, res) => {
  const attemptId = req.params.id as string;

  try {
    // Mark all unanswered snapshots as incorrect
    await prisma.questionSnapshot.updateMany({
      where: { 
        attempt_id: attemptId,
        student_answer: null 
      },
      data: {
        is_correct: false,
        points_earned: 0,
        responded_at: new Date()
      }
    });

    // Calculate total score
    const snapshots = await prisma.questionSnapshot.findMany({
      where: { attempt_id: attemptId }
    });
    
    const correctAnswers = snapshots.filter(s => s.is_correct).length;
    const totalScore = snapshots.length > 0 ? (correctAnswers / snapshots.length) * 100 : 0;

    const attempt = await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        is_completed: true,
        completed_at: new Date(),
        total_score: totalScore
      }
    });

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ error: "Failed to finish attempt" });
  }
});

// 4. Create Question Template (Admin)
router.post('/templates', authenticate, async (req, res) => {
  try {
    const { 
      lesson_id, template_type, 
      body_template_en, body_template_vi, 
      explanation_template_en, explanation_template_vi, 
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.create({
      data: {
        lesson_id: lesson_id || null,
        template_type,
        body_template_en,
        body_template_vi,
        explanation_template_en,
        explanation_template_vi,
        logic_config: logic_config || {},
        accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : []
      }
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create template", details: error.message });
  }
});

// Get all Question Templates (Admin)
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await prisma.questionTemplate.findMany({
      include: { lesson: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Update a Question Template
router.put('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { 
      lesson_id, template_type, 
      body_template_en, body_template_vi, 
      explanation_template_en, explanation_template_vi, 
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.update({
      where: { id },
      data: {
        lesson_id: lesson_id || null,
        template_type,
        body_template_en,
        body_template_vi,
        explanation_template_en,
        explanation_template_vi,
        logic_config: logic_config || {},
        accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : []
      }
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update template" });
  }
});

// Delete a Question Template
router.delete('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    await prisma.questionTemplate.delete({ where: { id } });
  res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete template" });
  }
});

// GET My Practice History
router.get('/my-practice-history', authenticate, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const history = await prisma.testAttempt.findMany({
      where: {
        user_id: userId,
        is_practice: true,
        is_completed: true
      },
      include: {
        lesson: {
          include: { grade: true }
        }
      },
      orderBy: { completed_at: 'desc' },
      take: 20
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch practice history" });
  }
});

export default router;