// eslint-disable-next-line @typescript-eslint/no-explicit-any
import prisma from '../lib/db';
import { levelService } from './levelService';

// ─── Achievement Definitions ────────────────────────────────────────────────
// Using `db: any` to bypass stale Prisma type issues — fields like is_practice,
// lesson_id, and lesson ARE in the schema and DB; the TS client just needs refresh.

interface AchievementDef {
  slug: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  category: string;
  xp_reward: number;
  icon: string;
  check: (userId: string, db: any, context?: any) => Promise<boolean>;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ── PROGRESS ──────────────────────────────────────────────────────────────
  {
    slug: 'first-step',
    title_en: 'First Step', title_vi: 'Bước Đầu Tiên',
    description_en: 'Complete your very first practice session.',
    description_vi: 'Hoàn thành phiên luyện tập đầu tiên của bạn.',
    category: 'progress', xp_reward: 50, icon: 'Footprints',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 1,
  },
  {
    slug: 'getting-warmed-up',
    title_en: 'Getting Warmed Up', title_vi: 'Đang Khởi Động',
    description_en: 'Complete 5 practice sessions.',
    description_vi: 'Hoàn thành 5 phiên luyện tập.',
    category: 'progress', xp_reward: 100, icon: 'Flame',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 5,
  },
  {
    slug: 'on-a-roll',
    title_en: 'On a Roll', title_vi: 'Đang Thăng Hoa',
    description_en: 'Complete 10 practice sessions.',
    description_vi: 'Hoàn thành 10 phiên luyện tập.',
    category: 'progress', xp_reward: 150, icon: 'Zap',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 10,
  },
  {
    slug: 'halfway-there',
    title_en: 'Halfway There', title_vi: 'Nửa Chặng Đường',
    description_en: 'Practice at least 5 different lessons.',
    description_vi: 'Luyện tập ít nhất 5 bài học khác nhau.',
    category: 'progress', xp_reward: 200, icon: 'Target',
    check: async (uid, db) => {
      const all: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true } });
      const unique = new Set(all.map((a: any) => a.lesson_id).filter(Boolean));
      return unique.size >= 5;
    },
  },
  {
    slug: 'course-finisher',
    title_en: 'Course Finisher', title_vi: 'Hoàn Thành Khóa Học',
    description_en: 'Practice all lessons of at least one grade.',
    description_vi: 'Luyện tập tất cả bài học của ít nhất một lớp.',
    category: 'progress', xp_reward: 400, icon: 'BookCheck',
    check: async (uid, db) => {
      const grades = await db.grade.findMany({ include: { lessons: { select: { id: true } } } });
      const attempted: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true } });
      const attemptedIds = new Set(attempted.map((a: any) => a.lesson_id));
      return (grades as any[]).some((g: any) => g.lessons.length > 0 && g.lessons.every((l: any) => attemptedIds.has(l.id)));
    },
  },
  {
    slug: 'master-learner',
    title_en: 'Master Learner', title_vi: 'Học Sinh Xuất Sắc',
    description_en: 'Practice every lesson in the entire curriculum.',
    description_vi: 'Luyện tập tất cả bài học trong toàn bộ chương trình.',
    category: 'progress', xp_reward: 1000, icon: 'GraduationCap',
    check: async (uid, db) => {
      const totalLessons = await db.lesson.count();
      const attempted: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true } });
      const unique = new Set(attempted.map((a: any) => a.lesson_id).filter(Boolean));
      return totalLessons > 0 && unique.size >= totalLessons;
    },
  },
  {
    slug: 'completionist',
    title_en: 'Completionist', title_vi: 'Người Hoàn Hảo',
    description_en: 'Earn 10 or more other achievements.',
    description_vi: 'Nhận được 10 thành tích trở lên.',
    category: 'progress', xp_reward: 2000, icon: 'Trophy',
    check: async (uid, db) => (await db.userAchievement.count({ where: { user_id: uid } })) >= 10,
  },
  // ── PERFORMANCE ───────────────────────────────────────────────────────────
  {
    slug: 'high-scorer',
    title_en: 'High Scorer', title_vi: 'Điểm Cao',
    description_en: 'Score 80% or higher in a practice session.',
    description_vi: 'Đạt 80% trở lên trong một phiên luyện tập.',
    category: 'performance', xp_reward: 100, icon: 'Star',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, total_score: { gte: 80 } } })) >= 1,
  },
  {
    slug: 'top-performer',
    title_en: 'Top Performer', title_vi: 'Hiệu Suất Đỉnh Cao',
    description_en: 'Score 90% or higher in a practice session.',
    description_vi: 'Đạt 90% trở lên trong một phiên luyện tập.',
    category: 'performance', xp_reward: 200, icon: 'Award',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, total_score: { gte: 90 } } })) >= 1,
  },
  {
    slug: 'perfect-score',
    title_en: 'Perfect Score', title_vi: 'Điểm Tuyệt Đối',
    description_en: 'Score 100% in a practice session.',
    description_vi: 'Đạt 100% trong một phiên luyện tập.',
    category: 'performance', xp_reward: 300, icon: 'Crown',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, total_score: { gte: 100 } } })) >= 1,
  },
  {
    slug: 'first-try',
    title_en: 'First Try', title_vi: 'Ngay Lần Đầu',
    description_en: 'Score 100% on the very first attempt of any lesson.',
    description_vi: 'Đạt 100% ngay trong lần thử đầu tiên của bất kỳ bài học nào.',
    category: 'performance', xp_reward: 350, icon: 'Rocket',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true, started_at: true, total_score: true }, orderBy: { started_at: 'asc' } });
      const seenLessons = new Set<string>();
      for (const a of attempts) {
        if (!a.lesson_id) continue;
        if (!seenLessons.has(a.lesson_id)) {
          seenLessons.add(a.lesson_id);
          if (Number(a.total_score) >= 100) return true;
        }
      }
      return false;
    },
  },
  {
    slug: 'no-mistakes',
    title_en: 'No Mistakes', title_vi: 'Không Sai Sót',
    description_en: 'Answer every question correctly in a single session.',
    description_vi: 'Trả lời đúng tất cả câu hỏi trong một phiên duy nhất.',
    category: 'performance', xp_reward: 250, icon: 'Shield',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { id: true } });
      for (const a of attempts) {
        const snaps: any[] = await db.questionSnapshot.findMany({ where: { attempt_id: a.id } });
        if (snaps.length > 0 && snaps.every((s: any) => s.is_correct)) return true;
      }
      return false;
    },
  },
  {
    slug: 'comeback-kid',
    title_en: 'Comeback Kid', title_vi: 'Lội Ngược Dòng',
    description_en: 'Improve your score on a retry of the same lesson.',
    description_vi: 'Cải thiện điểm số khi thử lại cùng một bài học.',
    category: 'performance', xp_reward: 150, icon: 'TrendingUp',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true, started_at: true, total_score: true }, orderBy: { started_at: 'asc' } });
      const byLesson: Record<string, any[]> = {};
      for (const a of attempts) {
        if (!a.lesson_id) continue;
        if (!byLesson[a.lesson_id]) byLesson[a.lesson_id] = [];
        byLesson[a.lesson_id].push(a);
      }
      for (const list of Object.values(byLesson)) {
        for (let i = 1; i < list.length; i++) {
          if (Number(list[i].total_score) > Number(list[i - 1].total_score)) return true;
        }
      }
      return false;
    },
  },
  // ── STREAK ────────────────────────────────────────────────────────────────
  {
    slug: 'day-1-streak',
    title_en: 'Day 1 Streak', title_vi: 'Ngày Đầu Tiên',
    description_en: 'Practice on your first day.',
    description_vi: 'Luyện tập vào ngày đầu tiên.',
    category: 'streak', xp_reward: 25, icon: 'Calendar',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 1,
  },
  {
    slug: 'weekly-warrior',
    title_en: 'Weekly Warrior', title_vi: 'Chiến Binh Tuần',
    description_en: 'Practice on 7 different days.',
    description_vi: 'Luyện tập trong 7 ngày khác nhau.',
    category: 'streak', xp_reward: 300, icon: 'Swords',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      const days = new Set(attempts.filter((a: any) => a.completed_at).map((a: any) => a.completed_at.toISOString().split('T')[0]));
      return days.size >= 7;
    },
  },
  {
    slug: 'unstoppable',
    title_en: 'Unstoppable', title_vi: 'Không Thể Ngăn Cản',
    description_en: 'Practice on 30 different days.',
    description_vi: 'Luyện tập trong 30 ngày khác nhau.',
    category: 'streak', xp_reward: 1000, icon: 'Infinity',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      const days = new Set(attempts.filter((a: any) => a.completed_at).map((a: any) => a.completed_at.toISOString().split('T')[0]));
      return days.size >= 30;
    },
  },
  // ── TIME ──────────────────────────────────────────────────────────────────
  {
    slug: 'early-bird',
    title_en: 'Early Bird', title_vi: 'Chim Sớm',
    description_en: 'Complete a practice session before 8 AM.',
    description_vi: 'Hoàn thành một phiên luyện tập trước 8 giờ sáng.',
    category: 'time', xp_reward: 75, icon: 'Sunrise',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      return attempts.some((a: any) => a.completed_at && a.completed_at.getHours() < 8);
    },
  },
  {
    slug: 'night-owl',
    title_en: 'Night Owl', title_vi: 'Cú Đêm',
    description_en: 'Complete a practice session after 10 PM.',
    description_vi: 'Hoàn thành một phiên luyện tập sau 10 giờ đêm.',
    category: 'time', xp_reward: 75, icon: 'Moon',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      return attempts.some((a: any) => a.completed_at && a.completed_at.getHours() >= 22);
    },
  },
  {
    slug: 'focused-mind',
    title_en: 'Focused Mind', title_vi: 'Tập Trung Tuyệt Đối',
    description_en: 'Complete at least 3 practice sessions.',
    description_vi: 'Hoàn thành ít nhất 3 phiên luyện tập.',
    category: 'time', xp_reward: 120, icon: 'Brain',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 3,
  },
  {
    slug: 'marathon-learner',
    title_en: 'Marathon Learner', title_vi: 'Học Sinh Marathon',
    description_en: 'Complete 5 or more practice sessions in a single day.',
    description_vi: 'Hoàn thành 5 phiên luyện tập trở lên trong một ngày.',
    category: 'time', xp_reward: 200, icon: 'Timer',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      const byday: Record<string, number> = {};
      attempts.forEach((a: any) => { if (a.completed_at) { const d = (a.completed_at as Date).toISOString().split('T')[0]; byday[d] = (byday[d] || 0) + 1; } });
      return Object.values(byday).some(c => c >= 5);
    },
  },
  {
    slug: 'quick-start',
    title_en: 'Quick Start', title_vi: 'Khởi Đầu Nhanh',
    description_en: 'Complete your first practice session within 24 hours of joining.',
    description_vi: 'Hoàn thành phiên luyện tập đầu tiên trong vòng 24 giờ kể từ khi đăng ký.',
    category: 'time', xp_reward: 100, icon: 'Gauge',
    check: async (uid, db) => {
      const user = await db.user.findUnique({ where: { id: uid } });
      if (!user) return false;
      const first: any = await db.testAttempt.findFirst({ where: { user_id: uid, is_completed: true, is_practice: true }, orderBy: { started_at: 'asc' } });
      if (!first) return false;
      return (first.started_at.getTime() - user.created_at.getTime()) < 24 * 60 * 60 * 1000;
    },
  },
  // ── SPEED ─────────────────────────────────────────────────────────────────
  {
    slug: 'speed-runner',
    title_en: 'Speed Runner', title_vi: 'Chạy Nhanh',
    description_en: 'Complete a practice session in under 3 minutes.',
    description_vi: 'Hoàn thành một phiên luyện tập trong vòng 3 phút.',
    category: 'speed', xp_reward: 150, icon: 'Wind',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { started_at: true, completed_at: true } });
      return attempts.some((a: any) => a.completed_at && (a.completed_at.getTime() - a.started_at.getTime()) < 3 * 60 * 1000);
    },
  },
  {
    slug: 'fast-learner',
    title_en: 'Fast Learner', title_vi: 'Học Nhanh',
    description_en: 'Complete 3 practice sessions in a single day.',
    description_vi: 'Hoàn thành 3 phiên luyện tập trong một ngày duy nhất.',
    category: 'speed', xp_reward: 175, icon: 'BatteryCharging',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, select: { completed_at: true } });
      const byday: Record<string, number> = {};
      attempts.forEach((a: any) => { if (a.completed_at) { const d = (a.completed_at as Date).toISOString().split('T')[0]; byday[d] = (byday[d] || 0) + 1; } });
      return Object.values(byday).some(c => c >= 3);
    },
  },
  // ── SOCIAL / EXPLORATION ──────────────────────────────────────────────────
  {
    slug: 'first-interaction',
    title_en: 'First Interaction', title_vi: 'Tương Tác Đầu Tiên',
    description_en: 'Submit your first answer in a practice session.',
    description_vi: 'Nộp câu trả lời đầu tiên trong phiên luyện tập.',
    category: 'social', xp_reward: 25, icon: 'MessageSquare',
    check: async (uid, db) => (await db.questionSnapshot.count({ where: { attempt: { user_id: uid }, student_answer: { not: null } } })) >= 1,
  },
  {
    slug: 'helpful-learner',
    title_en: 'Helpful Learner', title_vi: 'Học Sinh Tốt Bụng',
    description_en: 'Complete 3 practice sessions and keep learning.',
    description_vi: 'Hoàn thành 3 bài luyện tập và tiếp tục học.',
    category: 'social', xp_reward: 100, icon: 'Heart',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } })) >= 3,
  },
  {
    slug: 'contributor',
    title_en: 'Contributor', title_vi: 'Người Đóng Góp',
    description_en: 'Submit evidence for at least one practice session.',
    description_vi: 'Nộp bằng chứng cho ít nhất một phiên luyện tập.',
    category: 'social', xp_reward: 150, icon: 'PenTool',
    check: async (uid, db) => (await db.activityEvidence.count({ where: { user_id: uid } })) >= 1,
  },
  {
    slug: 'explorer',
    title_en: 'Explorer', title_vi: 'Nhà Khám Phá',
    description_en: 'Practice lessons from at least 3 different grades.',
    description_vi: 'Luyện tập bài học từ ít nhất 3 lớp học khác nhau.',
    category: 'social', xp_reward: 200, icon: 'Compass',
    check: async (uid, db, context?: any) => {
      // Use pre-fetched attempts if available
      const attempts = context?.attempts || await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, include: { lesson: true } });
      const grades = new Set(attempts.map((a: any) => a.lesson?.grade_id).filter(Boolean));
      return grades.size >= 3;
    },
  },
  {
    slug: 'curious-mind',
    title_en: 'Curious Mind', title_vi: 'Tâm Trí Tò Mò',
    description_en: 'Practice 5 or more different lessons.',
    description_vi: 'Luyện tập 5 bài học trở lên.',
    category: 'social', xp_reward: 100, icon: 'Sparkles',
    check: async (uid, db, context?: any) => {
      const attempts = context?.attempts || await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true }, select: { lesson_id: true } });
      const unique = new Set(attempts.map((a: any) => a.lesson_id).filter(Boolean));
      return unique.size >= 5;
    },
  },
  // ── RECOVERY ─────────────────────────────────────────────────────────────
  {
    slug: 'back-on-track',
    title_en: 'Back on Track', title_vi: 'Trở Lại Đúng Hướng',
    description_en: 'Return and practice after 7+ days of no activity.',
    description_vi: 'Quay lại luyện tập sau 7+ ngày không hoạt động.',
    category: 'recovery', xp_reward: 200, icon: 'RefreshCw',
    check: async (uid, db) => {
      const attempts: any[] = await db.testAttempt.findMany({ where: { user_id: uid, is_completed: true, is_practice: true }, orderBy: { completed_at: 'asc' }, select: { completed_at: true } });
      if (attempts.length < 2) return false;
      for (let i = 1; i < attempts.length; i++) {
        const prev = attempts[i - 1].completed_at as Date | null;
        const curr = attempts[i].completed_at as Date | null;
        if (prev && curr && (curr.getTime() - prev.getTime()) > 7 * 24 * 60 * 60 * 1000) return true;
      }
      return false;
    },
  },
  {
    slug: 'perfectionist',
    title_en: 'Perfectionist', title_vi: 'Người Cầu Toàn',
    description_en: 'Score 100% in 5 different practice sessions.',
    description_vi: 'Đạt 100% trong 5 phiên luyện tập khác nhau.',
    category: 'recovery', xp_reward: 500, icon: 'Diamond',
    check: async (uid, db) => (await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true, total_score: { gte: 100 } } })) >= 5,
  },
];

