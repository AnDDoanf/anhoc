import { Router } from 'express';
import prisma from '../lib/db';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import * as MathService from '../services/mathService';
import { levelService } from '../services/levelService';

const router = Router();
const ACTIVE_CHALLENGE_LIMIT = 3;

// Helper: Generate unique 8-character game code
async function generateUniqueGameCode(): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  
  while (!isUnique) {
    code = 'G-';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existing = await prisma.gameChallenge.findUnique({
      where: { code }
    });
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
}

const toAttemptView = (attempt: {
  id: string;
  user_id: string | null;
  guest_name?: string | null;
  score: number;
  time_spent: number;
  completed_at: Date;
  user?: { username: string; email?: string } | null;
}) => ({
  id: attempt.id,
  user_id: attempt.user_id,
  guest_name: attempt.guest_name || null,
  display_name: attempt.user?.username || attempt.guest_name || 'Guest',
  score: attempt.score,
  time_spent: attempt.time_spent,
  completed_at: attempt.completed_at,
  user: attempt.user || null
});

// 1. Fetch available lessons and grades for gaming selection
router.get('/available', authenticate, async (req, res) => {
  try {
    // Lessons with templates
    const lessons = await prisma.lesson.findMany({
      where: {
        templates: {
          some: {}
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

    // Grades with templates
    const grades = await prisma.grade.findMany({
      where: {
        lessons: {
          some: {
            templates: { some: {} }
          }
        }
      },
      include: {
        subject: true,
        lessons: {
          where: {
            templates: { some: {} }
          },
          include: {
            _count: {
              select: { templates: true }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    res.json({ grades, lessons });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch available game content', details: error.message });
  }
});

// 2. Create a shareable challenge
router.post('/challenges', authenticate, async (req, res) => {
  const { game_type, lesson_id, grade_id } = req.body;
  const userId = (req as any).user.id;

  if (!game_type || (!lesson_id && !grade_id)) {
    return res.status(400).json({ error: 'game_type and either lesson_id or grade_id are required' });
  }

  try {
    const activeCreatedCount = await prisma.gameChallenge.count({
      where: {
        created_by: userId,
        is_active: true
      }
    });

    if (activeCreatedCount >= ACTIVE_CHALLENGE_LIMIT) {
      return res.status(400).json({
        error: `You can only keep ${ACTIVE_CHALLENGE_LIMIT} active created games at one time. Archive one before creating another.`,
        activeLimit: ACTIVE_CHALLENGE_LIMIT,
        activeCreatedCount
      });
    }

    // 1. Fetch templates in target area
    let templates: any[] = [];
    if (lesson_id) {
      templates = await prisma.questionTemplate.findMany({
        where: { lesson_id }
      });
    } else if (grade_id) {
      templates = await prisma.questionTemplate.findMany({
        where: { lesson: { grade_id: Number(grade_id) } }
      });
    }

    if (templates.length === 0) {
      return res.status(404).json({ error: 'No question templates found in the selected content area' });
    }

    // Shuffle and pick up to 15 templates
    const shuffledTemplates = templates.sort(() => 0.5 - Math.random());
    const selectedTemplates = shuffledTemplates.slice(0, Math.min(15, templates.length));

    // 2. Generate deterministic question config
    const questions = selectedTemplates.map((template) => {
      const isTheoretical = template.template_type === 'theoretical_question';
      const vars = isTheoretical ? {} : MathService.generateVars(template.logic_config);
      
      const right_answers = isTheoretical
        ? template.accepted_formulas.slice(0, 1).filter(Boolean)
        : template.accepted_formulas
            .map((f: string) => MathService.evaluateFormula(f, vars))
            .filter((ans: string | null) => ans !== null);

      return {
        template_id: template.id,
        template_type: template.template_type,
        body_template_en: template.body_template_en,
        body_template_vi: template.body_template_vi,
        logic_config: template.logic_config,
        accepted_formulas: template.accepted_formulas,
        generated_variables: vars,
        right_answers
      };
    });

    const code = await generateUniqueGameCode();

    // 3. Save GameChallenge
    const challenge = await prisma.gameChallenge.create({
      data: {
        code,
        game_type,
        lesson_id: lesson_id || null,
        grade_id: grade_id ? Number(grade_id) : null,
        created_by: userId,
        config: { questions }
      },
      include: {
        creator: { select: { username: true, email: true } },
        lesson: { select: { title_en: true, title_vi: true } },
        grade: { select: { title_en: true, title_vi: true } }
      }
    });

    res.status(201).json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create challenge', details: error.message });
  }
});

router.get('/mine', authenticate, async (req, res) => {
  const userId = (req as any).user.id as string;

  try {
    const [createdChallenges, attempts] = await Promise.all([
      prisma.gameChallenge.findMany({
        where: { created_by: userId },
        orderBy: { created_at: 'desc' },
        include: {
          lesson: { select: { title_en: true, title_vi: true } },
          grade: { select: { title_en: true, title_vi: true } },
          _count: { select: { attempts: true } },
          attempts: {
            orderBy: [
              { score: 'desc' },
              { time_spent: 'asc' }
            ],
            take: 1,
            select: {
              score: true,
              time_spent: true,
              completed_at: true
            }
          }
        }
      }),
      prisma.gameAttempt.findMany({
        where: { user_id: userId },
        orderBy: { completed_at: 'desc' },
        include: {
          challenge: {
            include: {
              creator: { select: { username: true } },
              lesson: { select: { title_en: true, title_vi: true } },
              grade: { select: { title_en: true, title_vi: true } }
            }
          }
        }
      })
    ]);

    const participatedByChallenge = new Map<string, any>();
    for (const attempt of attempts) {
      if (participatedByChallenge.has(attempt.challenge_id)) continue;
      participatedByChallenge.set(attempt.challenge_id, {
        attempt_id: attempt.id,
        challenge_id: attempt.challenge_id,
        completed_at: attempt.completed_at,
        score: attempt.score,
        time_spent: attempt.time_spent,
        challenge: {
          id: attempt.challenge.id,
          code: attempt.challenge.code,
          game_type: attempt.challenge.game_type,
          is_active: attempt.challenge.is_active,
          created_at: attempt.challenge.created_at,
          creator: attempt.challenge.creator,
          lesson: attempt.challenge.lesson,
          grade: attempt.challenge.grade
        }
      });
    }

    res.json({
      activeLimit: ACTIVE_CHALLENGE_LIMIT,
      activeCreatedCount: createdChallenges.filter((challenge) => challenge.is_active).length,
      created: createdChallenges.map((challenge) => ({
        id: challenge.id,
        code: challenge.code,
        game_type: challenge.game_type,
        is_active: challenge.is_active,
        created_at: challenge.created_at,
        lesson: challenge.lesson,
        grade: challenge.grade,
        attempt_count: challenge._count.attempts,
        best_attempt: challenge.attempts[0] || null
      })),
      participated: Array.from(participatedByChallenge.values())
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch personal game lists', details: error.message });
  }
});

router.patch('/challenges/:id/archive', authenticate, async (req, res) => {
  const userId = (req as any).user.id as string;
  const challengeId = req.params.id as string;

  try {
    const challenge = await prisma.gameChallenge.findUnique({
      where: { id: challengeId },
      select: { id: true, created_by: true, is_active: true }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.created_by !== userId) {
      return res.status(403).json({ error: 'You can only archive your own challenges' });
    }

    if (!challenge.is_active) {
      return res.json({ success: true, alreadyArchived: true });
    }

    await prisma.gameChallenge.update({
      where: { id: challengeId },
      data: { is_active: false }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to archive challenge', details: error.message });
  }
});

// 3. Fetch challenge by code with details & attempts
router.get('/challenges/:code', optionalAuthenticate, async (req, res) => {
  const code = (req.params.code as string).toUpperCase();

  try {
    const challenge = await prisma.gameChallenge.findUnique({
      where: { code },
      include: {
        creator: { select: { username: true, email: true } },
        lesson: { select: { title_en: true, title_vi: true } },
        grade: { select: { title_en: true, title_vi: true } },
        attempts: {
          orderBy: [
            { score: 'desc' },
            { time_spent: 'asc' }
          ],
          include: {
            user: { select: { username: true, email: true } }
          }
        }
      }
    });

    if (!challenge) {
      return res.status(404).json({ error: `Challenge with code ${code} not found` });
    }

    res.json({
      ...challenge,
      attempts: challenge.attempts.map(toAttemptView)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch challenge details', details: error.message });
  }
});

// 4. Submit attempt and earn XP
router.post('/attempts', optionalAuthenticate, async (req, res) => {
  const { challenge_id, score, time_spent, guest_name, guest_token } = req.body;
  const userId = (req as any).user?.id as string | undefined;
  const trimmedGuestName = typeof guest_name === 'string' ? guest_name.trim() : '';
  const trimmedGuestToken = typeof guest_token === 'string' ? guest_token.trim() : '';

  if (!challenge_id || score === undefined || time_spent === undefined) {
    return res.status(400).json({ error: 'challenge_id, score, and time_spent are required' });
  }

  if (!userId && (!trimmedGuestName || !trimmedGuestToken)) {
    return res.status(400).json({ error: 'Guest participants must provide a name and token' });
  }

  try {
    const challenge = await prisma.gameChallenge.findUnique({
      where: { id: challenge_id }
    });

    if (!challenge) {
      return res.status(404).json({ error: 'Target challenge does not exist' });
    }

    if (!challenge.is_active) {
      return res.status(400).json({ error: 'This shared game is no longer available' });
    }

    if (!userId) {
      const existingGuestAttempt = await prisma.gameAttempt.findFirst({
        where: {
          challenge_id,
          guest_token: trimmedGuestToken
        }
      });

      if (existingGuestAttempt) {
        return res.status(400).json({ error: 'Guests can only participate one time per shared game' });
      }
    }

    // Calculate XP rewards dynamically based on game type
    let xpEarned = 0;
    let logReason = 'game_completion';

    if (challenge.game_type === 'speed') {
      // Speed Math: 3 XP per correct answer, max 100 XP
      xpEarned = Math.min(100, score * 3);
      logReason = 'speed_math_game';
    } else if (challenge.game_type === 'climb') {
      // Endless Climb: 10 XP per floor, max 100 XP
      xpEarned = Math.min(100, score * 10);
      logReason = 'tower_climb_game';
    } else if (challenge.game_type === 'match') {
      // Formula Match: time-dependent reward, max 100 XP, min 20 XP on successful match
      xpEarned = Math.max(20, Math.min(100, Math.floor((300 - time_spent) * 0.5)));
      logReason = 'formula_match_game';
    }

    // Save GameAttempt
    const attempt = await prisma.gameAttempt.create({
      data: {
        challenge_id,
        user_id: userId || null,
        guest_name: userId ? null : trimmedGuestName,
        guest_token: userId ? null : trimmedGuestToken,
        score: Number(score),
        time_spent: Number(time_spent)
      },
      include: {
        user: { select: { username: true } }
      }
    });

    // Add XP
    if (userId && xpEarned > 0) {
      await levelService.addXp(userId, xpEarned, logReason);
    }

    res.json({ attempt: toAttemptView(attempt), xpEarned, isGuest: !userId });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Guests can only participate one time per shared game' });
    }
    res.status(500).json({ error: 'Failed to submit attempt', details: error.message });
  }
});

// 5. Global Leaderboards
router.get('/global-leaderboard', authenticate, async (req, res) => {
  try {
    const fetchTopAttempts = async (gameType: string) => {
      return await prisma.gameAttempt.findMany({
        where: { challenge: { game_type: gameType } },
        take: 10,
        orderBy: [
          { score: 'desc' },
          { time_spent: 'asc' }
        ],
        include: {
          user: {
            select: { username: true }
          },
          challenge: {
            select: {
              lesson: { select: { title_en: true, title_vi: true } },
              grade: { select: { title_en: true, title_vi: true } }
            }
          }
        }
      });
    };

    const speed = await fetchTopAttempts('speed');
    const climb = await fetchTopAttempts('climb');
    const match = await fetchTopAttempts('match');

    res.json({ speed, climb, match });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch global leaderboard', details: error.message });
  }
});

export default router;
