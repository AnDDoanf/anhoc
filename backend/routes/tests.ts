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

const normalizeTextAnswer = (value: unknown): string => {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
};

const validateTheoreticalQuestion = (templateType: string, logicConfig: any, acceptedFormulas: unknown) => {
  if (templateType !== "theoretical_question") return null;

  const correctAnswers = Array.isArray(acceptedFormulas)
    ? acceptedFormulas.map((answer) => String(answer || "").trim()).filter(Boolean)
    : [];
  const falseAnswers = Array.isArray(logicConfig?.false_answers)
    ? logicConfig.false_answers.map((answer: unknown) => String(answer || "").trim()).filter(Boolean)
    : [];

  if (correctAnswers.length !== 1 || falseAnswers.length !== 3) {
    return "Theoretical questions require exactly one correct answer and three false answers.";
  }

  return null;
};

const normalizeTemplatePayload = (payload: any) => {
  const {
    lesson_id, template_type, difficulty,
    body_template_en, body_template_vi,
    explanation_template_en, explanation_template_vi,
    logic_config, accepted_formulas
  } = payload || {};

  return {
    lesson_id: lesson_id || null,
    template_type,
    difficulty: normalizeDifficulty(difficulty),
    body_template_en,
    body_template_vi,
    explanation_template_en,
    explanation_template_vi,
    logic_config: logic_config || {},
    accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : []
  };
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

const canAccessLessonSubject = async (req: any, lessonId?: string | null) => {
  if (!lessonId) return true;
  const allowedSubjectIds = await getAllowedSubjectIds(req);
  if (allowedSubjectIds === null) return true;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { subject_id: true }
  });

  return !!lesson && allowedSubjectIds.includes(lesson.subject_id);
};

const templateSubjectWhere = (subjectIds: number[] | null) => {
  if (subjectIds === null) return {};
  return {
    OR: [
      { lesson_id: null },
      { lesson: { subject_id: { in: subjectIds } } }
    ]
  };
};

const normalizeReportStatus = (value: unknown): string => {
  const status = String(value || "open").toLowerCase();
  return ["open", "reviewing", "resolved", "dismissed"].includes(status) ? status : "open";
};

const canAccessSubjectId = (subjectIds: number[] | null, subjectId?: number | null) => {
  return subjectIds === null || (typeof subjectId === "number" && subjectIds.includes(subjectId));
};

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const buildQuestionSnapshots = (attemptId: string, templates: any[], targetCount: number) => {
  const repeatsPerTemplate = Math.ceil(targetCount / templates.length);
  let templatePool: any[] = [];

  for (let i = 0; i < repeatsPerTemplate; i++) {
    templatePool = templatePool.concat(templates);
  }

  return shuffle(templatePool).slice(0, targetCount).map((template) => {
    const isTheoretical = template.template_type === "theoretical_question";
    const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
    const right_answers = isTheoretical
      ? template.accepted_formulas.slice(0, 1).filter(Boolean)
      : template.accepted_formulas
        .map((formula: string) => MathService.evaluateFormula(formula, vars))
        .filter((answer: unknown) => answer !== null);

    return {
      attempt_id: attemptId,
      template_id: template.id,
      generated_variables: vars,
      right_answers
    };
  });
};