// ─── Seed achievements into DB ────────────────────────────────────────────────

export async function seedAchievements() {
  for (const def of ACHIEVEMENT_DEFS) {
    await (prisma as any).achievement.upsert({
      where: { slug: def.slug },
      update: { title_en: def.title_en, title_vi: def.title_vi, description_en: def.description_en, description_vi: def.description_vi, category: def.category, xp_reward: def.xp_reward, icon: def.icon },
      create: { slug: def.slug, title_en: def.title_en, title_vi: def.title_vi, description_en: def.description_en, description_vi: def.description_vi, category: def.category, xp_reward: def.xp_reward, icon: def.icon },
    });
  }
}

// ─── Check and award achievements for a user ──────────────────────────────────

export interface NewAchievement { 
  slug: string; 
  title_en: string; 
  title_vi: string; 
  icon: string | null; 
  xp_reward: number; 
}

export async function checkAndAwardAchievements(userId: string): Promise<NewAchievement[]> {
  // 1. Pre-fetch essential data to avoid "N+1" query explosion inside the loop
  const [earned, allAttempts, user] = await Promise.all([
    (prisma as any).userAchievement.findMany({ 
      where: { user_id: userId }, 
      include: { achievement: { select: { slug: true } } } 
    }),
    (prisma as any).testAttempt.findMany({ 
      where: { user_id: userId, is_completed: true },
      include: { lesson: true }
    }),
    (prisma as any).user.findUnique({ where: { id: userId } })
  ]);

  const earnedSlugs = new Set((earned as any[]).map((e: any) => e.achievement.slug));
  const newlyEarned: NewAchievement[] = [];

  // Create context for optimized checks
  const context = {
    userId,
    attempts: allAttempts as any[],
    user: user as any
  };

  for (const def of ACHIEVEMENT_DEFS) {
    if (earnedSlugs.has(def.slug)) continue;

    try {
      const qualifies = await def.check(userId, prisma, context);
      if (!qualifies) continue;

      const achievement = await (prisma as any).achievement.findUnique({ where: { slug: def.slug } });
      if (!achievement) continue;

      // Award achievement
      await (prisma as any).userAchievement.create({ 
        data: { user_id: userId, achievement_id: achievement.id } 
      });

      // Use levelService to keep XP and Level in sync!
      if (achievement.xp_reward > 0) {
        await levelService.addXp(userId, achievement.xp_reward, `achievement:${def.slug}`);
      }

      newlyEarned.push({
        slug: achievement.slug,
        title_en: achievement.title_en,
        title_vi: achievement.title_vi,
        icon: achievement.icon,
        xp_reward: achievement.xp_reward
      });
    } catch (e) {
      console.error(`Achievement check failed [${def.slug}]:`, e);
    }
  }

  return newlyEarned;
}
