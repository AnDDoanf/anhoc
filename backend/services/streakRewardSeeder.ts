import prisma from '../lib/db.ts';

export async function seedStreakRewards() {
  try {
    const count = await prisma.streakReward.count();
    if (count > 0) {
      console.log('Streak rewards already exist. Skipping seed.');
      return;
    }

    const defaultRewards = [
      {
        name: '7-Day Streak Milestone',
        description: 'Awarded for reaching a 7-day learning streak',
        reward_type: 'milestone',
        required_days: 7,
        reward_payload: {
          coins: 50,
          xp: 100,
          items: [{ type: 'streak_shield', quantity: 1 }]
        },
        message_en: 'Great job! You reached a 7-day streak!',
        message_vi: 'Tuyệt vời! Bạn đã đạt chuỗi 7 ngày học liên tiếp!',
        is_repeatable: false,
        is_active: true
      },
      {
        name: '14-Day Streak Milestone',
        description: 'Awarded for reaching a 14-day learning streak',
        reward_type: 'milestone',
        required_days: 14,
        reward_payload: {
          coins: 100,
          xp: 200,
          items: [
            { type: 'streak_shield', quantity: 1 },
            { type: 'skip_guard', quantity: 1 }
          ]
        },
        message_en: 'Incredible! 14 days streak completed!',
        message_vi: 'Đáng kinh ngạc! Đã hoàn thành chuỗi 14 ngày!',
        is_repeatable: false,
        is_active: true
      },
      {
        name: '30-Day Streak Milestone',
        description: 'Awarded for reaching a 30-day learning streak',
        reward_type: 'milestone',
        required_days: 30,
        reward_payload: {
          coins: 300,
          xp: 500,
          items: [
            { type: 'streak_shield', quantity: 2 },
            { type: 'xp_booster', quantity: 1 }
          ]
        },
        message_en: 'Wow! You are a learning machine. 30 days streak!',
        message_vi: 'Ồ! Bạn là một cỗ máy học tập. Chuỗi 30 ngày!',
        is_repeatable: false,
        is_active: true
      },
      {
        name: '50-Day Streak Milestone',
        description: 'Awarded for reaching a 50-day learning streak',
        reward_type: 'milestone',
        required_days: 50,
        reward_payload: {
          coins: 500,
          xp: 1000,
          items: [
            { type: 'streak_shield', quantity: 3 },
            { type: 'xp_booster', quantity: 2 },
            { type: 'challenge_ticket', quantity: 2 }
          ]
        },
        message_en: 'Halfway to 100! 50 days of consistent learning!',
        message_vi: 'Nửa chặng đường đến 100! 50 ngày học tập kiên trì!',
        is_repeatable: false,
        is_active: true
      }
    ];

    for (const reward of defaultRewards) {
      await prisma.streakReward.create({
        data: reward
      });
    }

    console.log(`Seeded ${defaultRewards.length} default milestone streak rewards.`);
  } catch (error) {
    console.error('Failed to seed streak rewards:', error);
  }
}