router.get('/grade-tests', authenticate, async (req, res) => {
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const grades = await prisma.grade.findMany({
      where: {
        lessons: {
          some: {
            ...(allowedSubjectIds === null ? {} : { subject_id: { in: allowedSubjectIds } }),
            templates: { some: {} }
          }
        }
      },
      include: {
        subject: true,
        lessons: {
          where: {
            ...(
              allowedSubjectIds === null
                ? {}
                : { subject_id: { in: allowedSubjectIds } }
            ),
            templates: { some: {} }
          },
          include: {
            _count: {
              select: { templates: true }
            }
          },
          orderBy: { order_index: "asc" }
        }
      },
      orderBy: { id: "asc" }
    });

    const gradeTests = await Promise.all(grades.map(async (grade) => {
        const questionCount = grade.lessons.reduce((total, lesson) => total + lesson._count.templates, 0);
        const attempts = await prisma.testAttempt.findMany({
          where: {
            user_id: (req as any).user.id,
            is_practice: false,
            snapshots: {
              some: {
                template: {
                  lesson: {
                    grade_id: grade.id
                  }
                }
              }
            }
          },
          select: {
            id: true,
            total_score: true,
            is_completed: true,
            started_at: true,
            completed_at: true,
            _count: {
              select: { snapshots: true }
            }
          },
          orderBy: { started_at: "desc" },
          take: 5
        });

        return {
          id: `grade-${grade.id}-test`,
          grade_id: grade.id,
          grade_slug: grade.slug,
          title_en: `${grade.title_en} Test`,
          title_vi: `Bài kiểm tra ${grade.title_vi}`,
          description_en: `A 50-question test from all available question templates in ${grade.title_en}.`,
          description_vi: `Bài kiểm tra 50 câu từ tất cả mẫu câu hỏi hiện có trong ${grade.title_vi}.`,
          questionCount: 50,
          availableTemplateCount: questionCount,
          lessonCount: grade.lessons.length,
          attempts: attempts.map((attempt) => ({
            id: attempt.id,
            total_score: attempt.total_score === null ? null : Number(attempt.total_score),
            is_completed: attempt.is_completed,
            started_at: attempt.started_at,
            completed_at: attempt.completed_at,
            questionCount: attempt._count.snapshots
          })),
          difficulty: "Intermediate",
          iconType: "medal",
          grade,
          subject: grade.subject
        };
      }));

    res.json(gradeTests.filter((test) => test.availableTemplateCount > 0));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch grade tests", details: error.message });
  }
});

router.post('/grade-tests/:gradeId/start', authenticate, async (req, res) => {
  try {
    const gradeId = Number(req.params.gradeId);
    const userId = (req as any).user.id;

    if (!Number.isInteger(gradeId)) {
      return res.status(400).json({ error: "Invalid grade id" });
    }

    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        lessons: {
          where: allowedSubjectIds === null ? {} : { subject_id: { in: allowedSubjectIds } },
          select: { id: true, subject_id: true }
        }
      }
    });

    if (!grade) return res.status(404).json({ error: "Grade not found" });
    if (grade.subject_id && !canAccessSubjectId(allowedSubjectIds, grade.subject_id)) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    const lessonIds = grade.lessons.map((lesson) => lesson.id);
    if (lessonIds.length === 0) {
      return res.status(404).json({ error: "No lessons found for this grade." });
    }

    const templates = await prisma.questionTemplate.findMany({
      where: {
        lesson_id: { in: lessonIds }
      }
    });

    if (templates.length === 0) {
      return res.status(404).json({ error: "No question templates found for this grade test." });
    }

    const attempt = await prisma.testAttempt.create({
      data: {
        user_id: userId,
        lesson_id: null,
        is_practice: false
      }
    });

    const questionsToCreate = buildQuestionSnapshots(attempt.id, templates, 50);
    await prisma.questionSnapshot.createMany({
      data: questionsToCreate
    });

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
          orderBy: { id: "asc" }
        }
      }
    });

    res.json(attemptWithQuestions);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create test attempt.", details: error.message });
  }
});

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
  const isCorrect = snapshot.template.template_type === "theoretical_question"
    ? normalizeTextAnswer(studentAnswer) === normalizeTextAnswer(primaryFormula)
    : MathService.checkAnswer(
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
    const requestedTemplates = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.templates)
        ? req.body.templates
        : [req.body];

    if (requestedTemplates.length === 0) {
      return res.status(400).json({ error: "At least one template is required" });
    }

    const templates = requestedTemplates.map(normalizeTemplatePayload);
    for (const template of templates) {
      const theoreticalError = validateTheoreticalQuestion(template.template_type, template.logic_config, template.accepted_formulas);
      if (theoreticalError) return res.status(400).json({ error: theoreticalError });
      if (!(await canAccessLessonSubject(req, template.lesson_id))) {
        return res.status(403).json({ error: "You do not have access to this subject" });
      }
    }

    const createdTemplates = await prisma.$transaction(
      templates.map((template) => prisma.questionTemplate.create({ data: template }))
    );

    res.json(Array.isArray(req.body) || Array.isArray(req.body?.templates) ? createdTemplates : createdTemplates[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create template", details: error.message });
  }
});

