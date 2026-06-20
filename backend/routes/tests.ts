import { Router } from 'express';
import prisma from '../lib/db';
import { cacheGet, cacheSet, cacheInvalidateQuestion, isCacheAlive } from '../lib/redis';
import * as MathService from '../services/mathService';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth';
import { masteryService } from '../services/masteryService';
import { levelService } from '../services/levelService';
import { createNotification, NotificationType, notifyAdmins } from '../services/notificationService.ts';
import { economyService } from '../services/economyService.ts';
import { achievementQueue } from '../lib/queue.ts';
import { checkAndAwardAchievements } from '../services/achievementService.ts';
import {
  canAccessLessonForViewer,
  canAccessStandaloneTemplate,
  getAllowedSubjectIdsForViewer,
  getVisibleGradeWhereForViewer,
  getVisibleLessonWhereForViewer,
  getVisibleTemplateWhereForViewer,
} from '../services/contentAccessService.ts';
import { getLearnUnitForUser, getLearnUnitMemberIds } from '../services/learnUnitService.ts';

const router = Router();

const isCreatedByAdmin = async (createdById: string | null): Promise<boolean> => {
  if (!createdById) return true;
  const creator = await prisma.user.findUnique({
    where: { id: createdById },
    select: { role: { select: { name: true } } }
  });
  return !creator || creator.role.name === "admin";
};

const normalizeDifficulty = (difficulty: unknown): string => {
  const value = String(difficulty || "medium").toLowerCase();
  return ["easy", "medium", "hard"].includes(value) ? value : "medium";
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
    logic_config, accepted_formulas, is_premium, tags
  } = payload || {};

  return {
    lesson_id: lesson_id || null,
    template_type,
    difficulty: normalizeDifficulty(difficulty),
    body_template_en,
    body_template_vi,
    explanation_template_en,
    explanation_template_vi,
    is_premium: normalizeBooleanFlag(is_premium),
    logic_config: logic_config || {},
    accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : [],
    tags: Array.isArray(tags) ? tags.map((t: any) => String(t || "").trim()).filter(Boolean) : []
  };
};

const getAllowedSubjectIds = async (req: any): Promise<number[] | null> => (
  getAllowedSubjectIdsForViewer(req.user)
);

const canAccessLessonSubject = async (req: any, lessonId?: string | null) => (
  canAccessLessonForViewer((req as any).user, lessonId)
);

const normalizeReportStatus = (value: unknown): string => {
  const status = String(value || "open").toLowerCase();
  return ["open", "reviewing", "resolved", "dismissed"].includes(status) ? status : "open";
};

const parsePositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const canAccessSubjectId = (subjectIds: number[] | null, subjectId?: number | null) => {
  return subjectIds === null || (typeof subjectId === "number" && subjectIds.includes(subjectId));
};

const shuffle = <T>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i]!;
    next[i] = next[j]!;
    next[j] = current;
  }
  return next;
};

const GRADE_TEST_MIN_SCORE = 70;

const buildGradeTestEligibility = async (
  userId: string,
  grades: Array<{ id: number; lessons: Array<{ id: string }> }>
) => {
  const lessonIds = Array.from(new Set(grades.flatMap((grade) => grade.lessons.map((lesson) => lesson.id))));
  const masteryRecords = lessonIds.length === 0
    ? []
    : await prisma.userLessonMastery.findMany({
        where: {
          user_id: userId,
          lesson_id: { in: lessonIds }
        },
        select: {
          lesson_id: true,
          mastery_score: true
        }
      });

  const masteryByLesson = new Map(
    masteryRecords.map((record) => [record.lesson_id, Number(record.mastery_score || 0)])
  );

  return new Map(
    grades.map((grade) => {
      const requiredLessonIds = Array.from(new Set(grade.lessons.map((lesson) => lesson.id)));
      const completedLessonCount = requiredLessonIds.filter(
        (lessonId) => (masteryByLesson.get(lessonId) ?? 0) >= GRADE_TEST_MIN_SCORE
      ).length;

      return [
        grade.id,
        {
          eligible: requiredLessonIds.length > 0 && completedLessonCount === requiredLessonIds.length,
          requiredLessonCount: requiredLessonIds.length,
          completedLessonCount,
          minimumScore: GRADE_TEST_MIN_SCORE
        }
      ] as const;
    })
  );
};

