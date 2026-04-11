import prisma from '../lib/db';

export const masteryService = {
  /**
   * Updates or creates a mastery record based on a test attempt.
   */
  updateMastery: async (userId: string, lessonId: string, score: number, timeSpentSeconds: number) => {
    // 1. Fetch current mastery
    const current = await prisma.userLessonMastery.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } }
    });

    // 2. Logic: New score is max(existing, current) for the score part
    // But we also want to track improvement.
    const newScore = current 
      ? Math.max(Number(current.mastery_score), score)
      : score;

    // 3. Update status
    let status = current?.completion_status || "not_started";
    if (score >= 80) {
      status = "completed";
    } else if (status === "not_started") {
      status = "in_progress";
    }

    const updated = await prisma.userLessonMastery.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      update: {
        mastery_score: newScore,
        total_test_time: { increment: timeSpentSeconds },
        completion_status: status,
        last_activity_at: new Date()
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        mastery_score: score,
        total_test_time: timeSpentSeconds,
        completion_status: status,
        last_activity_at: new Date()
      }
    });

    return updated;
  },

  /**
   * Tracks study time (when user just reads the lesson content)
   */
  trackStudyTime: async (userId: string, lessonId: string, seconds: number) => {
    await prisma.userLessonMastery.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      update: {
        total_study_time: { increment: seconds },
        completion_status: {
           // If not completed yet, mark as in_progress
           set: (await prisma.userLessonMastery.findUnique({ 
             where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } } 
           }))?.completion_status === "completed" ? "completed" : "in_progress"
        },
        last_activity_at: new Date()
      },
      create: {
        user_id: userId,
        lesson_id: lessonId,
        total_study_time: seconds,
        completion_status: "in_progress",
        last_activity_at: new Date()
      }
    });
  }
};
