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

const countCompletedPractices = async (uid: string, db: any) =>
  await db.testAttempt.count({ where: { user_id: uid, is_completed: true, is_practice: true } });

const countUniqueLessonsPracticed = async (uid: string, db: any, context?: any) => {
  const attempts = context?.attempts || await db.testAttempt.findMany({
    where: { user_id: uid, is_completed: true },
    select: { lesson_id: true }
  });
  return new Set(attempts.map((a: any) => a.lesson_id).filter(Boolean)).size;
};

const countDistinctGradesPracticed = async (uid: string, db: any, context?: any) => {
  const attempts = context?.attempts || await db.testAttempt.findMany({
    where: { user_id: uid, is_completed: true },
    include: { lesson: true }
  });
  return new Set(attempts.map((a: any) => a.lesson?.grade_id).filter(Boolean)).size;
};

const countPracticeDays = async (uid: string, db: any) => {
  const attempts: any[] = await db.testAttempt.findMany({
    where: { user_id: uid, is_completed: true, is_practice: true },
    select: { completed_at: true }
  });
  return new Set(
    attempts
      .filter((a: any) => a.completed_at)
      .map((a: any) => a.completed_at.toISOString().split('T')[0])
  ).size;
};

const countScoreThresholdAttempts = async (uid: string, db: any, threshold: number) =>
  await db.testAttempt.count({
    where: { user_id: uid, is_completed: true, is_practice: true, total_score: { gte: threshold } }
  });

const countEvidenceUploads = async (uid: string, db: any) =>
  await db.activityEvidence.count({ where: { user_id: uid } });

const practiceMilestoneDefs: AchievementDef[] = [
  { slug: 'practice-15', count: 15, xp: 180, icon: 'NotebookPen', titleEn: 'Practice Apprentice', titleVi: 'Học Việc Luyện Tập' },
  { slug: 'practice-20', count: 20, xp: 220, icon: 'NotebookPen', titleEn: 'Practice Builder', titleVi: 'Người Xây Nền' },
  { slug: 'practice-25', count: 25, xp: 260, icon: 'Flame', titleEn: 'Practice Charger', titleVi: 'Đà Tăng Tốc' },
  { slug: 'practice-30', count: 30, xp: 320, icon: 'Flame', titleEn: 'Practice Sprinter', titleVi: 'Nước Rút Luyện Tập' },
  { slug: 'practice-40', count: 40, xp: 420, icon: 'Zap', titleEn: 'Practice Engine', titleVi: 'Cỗ Máy Luyện Tập' },
  { slug: 'practice-50', count: 50, xp: 550, icon: 'Zap', titleEn: 'Practice Veteran', titleVi: 'Cựu Binh Luyện Tập' },
  { slug: 'practice-60', count: 60, xp: 650, icon: 'Rocket', titleEn: 'Practice Rocket', titleVi: 'Tên Lửa Luyện Tập' },
  { slug: 'practice-75', count: 75, xp: 800, icon: 'Rocket', titleEn: 'Practice Commander', titleVi: 'Chỉ Huy Luyện Tập' },
  { slug: 'practice-100', count: 100, xp: 1100, icon: 'Trophy', titleEn: 'Century Session', titleVi: 'Trăm Phiên Luyện Tập' },
  { slug: 'practice-150', count: 150, xp: 1500, icon: 'Trophy', titleEn: 'Practice Legend', titleVi: 'Huyền Thoại Luyện Tập' },
  { slug: 'practice-200', count: 200, xp: 2200, icon: 'Crown', titleEn: 'Practice Titan', titleVi: 'Titan Luyện Tập' },
  { slug: 'practice-300', count: 300, xp: 3200, icon: 'Crown', titleEn: 'Endless Practice', titleVi: 'Luyện Tập Bất Tận' },
  { slug: 'practice-400', count: 400, xp: 4500, icon: 'Sparkles', titleEn: 'Practice Mythic', titleVi: 'Thần Thoại Luyện Tập' },
  { slug: 'practice-500', count: 500, xp: 6000, icon: 'Sparkles', titleEn: 'Practice Immortal', titleVi: 'Bất Tử Luyện Tập' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Complete ${milestone.count} practice sessions.`,
  description_vi: `Hoàn thành ${milestone.count} phiên luyện tập.`,
  category: 'progress',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => (await countCompletedPractices(uid, db)) >= milestone.count,
}));

const uniqueLessonMilestoneDefs: AchievementDef[] = [
  { slug: 'lessons-8', count: 8, xp: 160, icon: 'Target', titleEn: 'Lesson Explorer I', titleVi: 'Nhà Khám Phá Bài Học I' },
  { slug: 'lessons-10', count: 10, xp: 220, icon: 'Target', titleEn: 'Lesson Explorer II', titleVi: 'Nhà Khám Phá Bài Học II' },
  { slug: 'lessons-15', count: 15, xp: 320, icon: 'Compass', titleEn: 'Lesson Explorer III', titleVi: 'Nhà Khám Phá Bài Học III' },
  { slug: 'lessons-20', count: 20, xp: 430, icon: 'Compass', titleEn: 'Lesson Pathfinder', titleVi: 'Người Mở Đường Bài Học' },
  { slug: 'lessons-30', count: 30, xp: 620, icon: 'Map', titleEn: 'Lesson Voyager', titleVi: 'Lữ Hành Bài Học' },
  { slug: 'lessons-40', count: 40, xp: 850, icon: 'Map', titleEn: 'Lesson Trailblazer', titleVi: 'Người Khai Lối Bài Học' },
  { slug: 'lessons-50', count: 50, xp: 1150, icon: 'BookOpenCheck', titleEn: 'Lesson Scholar', titleVi: 'Học Giả Bài Học' },
  { slug: 'lessons-75', count: 75, xp: 1600, icon: 'BookOpenCheck', titleEn: 'Curriculum Conqueror', titleVi: 'Người Chinh Phục Chương Trình' },
  { slug: 'lessons-100', count: 100, xp: 2400, icon: 'LibraryBig', titleEn: 'Archive of Lessons', titleVi: 'Kho Tàng Bài Học' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Practice at least ${milestone.count} different lessons.`,
  description_vi: `Luyện tập ít nhất ${milestone.count} bài học khác nhau.`,
  category: 'progress',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any, context?: any) => (await countUniqueLessonsPracticed(uid, db, context)) >= milestone.count,
}));