const getGradeTestEligibilityForViewer = async (
  viewer: any,
  userId: string,
  gradeId: number
) => {
  const gradeWhere = await getVisibleGradeWhereForViewer(viewer);
  const lessonWhere = await getVisibleLessonWhereForViewer(viewer);
  const templateWhere = await getVisibleTemplateWhereForViewer(viewer);
  const grade = await prisma.grade.findFirst({
    where: {
      AND: [gradeWhere, { id: gradeId }]
    },
    include: {
      lessons: {
        where: {
          AND: [
            lessonWhere,
            {
              templates: { some: templateWhere }
            }
          ]
        },
        select: { id: true }
      }
    }
  });

  if (!grade) return null;

  return (await buildGradeTestEligibility(userId, [grade])).get(grade.id) ?? {
    eligible: false,
    requiredLessonCount: grade.lessons.length,
    completedLessonCount: 0,
    minimumScore: GRADE_TEST_MIN_SCORE
  };
};

type NormalizedTemplatePayload = ReturnType<typeof normalizeTemplatePayload>;

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

const canAccessAttempt = (req: any, ownerUserId?: string | null) => {
  if (req.user?.role === 'admin') return true;
  if (!ownerUserId) return !req.user;
  return req.user?.id === ownerUserId;
};

router.get('/grade-tests', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const gradeWhere = await getVisibleGradeWhereForViewer((req as any).user);
    const lessonWhere = await getVisibleLessonWhereForViewer((req as any).user);
    const templateWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const grades = await prisma.grade.findMany({
      where: {
        AND: [gradeWhere],
        lessons: {
          some: {
            AND: [
              lessonWhere,
              {
                templates: { some: templateWhere }
              }
            ]
          }
        }
      },
      include: {
        subject: true,
        lessons: {
          where: {
            AND: [
              lessonWhere,
              {
                templates: { some: templateWhere }
              }
            ]
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
    const eligibilityByGrade = await buildGradeTestEligibility(userId, grades);

    const recentAttempts = await prisma.testAttempt.findMany({
      where: {
        user_id: userId,
        is_practice: false,
        snapshots: {
          some: {
            template: {
              lesson: {
                grade_id: { in: grades.map((grade) => grade.id) }
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
        },
        snapshots: {
          take: 1,
          select: {
            template: {
              select: {
                lesson: {
                  select: { grade_id: true }
                }
              }
            }
          }
        }
      },
      orderBy: { started_at: "desc" }
    });

    const attemptsByGrade = new Map<number, {
      id: string;
      total_score: number | null;
      is_completed: boolean | null;
      started_at: Date;
      completed_at: Date | null;
      questionCount: number;
    }[]>();

    for (const attempt of recentAttempts) {
      const gradeId = attempt.snapshots[0]?.template?.lesson?.grade_id;
      if (!gradeId) continue;

      const gradeAttempts = attemptsByGrade.get(gradeId) ?? [];
      if (gradeAttempts.length >= 5) continue;

      gradeAttempts.push({
        id: attempt.id,
        total_score: attempt.total_score === null ? null : Number(attempt.total_score),
        is_completed: attempt.is_completed,
        started_at: attempt.started_at,
        completed_at: attempt.completed_at,
        questionCount: attempt._count.snapshots
      });
      attemptsByGrade.set(gradeId, gradeAttempts);
    }

    const gradeTests = grades.map((grade) => {
      const questionCount = grade.lessons.reduce((total, lesson) => total + lesson._count.templates, 0);
      const eligibility = eligibilityByGrade.get(grade.id) ?? {
        eligible: false,
        requiredLessonCount: grade.lessons.length,
        completedLessonCount: 0,
        minimumScore: GRADE_TEST_MIN_SCORE
      };

      return {
        id: `grade-${grade.id}-test`,
        grade_id: grade.id,
        grade_slug: grade.slug,
        title_en: `${grade.title_en} Test`,
        title_vi: `Bài kiểm tra ${grade.title_vi}`,
        description_en: `A 50-question test from all available question templates in ${grade.title_en}.`,
        description_vi: `Bài kiểm tra 50 câu từ tất cả các mẫu câu hỏi hiện có trong ${grade.title_vi}.`,
        questionCount: 50,
        availableTemplateCount: questionCount,
        lessonCount: grade.lessons.length,
        attempts: attemptsByGrade.get(grade.id) ?? [],
        eligibility,
        difficulty: "Intermediate",
        iconType: "medal",
        grade,
        subject: grade.subject
      };
    });

    res.json(gradeTests.filter((test) => test.availableTemplateCount > 0));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch grade tests", details: error.message });
  }
});

// Export grade test questions on the fly (no DB attempt created)
router.get('/grade-tests/:gradeId/export-questions', optionalAuthenticate, async (req, res) => {
  try {
    const gradeId = Number(req.params.gradeId);
    if (!Number.isInteger(gradeId)) {
      return res.status(400).json({ error: "Invalid grade id" });
    }

    const gradeWhere = await getVisibleGradeWhereForViewer((req as any).user);
    const lessonWhere = await getVisibleLessonWhereForViewer((req as any).user);
    const templateVisibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        lessons: {
          where: {
            AND: [lessonWhere],
          },
          select: { id: true, subject_id: true }
        }
      }
    });

    if (!grade) return res.status(404).json({ error: "Grade not found" });
    const accessibleGrade = await prisma.grade.findFirst({
      where: {
        AND: [
          gradeWhere,
          { id: gradeId },
        ],
      },
      select: { id: true },
    });
    if (!accessibleGrade) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    const lessonIds = grade.lessons.map((lesson) => lesson.id);
    if (lessonIds.length === 0) {
      return res.status(404).json({ error: "No lessons found for this grade." });
    }

    const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
    const templates = await prisma.questionTemplate.findMany({
      where: {
        AND: [
          templateVisibilityWhere,
          { lesson_id: { in: lessonIds } },
        ],
        ...(isFreeOrGuest ? { is_premium: false } : {})
      }
    });

    if (templates.length === 0) {
      return res.status(404).json({ error: "No question templates found for this grade test." });
    }

    // Generate up to 50 questions
    const targetCount = 50;
    const repeatsPerTemplate = Math.ceil(targetCount / templates.length);
    let templatePool: any[] = [];
    for (let i = 0; i < repeatsPerTemplate; i++) {
      templatePool = templatePool.concat(templates);
    }

    // Shuffle and slice
    const shuffledTemplates = templatePool.sort(() => Math.random() - 0.5).slice(0, targetCount);

    const questions = shuffledTemplates.map((template) => {
      const isTheoretical = template.template_type === "theoretical_question";
      const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
      const right_answers = isTheoretical
        ? template.accepted_formulas.slice(0, 1).filter(Boolean)
        : template.accepted_formulas
          .map((formula: string) => MathService.evaluateFormula(formula, vars))
          .filter((answer: unknown) => answer !== null);

      return {
        template: {
          id: template.id,
          template_type: template.template_type,
          difficulty: template.difficulty,
          body_template_en: template.body_template_en,
          body_template_vi: template.body_template_vi,
          explanation_template_en: template.explanation_template_en,
          explanation_template_vi: template.explanation_template_vi,
          logic_config: template.logic_config,
          accepted_formulas: template.accepted_formulas,
        },
        generated_variables: vars,
        right_answers
      };
    });

    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to export grade test questions", details: error.message });
  }
});

router.post('/grade-tests/:gradeId/start', authenticate, async (req, res) => {
  try {
    const gradeId = Number(req.params.gradeId);
    const userId = (req as any).user.id as string;

    if (!Number.isInteger(gradeId)) {
      return res.status(400).json({ error: "Invalid grade id" });
    }

    const gradeWhere = await getVisibleGradeWhereForViewer((req as any).user);
    const lessonWhere = await getVisibleLessonWhereForViewer((req as any).user);
    const templateVisibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const grade = await prisma.grade.findUnique({
      where: { id: gradeId },
      include: {
        lessons: {
          where: {
            AND: [
              lessonWhere,
              {
                templates: { some: templateVisibilityWhere }
              }
            ],
          },
          select: { id: true, subject_id: true }
        }
      }
    });

    if (!grade) return res.status(404).json({ error: "Grade not found" });
    const accessibleGrade = await prisma.grade.findFirst({
      where: {
        AND: [
          gradeWhere,
          { id: gradeId },
        ],
      },
      select: { id: true },
    });
    if (!accessibleGrade) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    const lessonIds = grade.lessons.map((lesson) => lesson.id);
    if (lessonIds.length === 0) {
      return res.status(404).json({ error: "No lessons found for this grade." });
    }

    const eligibility = (await buildGradeTestEligibility(userId, [{ id: grade.id, lessons: grade.lessons }])).get(grade.id);
    if (!eligibility?.eligible) {
      return res.status(403).json({
        error: `Complete practice for all lessons in this grade with at least ${GRADE_TEST_MIN_SCORE}% before taking the test.`,
        eligibility
      });
    }

    const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
    const templates = await prisma.questionTemplate.findMany({
      where: {
        AND: [
          templateVisibilityWhere,
          { lesson_id: { in: lessonIds } },
        ],
        ...(isFreeOrGuest ? { is_premium: false } : {})
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
router.get('/attempts/:id', optionalAuthenticate, async (req, res) => {
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
  if (!canAccessAttempt(req, attempt.user_id)) {
    return res.status(403).json({ error: "You can only access your own attempts" });
  }
  if (!attempt.is_practice && attempt.user_id && (req as any).user) {
    const gradeId = attempt.snapshots[0]?.template?.lesson?.grade_id;
    if (gradeId) {
      const eligibility = await getGradeTestEligibilityForViewer((req as any).user, attempt.user_id, gradeId);
      if (!eligibility?.eligible) {
        return res.status(403).json({
          error: `Complete practice for all lessons in this grade with at least ${GRADE_TEST_MIN_SCORE}% before taking the test.`,
          eligibility
        });
      }
    }
  }

  // Filter out premium snapshots for guest/free students
  const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
  if (isFreeOrGuest) {
    attempt.snapshots = attempt.snapshots.filter((snapshot) => !snapshot.template?.is_premium);
  }

  res.json(attempt);
});

// 3. Submit Answer for a Snapshot
router.post('/submit-answer', optionalAuthenticate, async (req, res) => {
  const { snapshotId, studentAnswer } = req.body;

  const snapshot = await prisma.questionSnapshot.findUnique({
    where: { id: snapshotId },
    include: {
      template: {
        include: {
          lesson: {
            select: { grade_id: true }
          }
        }
      },
      attempt: {
        select: {
          id: true,
          user_id: true,
          is_completed: true,
          is_practice: true,
          lesson_id: true
        }
      }
    }
  });

  if (!snapshot || !snapshot.template) return res.status(404).send("Question not found");
  if (!canAccessAttempt(req, snapshot.attempt?.user_id)) {
    return res.status(403).json({ error: "You can only answer your own questions" });
  }
  if (snapshot.attempt?.is_completed) {
    return res.status(400).json({ error: "Attempt already completed" });
  }
  if (!snapshot.attempt?.is_practice && snapshot.attempt?.user_id && (req as any).user) {
    const gradeId = snapshot.template.lesson?.grade_id;
    if (gradeId) {
      const eligibility = await getGradeTestEligibilityForViewer((req as any).user, snapshot.attempt.user_id, gradeId);
      if (!eligibility?.eligible) {
        return res.status(403).json({
          error: `Complete practice for all lessons in this grade with at least ${GRADE_TEST_MIN_SCORE}% before taking the test.`,
          eligibility
        });
      }
    }
  }

  // Check if template is premium
  if (snapshot.template.is_premium) {
    const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
    if (isFreeOrGuest) {
      return res.status(403).json({ error: "Access denied: premium questions require a subscription." });
    }
  }

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

  let updatedNextSnapshot = null;
  if (snapshot.attempt?.is_practice && snapshot.attempt_id) {
    const nextSnapshot = await prisma.questionSnapshot.findFirst({
      where: {
        attempt_id: snapshot.attempt_id,
        id: { gt: snapshotId }
      },
      orderBy: { id: 'asc' }
    });

    if (nextSnapshot) {
      // 1. Calculate target difficulty
      const currentDifficulty = snapshot.template.difficulty || "medium";
      let targetDifficulty = currentDifficulty;
      if (isCorrect) {
        if (currentDifficulty === "easy") targetDifficulty = "medium";
        else if (currentDifficulty === "medium") targetDifficulty = "hard";
      } else {
        if (currentDifficulty === "hard") targetDifficulty = "medium";
        else if (currentDifficulty === "medium") targetDifficulty = "easy";
      }

      // 2. Fetch ALL candidate templates for this lesson in a single query,
      //    then pick from the preferred difficulty client-side.
      const lessonId = snapshot.attempt.lesson_id;
      const isFreeOrGuest = !(req as any).user || (req as any).user.role === 'free_student';
      const templateVisibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);

      const allTemplates = await prisma.questionTemplate.findMany({
        where: {
          AND: [
            templateVisibilityWhere,
            { lesson_id: lessonId },
          ],
          ...(isFreeOrGuest ? { is_premium: false } : {})
        }
      });

      // Prioritize by difficulty: target first, then fallbacks, then any
      const difficultyOrder: Record<string, string[]> = {
        hard: ["hard", "medium", "easy"],
        medium: [targetDifficulty, ...(targetDifficulty === "medium" ? ["easy", "hard"] : ["medium", "hard"])],
        easy: ["easy", "medium", "hard"],
      };
      const priorities = difficultyOrder[targetDifficulty] ?? [targetDifficulty, "easy", "medium", "hard"];

      let candidateTemplates: typeof allTemplates = [];
      for (const diff of priorities) {
        candidateTemplates = allTemplates.filter(t => t.difficulty === diff);
        if (candidateTemplates.length > 0) break;
      }
      // Ultimate fallback: use any available template
      if (candidateTemplates.length === 0) {
        candidateTemplates = allTemplates;
      }

      // 3. Randomly pick one template from candidates and generate variables
      if (candidateTemplates.length > 0) {
        const nextTemplate = candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)]!;
        const isTheoretical = nextTemplate.template_type === "theoretical_question";
        const nextVars = isTheoretical ? {} : MathService.generateVars(nextTemplate.logic_config);
        const nextRightAnswers = isTheoretical
          ? nextTemplate.accepted_formulas.slice(0, 1).filter(Boolean)
          : nextTemplate.accepted_formulas
              .map(f => {
                const evalVal = MathService.evaluateFormula(f, nextVars);
                return evalVal !== null ? String(evalVal) : null;
              })
              .filter((ans): ans is string => ans !== null);

        // Update the next snapshot in DB
        updatedNextSnapshot = await prisma.questionSnapshot.update({
          where: { id: nextSnapshot.id },
          data: {
            template_id: nextTemplate.id,
            generated_variables: nextVars,
            right_answers: nextRightAnswers,
            student_answer: null,
            is_correct: false,
            points_earned: 0
          },
          include: {
            template: {
              include: {
                lesson: {
                  include: { grade: true }
                }
              }
            }
          }
        });
      }
    }
  }

  res.json({
    isCorrect,
    rightAnswers: snapshot.right_answers,
    explanation: snapshot.template.explanation_template_vi,
    nextSnapshot: updatedNextSnapshot
  });
});

// 3. Finish or Abandon a Test Attempt
router.post('/attempts/:id/finish', authenticate, async (req, res) => {
  const attemptId = req.params.id as string;

  try {
    // Prevent double finish
    const existing = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: {
        is_completed: true,
        user_id: true,
        is_practice: true,
        snapshots: {
          take: 1,
          select: {
            template: {
              select: {
                lesson: {
                  select: { grade_id: true }
                }
              }
            }
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    if (!canAccessAttempt(req, existing.user_id)) {
      return res.status(403).json({ error: "You can only finish your own attempts" });
    }
    if (existing?.is_completed) {
      return res.status(400).json({ error: "Attempt already completed" });
    }
    if (!existing.is_practice && existing.user_id) {
      const gradeId = existing.snapshots[0]?.template?.lesson?.grade_id;
      if (gradeId) {
        const eligibility = await getGradeTestEligibilityForViewer((req as any).user, existing.user_id, gradeId);
        if (!eligibility?.eligible) {
          return res.status(403).json({
            error: `Complete practice for all lessons in this grade with at least ${GRADE_TEST_MIN_SCORE}% before taking the test.`,
            eligibility
          });
        }
      }
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
        await masteryService.updateMastery(attempt.user_id, attempt.lesson_id, Number(attempt.total_score ?? 0), timeSpentSeconds);
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
      if (attempt.user_id && existing?.is_practice) {
        const baseCoins = 10;
        const scoreBonus = Math.floor(Number(attempt.total_score || 0) / 10);
        let coinsEarned = baseCoins + scoreBonus;

        const stats = (await prisma.studentStats.findUnique({
          where: { user_id: attempt.user_id }
        })) as any;
        const upgrades = stats?.upgrades && typeof stats.upgrades === 'object' ? stats.upgrades : {};
        const coinBonusPct = Number((upgrades as any).coin_bonus_pct || 0);
        if (coinBonusPct > 0) {
          coinsEarned = Math.floor(coinsEarned * (1 + coinBonusPct / 100));
        }

        await economyService.addCoins(attempt.user_id, coinsEarned, "practice_completion");
      }
    } catch (e) {
      console.error("Ancoin Reward Service Error:", e);
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

    // Enqueue background achievements evaluation
    if (attempt.user_id) {
      if (isCacheAlive()) {
        try {
          await achievementQueue.add("check-achievements", { userId: attempt.user_id });
        } catch (err) {
          console.warn("⚠️ Failed to enqueue achievements check, falling back to check in place:", err);
          checkAndAwardAchievements(attempt.user_id).catch(err => {
            console.error("Failed to run fallback achievements check:", err);
          });
        }
      } else {
        checkAndAwardAchievements(attempt.user_id).catch(err => {
          console.error("Failed to run fallback achievements check:", err);
        });
      }
    }

    res.json({
      ...attempt,
      newlyEarned: []
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to finish attempt" });
  }
});

// 4. Create Question Template (Admin)
router.post('/templates', authenticate, authorize('manage', 'test'), async (req, res) => {
  try {
    const requestedTemplates = Array.isArray(req.body)
      ? req.body
      : Array.isArray(req.body?.templates)
        ? req.body.templates
        : [req.body];

    if (requestedTemplates.length === 0) {
      return res.status(400).json({ error: "At least one template is required" });
    }

    const requesterRole = (req as any).user.role;
    const requesterId = (req as any).user.id as string;
    const templates = requestedTemplates
      .map((template: any) => normalizeTemplatePayload(template))
      .map((template: NormalizedTemplatePayload) => ({
        ...template,
        created_by: requesterId,
        is_premium: requesterRole === "admin" ? template.is_premium : false,
      }));
    for (const template of templates) {
      const theoreticalError = validateTheoreticalQuestion(template.template_type, template.logic_config, template.accepted_formulas);
      if (theoreticalError) return res.status(400).json({ error: theoreticalError });
      if (!(await canAccessLessonSubject(req, template.lesson_id))) {
        return res.status(403).json({ error: "You do not have access to this subject" });
      }
      if (requesterRole !== "admin" && template.lesson_id) {
        const targetLesson = await prisma.lesson.findUnique({
          where: { id: template.lesson_id },
          select: { created_by: true }
        });
        if (targetLesson && await isCreatedByAdmin(targetLesson.created_by)) {
          return res.status(403).json({ error: "Access denied: you cannot attach question templates to admin-created lessons" });
        }
      }
    }

    const learnUnit = await getLearnUnitForUser(requesterId);
    if (learnUnit && learnUnit.max_templates !== null) {
      const memberIds = await getLearnUnitMemberIds(learnUnit.id);
      const activeTemplatesCount = await prisma.questionTemplate.count({
        where: {
          created_by: { in: memberIds }
        }
      });
      if (activeTemplatesCount + templates.length > learnUnit.max_templates) {
        return res.status(403).json({ error: "Access denied: subscription limit for question templates reached" });
      }
    }

    const createdTemplates = await prisma.$transaction(
      templates.map((template: NormalizedTemplatePayload & { created_by: string }) => prisma.questionTemplate.create({ data: template }))
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

    await notifyAdmins({
      actorId: userId,
      type: NotificationType.QuestionReportCreated,
      entityType: 'question_report',
      entityId: report.id,
      payload: {
        report_id: report.id,
        lesson_id: snapshot.template.lesson_id || snapshot.attempt?.lesson_id || null,
        snapshot_id: snapshot.id,
        template_id: snapshot.template_id,
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
      },
      include: {
        reporter: {
          select: {
            id: true
          }
        }
      }
    });

    if (report.reporter?.id) {
      await createNotification({
        recipientId: report.reporter.id,
        actorId: (req as any).user?.id || null,
        type: NotificationType.QuestionReportUpdated,
        entityType: 'question_report',
        entityId: report.id,
        payload: {
          report_id: report.id,
          status,
        }
      });
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update question report", details: error.message });
  }
});

// Get all Question Templates (Admin)
router.get('/templates/filters', authenticate, async (req, res) => {
  try {
    const visibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const templates = await prisma.questionTemplate.findMany({
      where: visibilityWhere,
      select: {
        template_type: true,
        difficulty: true,
        lesson_id: true,
        lesson: {
          select: {
            id: true,
            title_en: true,
            title_vi: true,
            grade: {
              select: {
                id: true,
                slug: true,
                title_en: true,
                title_vi: true,
              }
            }
          }
        }
      }
    });

    const templateTypes = Array.from(
      new Set(
        templates
          .map((template) => template.template_type)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b));

    const grades = Array.from(
      new Map(
        templates
          .filter((template) => template.lesson?.grade?.id)
          .map((template) => [
            String(template.lesson!.grade!.id),
            {
              id: String(template.lesson!.grade!.id),
              slug: template.lesson!.grade!.slug || "",
              title_en: template.lesson!.grade!.title_en,
              title_vi: template.lesson!.grade!.title_vi,
            }
          ])
      ).values()
    ).sort((a, b) => a.title_en.localeCompare(b.title_en));

    const lessons = Array.from(
      new Map(
        templates
          .filter((template) => template.lesson?.id)
          .map((template) => [
            template.lesson!.id,
            {
              id: template.lesson!.id,
              title_en: template.lesson!.title_en,
              title_vi: template.lesson!.title_vi,
              grade_id: template.lesson!.grade?.id ? String(template.lesson!.grade.id) : "",
            }
          ])
      ).values()
    ).sort((a, b) => a.title_en.localeCompare(b.title_en));

    res.json({
      templateTypes,
      grades,
      lessons,
      difficulties: ["easy", "medium", "hard"],
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch template filter metadata", details: error.message });
  }
});

router.get('/templates', authenticate, async (req, res) => {
  try {
    const visibilityWhere = await getVisibleTemplateWhereForViewer((req as any).user);
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 10);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const templateType = typeof req.query.templateType === 'string' ? req.query.templateType.trim() : '';
    const rawDifficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty.trim().toLowerCase() : '';
    const difficulty = rawDifficulty && rawDifficulty !== 'all' ? normalizeDifficulty(rawDifficulty) : '';
    const lessonId = typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : '';
    const gradeId = Number(req.query.gradeId);
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
    const filters = {
      ...(templateType && templateType !== 'all' ? { template_type: templateType } : {}),
      ...(difficulty && difficulty !== 'all' ? { difficulty } : {}),
      ...(lessonId && lessonId !== 'all' ? { lesson_id: lessonId } : {}),
      ...(Number.isInteger(gradeId) ? { lesson: { grade_id: gradeId } } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
    } as any;
    const searchFilter = search
      ? {
          OR: [
            { template_type: { contains: search, mode: 'insensitive' as const } },
            { body_template_en: { contains: search, mode: 'insensitive' as const } },
            { body_template_vi: { contains: search, mode: 'insensitive' as const } },
            { lesson_id: { contains: search, mode: 'insensitive' as const } },
            { lesson: { title_en: { contains: search, mode: 'insensitive' as const } } },
            { lesson: { title_vi: { contains: search, mode: 'insensitive' as const } } },
            { tags: { hasSome: [search] } }
          ]
        }
      : {};
    const where = {
      AND: [visibilityWhere, filters, searchFilter],
    } as any;
    const skip = (page - 1) * pageSize;
    const total = await prisma.questionTemplate.count({ where });
    const templates = await prisma.questionTemplate.findMany({
      where,
      include: {
        lesson: {
          include: {
            grade: true
          }
        }
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    });
    res.json({
      items: templates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasMore: skip + templates.length < total,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// Get one Question Template (Admin)
router.get('/templates/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const cacheKey = `question:template:${id}`;
    let template = await cacheGet<any>(cacheKey);

    if (!template) {
      template = await prisma.questionTemplate.findUnique({
        where: { id },
        include: {
          lesson: true,
          creator: {
            select: {
              learn_unit_id: true,
              role: { select: { name: true } }
            }
          }
        }
      });

      if (template) {
        await cacheSet(cacheKey, template, 3600);
      }
    }

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const hasAccess = template.lesson_id
      ? await canAccessLessonSubject(req, template.lesson_id)
      : await canAccessStandaloneTemplate((req as any).user, template);
    if (!hasAccess) {
      return res.status(403).json({ error: "You do not have access to this subject" });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch template", details: error.message });
  }
});

// Update a Question Template
router.put('/templates/:id', authenticate, authorize('manage', 'test'), async (req, res) => {
  try {
    const id = req.params.id as string;
    const {
      lesson_id, template_type, difficulty,
      body_template_en, body_template_vi,
      explanation_template_en, explanation_template_vi,
      logic_config, accepted_formulas, is_premium, tags
    } = req.body;

    const userRole = (req as any).user.role;
    const existingTemplate = await prisma.questionTemplate.findUnique({
      where: { id },
      include: {
        lesson: true,
        creator: {
          select: {
            learn_unit_id: true,
            role: { select: { name: true } }
          }
        }
      }
    });
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    const canAccessExistingTemplate = existingTemplate.lesson_id
      ? await canAccessLessonSubject(req, existingTemplate.lesson_id)
      : await canAccessStandaloneTemplate((req as any).user, existingTemplate);
    if (!canAccessExistingTemplate) {
      return res.status(403).json({ error: "You do not have access to this template" });
    }

    if (userRole !== "admin") {
      if (existingTemplate.lesson && await isCreatedByAdmin(existingTemplate.lesson.created_by)) {
        return res.status(403).json({ error: "Access denied: supervisors cannot modify question templates belonging to admin-created lessons" });
      }
      if (!existingTemplate.lesson && existingTemplate.creator?.role?.name === "admin") {
        return res.status(403).json({ error: "Access denied: you cannot modify admin-created global templates" });
      }
      if (lesson_id && lesson_id !== existingTemplate.lesson_id) {
        const targetLesson = await prisma.lesson.findUnique({
          where: { id: lesson_id }
        });
        if (targetLesson && await isCreatedByAdmin(targetLesson.created_by)) {
          return res.status(403).json({ error: "Access denied: supervisors cannot associate question templates with admin-created lessons" });
        }
      }
    }

    const theoreticalError = validateTheoreticalQuestion(template_type, logic_config, accepted_formulas);
    if (theoreticalError) return res.status(400).json({ error: theoreticalError });
    if (lesson_id && !(await canAccessLessonSubject(req, lesson_id))) {
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
        created_by: existingTemplate.created_by,
        is_premium: userRole === "admin" ? normalizeBooleanFlag(is_premium) : existingTemplate.is_premium,
        logic_config: logic_config || {},
        accepted_formulas: Array.isArray(accepted_formulas) ? accepted_formulas : [],
        tags: Array.isArray(tags) ? tags.map((t: any) => String(t || "").trim()).filter(Boolean) : []
      }
    });

    await cacheInvalidateQuestion(id);

    res.json(template);
  } catch (error: any) {
    console.error("Failed to update template:", error);
    res.status(500).json({ error: "Failed to update template", details: error.message });
  }
});

// Delete a Question Template
router.delete('/templates/:id', authenticate, authorize('manage', 'test'), async (req, res) => {
  try {
    const id = req.params.id as string;

    const userRole = (req as any).user.role;
    const existingTemplate = await prisma.questionTemplate.findUnique({
      where: { id },
      include: {
        lesson: true,
        creator: {
          select: {
            learn_unit_id: true,
            role: { select: { name: true } }
          }
        }
      }
    });
    if (!existingTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    const canAccessExistingTemplate = existingTemplate.lesson_id
      ? await canAccessLessonSubject(req, existingTemplate.lesson_id)
      : await canAccessStandaloneTemplate((req as any).user, existingTemplate);
    if (!canAccessExistingTemplate) {
      return res.status(403).json({ error: "You do not have access to this template" });
    }

    if (userRole !== "admin") {
      if (existingTemplate.lesson && await isCreatedByAdmin(existingTemplate.lesson.created_by)) {
        return res.status(403).json({ error: "Access denied: supervisors cannot delete question templates belonging to admin-created lessons" });
      }
      if (!existingTemplate.lesson && existingTemplate.creator?.role?.name === "admin") {
        return res.status(403).json({ error: "Access denied: you cannot delete admin-created global templates" });
      }
    }

    await prisma.questionTemplate.delete({ where: { id } });

    await cacheInvalidateQuestion(id);

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