// Report a generated question/template from practice or test flow
router.post('/question-reports', authenticate, async (req, res) => {
  try {
    const snapshotId = typeof req.body?.snapshotId === "string" ? req.body.snapshotId : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!snapshotId) {
      return res.status(400).json({ error: "Question snapshot is required" });
    }
    if (reason.length < 5) {
      return res.status(400).json({ error: "Report reason must be at least 5 characters" });
    }
    if (reason.length > 1000) {
      return res.status(400).json({ error: "Report reason must be 1000 characters or fewer" });
    }

    const snapshot = await prisma.questionSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        attempt: {
          select: {
            id: true,
            user_id: true,
            lesson_id: true
          }
        },
        template: {
          select: {
            id: true,
            lesson_id: true
          }
        }
      }
    });

    if (!snapshot || !snapshot.template_id || !snapshot.template) {
      return res.status(404).json({ error: "Question not found" });
    }

    const userId = (req as any).user?.id || null;
    if (snapshot.attempt?.user_id && snapshot.attempt.user_id !== userId && (req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "You can only report your own questions" });
    }

    const existingOpenReport = userId
      ? await (prisma as any).questionTemplateReport.findFirst({
          where: {
            reporter_id: userId,
            snapshot_id: snapshot.id,
            status: { in: ["open", "reviewing"] }
          }
        })
      : null;

    if (existingOpenReport) {
      return res.status(409).json({ error: "You already reported this question", report: existingOpenReport });
    }

    const report = await (prisma as any).questionTemplateReport.create({
      data: {
        template_id: snapshot.template_id,
        snapshot_id: snapshot.id,
        attempt_id: snapshot.attempt_id || null,
        lesson_id: snapshot.template.lesson_id || snapshot.attempt?.lesson_id || null,
        reporter_id: userId,
        reason
      }
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error("Failed to report question:", error);
    res.status(500).json({ error: "Failed to report question", details: error.message });
  }
});

// List template reports for admins/content reviewers
router.get('/question-reports', authenticate, async (req, res) => {
  try {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const status = typeof req.query.status === "string" ? req.query.status : "";
    const where = status && status !== "all" ? { status: normalizeReportStatus(status) } : {};

    const reports = await (prisma as any).questionTemplateReport.findMany({
      where,
      include: {
        reporter: { select: { id: true, username: true, email: true } },
        template: {
          include: {
            lesson: {
              include: { grade: true, subject: true }
            }
          }
        },
        snapshot: true,
        attempt: { select: { id: true, is_practice: true, started_at: true } }
      },
      orderBy: { created_at: "desc" },
      take: 100
    });

    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch question reports", details: error.message });
  }
});

router.patch('/question-reports/:id', authenticate, async (req, res) => {
  try {
    if ((req as any).user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const id = req.params.id as string;
    const status = normalizeReportStatus(req.body?.status);
    const report = await (prisma as any).questionTemplateReport.update({
      where: { id },
      data: {
        status,
        updated_at: new Date()
      }
    });

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update question report", details: error.message });
  }
});

// Get all Question Templates (Admin)
router.get('/templates', authenticate, async (req, res) => {
  try {
    const allowedSubjectIds = await getAllowedSubjectIds(req);
    const templates = await prisma.questionTemplate.findMany({
      where: templateSubjectWhere(allowedSubjectIds),
      include: {
        lesson: {
          include: {
            grade: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get one Question Template (Admin)
router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const template = await prisma.questionTemplate.findUnique({
      where: { id },
      include: { lesson: true }
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (!(await canAccessLessonSubject(req, template.lesson_id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch template", details: error.message });
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

    const theoreticalError = validateTheoreticalQuestion(template_type, logic_config, accepted_formulas);
    if (theoreticalError) return res.status(400).json({ error: theoreticalError });
    if (!(await canAccessLessonSubject(req, lesson_id))) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

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