const gradeMilestoneDefs: AchievementDef[] = [
  { slug: 'grades-4', count: 4, xp: 180, icon: 'School', titleEn: 'Grade Hopper I', titleVi: 'Bước Qua Các Khối I' },
  { slug: 'grades-5', count: 5, xp: 240, icon: 'School', titleEn: 'Grade Hopper II', titleVi: 'Bước Qua Các Khối II' },
  { slug: 'grades-6', count: 6, xp: 320, icon: 'GraduationCap', titleEn: 'Grade Hopper III', titleVi: 'Bước Qua Các Khối III' },
  { slug: 'grades-7', count: 7, xp: 420, icon: 'GraduationCap', titleEn: 'Across the Grades', titleVi: 'Xuyên Suốt Các Khối' },
  { slug: 'grades-8', count: 8, xp: 560, icon: 'Landmark', titleEn: 'Schoolwide Explorer', titleVi: 'Nhà Khám Phá Toàn Trường' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Practice lessons from at least ${milestone.count} different grades.`,
  description_vi: `Luyện tập bài học từ ít nhất ${milestone.count} khối lớp khác nhau.`,
  category: 'social',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any, context?: any) => (await countDistinctGradesPracticed(uid, db, context)) >= milestone.count,
}));

const practiceDayMilestoneDefs: AchievementDef[] = [
  { slug: 'days-10', count: 10, xp: 180, icon: 'CalendarRange', titleEn: 'Ten-Day Learner', titleVi: 'Người Học Mười Ngày' },
  { slug: 'days-14', count: 14, xp: 260, icon: 'CalendarRange', titleEn: 'Two-Week Rhythm', titleVi: 'Nhịp Học Hai Tuần' },
  { slug: 'days-21', count: 21, xp: 360, icon: 'CalendarCheck2', titleEn: 'Habit Builder', titleVi: 'Người Xây Thói Quen' },
  { slug: 'days-30', count: 30, xp: 500, icon: 'CalendarCheck2', titleEn: 'Thirty-Day Focus', titleVi: 'Tập Trung Ba Mươi Ngày' },
  { slug: 'days-45', count: 45, xp: 700, icon: 'CalendarHeart', titleEn: 'Steady Learner', titleVi: 'Người Học Bền Bỉ' },
  { slug: 'days-60', count: 60, xp: 950, icon: 'CalendarHeart', titleEn: 'Two-Month Momentum', titleVi: 'Đà Học Hai Tháng' },
  { slug: 'days-90', count: 90, xp: 1400, icon: 'CalendarDays', titleEn: 'Ninety-Day Discipline', titleVi: 'Kỷ Luật Chín Mươi Ngày' },
  { slug: 'days-120', count: 120, xp: 2000, icon: 'CalendarDays', titleEn: 'Seasoned Streaker', titleVi: 'Chuỗi Dài Dạn Dày' },
  { slug: 'days-180', count: 180, xp: 3200, icon: 'CalendarSync', titleEn: 'Half-Year Habit', titleVi: 'Thói Quen Nửa Năm' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Practice on ${milestone.count} different days.`,
  description_vi: `Luyện tập trong ${milestone.count} ngày khác nhau.`,
  category: 'streak',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => (await countPracticeDays(uid, db)) >= milestone.count,
}));

