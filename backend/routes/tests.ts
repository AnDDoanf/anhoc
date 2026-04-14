import { Router } from 'express';
import prisma from '../lib/db';
import * as MathService from '../services/mathService';
import { authenticate } from '../middleware/auth';
import { checkAndAwardAchievements } from '../services/achievementService';
import { masteryService } from '../services/masteryService';
import { levelService } from '../services/levelService';

const router = Router();

const normalizeDifficulty = (difficulty: unknown): string => {
  const value = String(difficulty || "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(value) ? value : "medium";
};

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

  res.json({
    isCorrect,
    rightAnswers: snapshot.right_answers,
    explanation: snapshot.template.explanation_template_vi
  });
});

// 3. Finish or Abandon a Test Attempt
router.post('/attempts/:id/finish', authenticate, async (req, res) => {
  const attemptId = req.params.id;

  try {
    // Prevent double finish
    const existing = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: { is_completed: true }
    });

    if (existing?.is_completed) {
      return res.status(400).json({ error: "Attempt already completed" });
    }

    const completedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Mark unanswered
      await tx.questionSnapshot.updateMany({
        where: {
          attempt_id: attemptId,
          student_answer: null
        },
        data: {
          is_correct: false,
          points_earned: 0,
          responded_at: completedAt
        }
      });

      const total = await tx.questionSnapshot.count({
        where: { attempt_id: attemptId }
      });

      const correct = await tx.questionSnapshot.count({
        where: { attempt_id: attemptId, is_correct: true }
      });

      const totalScore = total > 0 ? (correct / total) * 100 : 0;

      const attempt = await tx.testAttempt.update({
        where: { id: attemptId },
        data: {
          is_completed: true,
          completed_at: completedAt,
          total_score: totalScore
        },
        select: {
          user_id: true,
          lesson_id: true,
          started_at: true,
          total_score: true
        }
      });

      return { attempt, correct };
    });

    const { attempt, correct } = result;

    // Mastery
    try {
      if (attempt.user_id && attempt.lesson_id) {
        const timeSpentSeconds = Math.floor((completedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000);
        await masteryService.updateMastery(attempt.user_id, attempt.lesson_id, attempt.total_score, timeSpentSeconds);
      }
    } catch (e) {
      console.error("Mastery Service Error:", e); // This won't crash the request anymore
    }

    try {
      if (attempt.user_id) {
        await levelService.addXp(attempt.user_id, correct * 2, "practice_completion");
      }
    } catch (e) {
      console.error("XP Service Error:", e);
    }

    try {
      if (attempt.user_id) {
        const [practiceStats, completedLessons] = await Promise.all([
          prisma.testAttempt.aggregate({
            where: {
              user_id: attempt.user_id,
              is_completed: true,
              is_practice: true
            },
            _avg: {
              total_score: true
            }
          }),
          prisma.userLessonMastery.count({
            where: {
              user_id: attempt.user_id,
              completion_status: "completed"
            }
          })
        ]);

        await prisma.studentStats.upsert({
          where: { user_id: attempt.user_id },
          update: {
            average_score: Number(practiceStats._avg.total_score ?? 0),
            lessons_completed: completedLessons,
            last_active: completedAt
          },
          create: {
            user_id: attempt.user_id,
            average_score: Number(practiceStats._avg.total_score ?? 0),
            lessons_completed: completedLessons,
            last_active: completedAt
          }
        });
      }
    } catch (e) {
      console.error("Student Stats Service Error:", e);
    }

    // Achievements
    let newlyEarned: any[] = [];
    if (attempt.user_id) {
      newlyEarned = await checkAndAwardAchievements(attempt.user_id);
    }

    res.json({
      ...attempt,
      newlyEarned
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to finish attempt" });
  }
});

// 4. Create Question Template (Admin)
router.post('/templates', authenticate, async (req, res) => {
  try {
    const {
      lesson_id, template_type, difficulty,
      body_template_en, body_template_vi,
      explanation_template_en, explanation_template_vi,
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.create({
      data: {
        lesson_id: lesson_id || null,
        template_type,
        difficulty: normalizeDifficulty(difficulty),
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
      lesson_id, template_type, difficulty,
      body_template_en, body_template_vi,
      explanation_template_en, explanation_template_vi,
      logic_config, accepted_formulas
    } = req.body;

    const template = await prisma.questionTemplate.update({
      where: { id },
      data: {
        lesson_id: lesson_id || null,
        template_type,
        difficulty: normalizeDifficulty(difficulty),
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
    console.error("Failed to update template:", error);
    res.status(500).json({ error: "Failed to update template", details: error.message });
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