const scoreMilestoneDefs: AchievementDef[] = [
  { slug: 'score80-5', threshold: 80, count: 5, xp: 180, icon: 'Star', titleEn: 'High Scorer Streak I', titleVi: 'Chuỗi Điểm Cao I' },
  { slug: 'score80-10', threshold: 80, count: 10, xp: 320, icon: 'Star', titleEn: 'High Scorer Streak II', titleVi: 'Chuỗi Điểm Cao II' },
  { slug: 'score90-3', threshold: 90, count: 3, xp: 220, icon: 'Award', titleEn: 'Top Performer I', titleVi: 'Hiệu Suất Đỉnh Cao I' },
  { slug: 'score90-5', threshold: 90, count: 5, xp: 380, icon: 'Award', titleEn: 'Top Performer II', titleVi: 'Hiệu Suất Đỉnh Cao II' },
  { slug: 'score90-10', threshold: 90, count: 10, xp: 700, icon: 'Medal', titleEn: 'Top Performer III', titleVi: 'Hiệu Suất Đỉnh Cao III' },
  { slug: 'perfect-3', threshold: 100, count: 3, xp: 420, icon: 'Crown', titleEn: 'Perfect Score I', titleVi: 'Điểm Tuyệt Đối I' },
  { slug: 'perfect-10', threshold: 100, count: 10, xp: 950, icon: 'Crown', titleEn: 'Perfect Score II', titleVi: 'Điểm Tuyệt Đối II' },
  { slug: 'perfect-20', threshold: 100, count: 20, xp: 1800, icon: 'Gem', titleEn: 'Perfect Score III', titleVi: 'Điểm Tuyệt Đối III' },
  { slug: 'score80-25', threshold: 80, count: 25, xp: 1200, icon: 'BadgeCheck', titleEn: 'High Scorer Streak III', titleVi: 'Chuỗi Điểm Cao III' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Score at least ${milestone.threshold}% in ${milestone.count} practice sessions.`,
  description_vi: `Đạt ít nhất ${milestone.threshold}% trong ${milestone.count} phiên luyện tập.`,
  category: 'performance',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => (await countScoreThresholdAttempts(uid, db, milestone.threshold)) >= milestone.count,
}));

const aceMilestoneDefs: AchievementDef[] = [
  { slug: 'ace-3', count: 3, xp: 260, icon: 'BadgeCheck', titleEn: 'Ace I', titleVi: 'Ace I' },
  { slug: 'ace-5', count: 5, xp: 340, icon: 'BadgeCheck', titleEn: 'Ace II', titleVi: 'Ace II' },
  { slug: 'ace-10', count: 10, xp: 520, icon: 'Medal', titleEn: 'Ace III', titleVi: 'Ace III' },
  { slug: 'ace-15', count: 15, xp: 760, icon: 'Medal', titleEn: 'Ace IV', titleVi: 'Ace IV' },
  { slug: 'ace-20', count: 20, xp: 980, icon: 'Award', titleEn: 'Ace V', titleVi: 'Ace V' },
  { slug: 'ace-25', count: 25, xp: 1250, icon: 'Award', titleEn: 'Ace VI', titleVi: 'Ace VI' },
  { slug: 'ace-30', count: 30, xp: 1550, icon: 'Trophy', titleEn: 'Ace VII', titleVi: 'Ace VII' },
  { slug: 'ace-35', count: 35, xp: 1900, icon: 'Trophy', titleEn: 'Ace VIII', titleVi: 'Ace VIII' },
  { slug: 'ace-40', count: 40, xp: 2300, icon: 'Crown', titleEn: 'Ace IX', titleVi: 'Ace IX' },
  { slug: 'ace-50', count: 50, xp: 3000, icon: 'Crown', titleEn: 'Ace X', titleVi: 'Ace X' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Complete ${milestone.count} practice sessions with a score above 90%.`,
  description_vi: `Hoàn thành ${milestone.count} phiên luyện tập với điểm số trên 90%.`,
  category: 'performance',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) =>
    (await db.testAttempt.count({
      where: {
        user_id: uid,
        is_completed: true,
        is_practice: true,
        total_score: { gt: 90 }
      }
    })) >= milestone.count,
}));

const evidenceMilestoneDefs: AchievementDef[] = [
  { slug: 'evidence-3', count: 3, xp: 120, icon: 'Camera', titleEn: 'Evidence Collector I', titleVi: 'Nhà Sưu Tầm Minh Chứng I' },
  { slug: 'evidence-5', count: 5, xp: 180, icon: 'Camera', titleEn: 'Evidence Collector II', titleVi: 'Nhà Sưu Tầm Minh Chứng II' },
  { slug: 'evidence-10', count: 10, xp: 320, icon: 'Images', titleEn: 'Evidence Collector III', titleVi: 'Nhà Sưu Tầm Minh Chứng III' },
  { slug: 'evidence-20', count: 20, xp: 620, icon: 'Images', titleEn: 'Evidence Archivist', titleVi: 'Người Lưu Trữ Minh Chứng' },
  { slug: 'evidence-30', count: 30, xp: 900, icon: 'FolderOpen', titleEn: 'Evidence Curator', titleVi: 'Người Tuyển Chọn Minh Chứng' },
  { slug: 'evidence-50', count: 50, xp: 1400, icon: 'FolderArchive', titleEn: 'Evidence Master', titleVi: 'Bậc Thầy Minh Chứng' },
  { slug: 'evidence-75', count: 75, xp: 2200, icon: 'FolderGit2', titleEn: 'Evidence Historian', titleVi: 'Nhà Sử Học Minh Chứng' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Upload ${milestone.count} pieces of learning evidence.`,
  description_vi: `Tải lên ${milestone.count} minh chứng học tập.`,
  category: 'social',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => (await countEvidenceUploads(uid, db)) >= milestone.count,
}));

const fastCompletionDefs: AchievementDef[] = [
  { slug: 'speed-3', count: 3, xp: 220, icon: 'Wind', titleEn: 'Speed Runner I', titleVi: 'Chạy Nhanh I' },
  { slug: 'speed-5', count: 5, xp: 340, icon: 'Wind', titleEn: 'Speed Runner II', titleVi: 'Chạy Nhanh II' },
  { slug: 'speed-10', count: 10, xp: 620, icon: 'Gauge', titleEn: 'Speed Runner III', titleVi: 'Chạy Nhanh III' },
  { slug: 'speed-20', count: 20, xp: 1100, icon: 'Gauge', titleEn: 'Flash Finisher', titleVi: 'Về Đích Chớp Nhoáng' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Complete ${milestone.count} practice sessions in under 3 minutes.`,
  description_vi: `Hoàn thành ${milestone.count} phiên luyện tập trong dưới 3 phút.`,
  category: 'speed',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => {
    const attempts: any[] = await db.testAttempt.findMany({
      where: { user_id: uid, is_completed: true, is_practice: true },
      select: { started_at: true, completed_at: true }
    });
    return attempts.filter((a: any) => a.completed_at && (a.completed_at.getTime() - a.started_at.getTime()) < 3 * 60 * 1000).length >= milestone.count;
  },
}));

const comebackMilestoneDefs: AchievementDef[] = [
  { slug: 'comeback-2', count: 2, xp: 160, icon: 'RefreshCw', titleEn: 'Back Again I', titleVi: 'Trở Lại I' },
  { slug: 'comeback-3', count: 3, xp: 260, icon: 'RefreshCw', titleEn: 'Back Again II', titleVi: 'Trở Lại II' },
  { slug: 'comeback-5', count: 5, xp: 450, icon: 'RotateCcw', titleEn: 'Resilient Learner', titleVi: 'Người Học Kiên Cường' },
].map((milestone) => ({
  slug: milestone.slug,
  title_en: milestone.titleEn,
  title_vi: milestone.titleVi,
  description_en: `Return to practice after a 7+ day break ${milestone.count} times.`,
  description_vi: `Quay lại luyện tập sau quãng nghỉ hơn 7 ngày ${milestone.count} lần.`,
  category: 'recovery',
  xp_reward: milestone.xp,
  icon: milestone.icon,
  check: async (uid: string, db: any) => {
    const attempts: any[] = await db.testAttempt.findMany({
      where: { user_id: uid, is_completed: true, is_practice: true },
      orderBy: { completed_at: 'asc' },
      select: { completed_at: true }
    });
    let comebacks = 0;
    for (let i = 1; i < attempts.length; i++) {
      const prev = attempts[i - 1].completed_at as Date | null;
      const curr = attempts[i].completed_at as Date | null;
      if (prev && curr && (curr.getTime() - prev.getTime()) > 7 * 24 * 60 * 60 * 1000) {
        comebacks++;
      }
    }
    return comebacks >= milestone.count;
  },
}));

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
  ...practiceMilestoneDefs,
  ...uniqueLessonMilestoneDefs,
  ...gradeMilestoneDefs,
  ...practiceDayMilestoneDefs,
  ...scoreMilestoneDefs,
  ...aceMilestoneDefs,
  ...evidenceMilestoneDefs,
  ...fastCompletionDefs,
  ...comebackMilestoneDefs,
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
