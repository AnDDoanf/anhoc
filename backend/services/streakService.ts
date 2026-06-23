// backend/services/streakService.ts
import prisma from '../lib/db.ts';
import { economyService, SHOP_ITEMS } from './economyService.ts';
import { levelService } from './levelService.ts';
import { createNotification } from './notificationService.ts';

// Get today's date in UTC (YYYY-MM-DD)
export const getUtcDateStr = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0]!;
};

// Get yesterday's date in UTC (YYYY-MM-DD)
export const getYesterdayUtcDateStr = (date: Date = new Date()): string => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0]!;
};

export interface PrecalculatedReward {
  dayIndex: number;
  rewardType: 'coins' | 'xp' | 'shop_item' | 'badge';
  rewardAmount: number;
  itemId?: string;
  badgeSlug?: string;
  claimed: boolean;
  dateClaimed?: string | null;
  dateStr: string;
  streakRewardId?: string;
}

// Probabilities: coins: 40%, XP: 40%, shop_item: 15%, badge: 5%
// Ranges: coins: 5-50 (gap 5), XP: 10-100 (gap 10)
export const generate14DayRewards = async (startDateStr: string, currentStreak: number): Promise<PrecalculatedReward[]> => {
  const rewards: PrecalculatedReward[] = [];
  const start = new Date(startDateStr);
  const shopItemIds = ['skip_guard', 'streak_shield', 'xp_booster', 'challenge_ticket', 'ai_tutor_credits'];

  // Fetch all active streak rewards from DB
  const activeRewards = await prisma.streakReward.findMany({
    where: { is_active: true }
  });

  for (let i = 0; i < 14; i++) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + i);
    const dateStr = current.toISOString().split('T')[0]!;
    const projectedStreak = currentStreak + 1 + i;

    // Check if there's an active specific_day reward on this date
    const specificDayReward = activeRewards.find(
      (r) => r.reward_type === 'specific_day' && r.specific_date === dateStr
    );

    // Check if there's an active milestone reward matching the projected streak day
    const milestoneReward = activeRewards.find((r) => {
      if (r.reward_type !== 'milestone') return false;
      if (r.is_repeatable) {
        return r.required_days ? projectedStreak > 0 && projectedStreak % r.required_days === 0 : false;
      } else {
        return r.required_days === projectedStreak;
      }
    });

    const dbReward = specificDayReward || milestoneReward;

    if (dbReward) {
      // Map configured streak reward to PrecalculatedReward structure
      const payload = dbReward.reward_payload as any;
      let rewardType: 'coins' | 'xp' | 'shop_item' | 'badge' = 'coins';
      let rewardAmount = 0;
      let itemId: string | undefined = undefined;

      // Primary display preference: items -> XP -> coins
      if (payload?.items && payload.items.length > 0) {
        rewardType = 'shop_item';
        itemId = payload.items[0].type;
        rewardAmount = Number(payload.items[0].quantity || 1);
      } else if (payload?.xp && payload.xp > 0) {
        rewardType = 'xp';
        rewardAmount = Number(payload.xp);
      } else if (payload?.coins && payload.coins > 0) {
        rewardType = 'coins';
        rewardAmount = Number(payload.coins);
      }

      rewards.push({
        dayIndex: i,
        rewardType,
        rewardAmount,
        itemId,
        claimed: false,
        dateClaimed: null,
        dateStr,
        streakRewardId: dbReward.id
      });
    } else {
      const rand = Math.random();
      let rewardType: 'coins' | 'xp' | 'shop_item' | 'badge';
      let rewardAmount = 0;
      let itemId: string | undefined = undefined;
      let badgeSlug: string | undefined = undefined;

      if (rand < 0.40) {
        rewardType = 'coins';
        const min = 5;
        const max = 50;
        const gap = 5;
        const steps = Math.floor((max - min) / gap);
        rewardAmount = min + Math.floor(Math.random() * (steps + 1)) * gap;
      } else if (rand < 0.80) {
        rewardType = 'xp';
        const min = 10;
        const max = 100;
        const gap = 10;
        const steps = Math.floor((max - min) / gap);
        rewardAmount = min + Math.floor(Math.random() * (steps + 1)) * gap;
      } else if (rand < 0.95) {
        rewardType = 'shop_item';
        rewardAmount = 1;
        itemId = shopItemIds[Math.floor(Math.random() * shopItemIds.length)];
      } else {
        rewardType = 'badge';
        rewardAmount = 1;
        badgeSlug = 'badge_consistent_learner';
      }

      rewards.push({
        dayIndex: i,
        rewardType,
        rewardAmount,
        itemId,
        badgeSlug,
        claimed: false,
        dateClaimed: null,
        dateStr
      });
    }
  }

  return rewards;
};

export const streakService = {
  // Get or create streak model
  getOrCreateStreak: async (userId: string, dateStr: string): Promise<any> => {
    let streak = await prisma.userStreak.findUnique({
      where: { user_id: userId }
    });

    if (!streak) {
      const rewards = await generate14DayRewards(dateStr, 0);
      streak = await prisma.userStreak.create({
        data: {
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          weekly_streak: 0,
          last_active_date: null,
          streak_start_date: null,
          rewards_generated_at: new Date(),
          precalculated_rewards: rewards as any
        }
      });
    }

    return streak;
  },

  // Generate 3 random quests for a date
  getOrCreateDailyQuests: async (userId: string, dateStr: string): Promise<any[]> => {
    const existing = await prisma.userDailyQuest.findMany({
      where: { user_id: userId, date: dateStr }
    });

    if (existing.length === 3) {
      return existing;
    }

    // Delete any incomplete/corrupt entries for this day to regenerate
    if (existing.length > 0) {
      await prisma.userDailyQuest.deleteMany({
        where: { user_id: userId, date: dateStr }
      });
    }

    const questTypesPool = [
      { type: 'complete_lesson', target: 1, xp: 50 },
      { type: 'finish_quiz', target: 1, xp: 40 },
      { type: 'submit_practice', target: 1, xp: 30 },
      { type: 'play_game', target: 1, xp: 30 },
      { type: 'earn_xp', target: 50, xp: 40 }
    ];

    // Pick 3 random unique types
    const shuffled = [...questTypesPool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    const created = await Promise.all(
      selected.map((q) =>
        prisma.userDailyQuest.create({
          data: {
            user_id: userId,
            quest_type: q.type,
            target_count: q.target,
            current_count: 0,
            xp_reward: q.xp,
            is_completed: false,
            date: dateStr
          }
        })
      )
    );

    return created;
  },

  // Update daily quest progress
  updateQuestProgress: async (userId: string, questType: string, amount = 1): Promise<void> => {
    try {
      const todayStr = getUtcDateStr();
      
      // Ensure daily quests exist first
      await streakService.getOrCreateDailyQuests(userId, todayStr);

      const quest = await prisma.userDailyQuest.findUnique({
        where: {
          user_id_quest_type_date: {
            user_id: userId,
            quest_type: questType,
            date: todayStr
          }
        }
      });

      if (!quest || quest.is_completed) return;

      const nextCount = Math.min(quest.target_count, quest.current_count + amount);
      const isNowCompleted = nextCount >= quest.target_count;

      await prisma.userDailyQuest.update({
        where: { id: quest.id },
        data: {
          current_count: nextCount,
          is_completed: isNowCompleted
        }
      });

      if (isNowCompleted) {
        // Award XP bonus
        await levelService.addXp(userId, quest.xp_reward, 'daily_quest_completion');

        // Check if this was the first quest completed today. If so, user is active for today
        const userStreak = await streakService.getOrCreateStreak(userId, todayStr);
        if (userStreak.last_active_date !== todayStr) {
          // Verify if they maintained streak consecutively
          const yesterdayStr = getYesterdayUtcDateStr();
          let currentStreak = userStreak.current_streak;

          // If they were active yesterday, they continue the streak
          if (userStreak.last_active_date === yesterdayStr) {
            // Wait, we don't increment the streak count here, because streak count is incremented
            // when they CLAIM the reward! This aligns with the calendar claim action.
            // But we mark them active for today
            await prisma.userStreak.update({
              where: { user_id: userId },
              data: {
                last_active_date: todayStr
              }
            });
          } else if (userStreak.last_active_date === null) {
            // First time active
            await prisma.userStreak.update({
              where: { user_id: userId },
              data: {
                last_active_date: todayStr,
                streak_start_date: new Date()
              }
            });
          } else if (userStreak.last_active_date !== todayStr) {
            // They missed yesterday. Streak needs recovery, we mark it active today but do not reset/increment
            // until they claim or resolve recovery
            await prisma.userStreak.update({
              where: { user_id: userId },
              data: {
                last_active_date: todayStr
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Error updating daily quest progress:', err);
    }
  },

  // Main status function
  getStreakStatus: async (userId: string): Promise<any> => {
    const todayStr = getUtcDateStr();
    const yesterdayStr = getYesterdayUtcDateStr();

    let streak = await streakService.getOrCreateStreak(userId, todayStr);
    let quests = await streakService.getOrCreateDailyQuests(userId, todayStr);

    // Auto-collection logic if the precalculated calendar period has expired
    let rewards = (streak.precalculated_rewards as any as PrecalculatedReward[]) || [];
    const latestRewardDate = rewards.length > 0 ? rewards[rewards.length - 1]!.dateStr : '';

    if (rewards.length === 0 || todayStr > latestRewardDate) {
      // Period has expired! Perform auto-collection of unclaimed completed days
      const unclaimedCompletedRewards: PrecalculatedReward[] = [];
      const dateStrings = rewards.map(r => r.dateStr);

      // Find which dates in the old calendar had completed quests
      const completedQuests = await prisma.userDailyQuest.findMany({
        where: {
          user_id: userId,
          date: { in: dateStrings },
          is_completed: true
        }
      });

      const completedDatesSet = new Set(completedQuests.map(q => q.date));

      // Fetch all active streak rewards for mapping
      const activeStreakRewards = await prisma.streakReward.findMany({
        where: { is_active: true }
      });
      const activeStreakRewardsMap = new Map(activeStreakRewards.map(r => [r.id, r]));

      // Process auto claims
      const stats = await prisma.studentStats.findUnique({ where: { user_id: userId } });
      const inventory = stats?.inventory && typeof stats.inventory === 'object' ? { ...stats.inventory as object } : {};
      let coinsEarned = 0;
      let xpEarned = 0;
      const itemsAwarded: string[] = [];

      for (const reward of rewards) {
        if (!reward.claimed && completedDatesSet.has(reward.dateStr)) {
          reward.claimed = true;
          reward.dateClaimed = todayStr;
          unclaimedCompletedRewards.push(reward);

          if (reward.streakRewardId) {
            const sr = activeStreakRewardsMap.get(reward.streakRewardId);
            if (sr) {
              const payload = sr.reward_payload as any;
              if (payload) {
                coinsEarned += Number(payload.coins || 0);
                xpEarned += Number(payload.xp || 0);
                const items = payload.items || [];
                for (const it of items) {
                  const count = Number((inventory as any)[it.type] || 0);
                  (inventory as any)[it.type] = count + Number(it.quantity || 1);
                  for (let q = 0; q < Number(it.quantity || 1); q++) {
                    itemsAwarded.push(it.type);
                  }
                }
              }
            }
          } else {
            if (reward.rewardType === 'coins') {
              coinsEarned += reward.rewardAmount;
            } else if (reward.rewardType === 'xp') {
              xpEarned += reward.rewardAmount;
            } else if (reward.rewardType === 'shop_item' && reward.itemId) {
              const count = Number((inventory as any)[reward.itemId] || 0);
              (inventory as any)[reward.itemId] = count + 1;
              itemsAwarded.push(reward.itemId);
            }
          }
        }
      }

      if (unclaimedCompletedRewards.length > 0) {
        // Save database modifications in a transaction
        await prisma.$transaction(async (tx) => {
          if (coinsEarned > 0) {
            await tx.studentStats.update({
              where: { user_id: userId },
              data: { coins: { increment: coinsEarned } }
            });
          }
          if (xpEarned > 0) {
            await levelService.addXp(userId, xpEarned, 'streak_auto_claim');
          }
          if (itemsAwarded.length > 0) {
            await tx.studentStats.update({
              where: { user_id: userId },
              data: { inventory: inventory as any }
            });
          }

          // Create UserStreakRewardClaim entries for auto-claimed streak rewards
          for (const reward of unclaimedCompletedRewards) {
            if (reward.streakRewardId) {
              const sr = activeStreakRewardsMap.get(reward.streakRewardId);
              if (sr) {
                const streakDay = sr.reward_type === 'specific_day' ? 0 : (sr.required_days || 0);
                await tx.userStreakRewardClaim.upsert({
                  where: {
                    user_id_streak_reward_id_streak_day: {
                      user_id: userId,
                      streak_reward_id: sr.id,
                      streak_day: streakDay
                    }
                  },
                  update: {},
                  create: {
                    user_id: userId,
                    streak_reward_id: sr.id,
                    streak_day: streakDay
                  }
                });
              }
            }
          }
        });

        // Send system notification
        let notificationMsgVi = `Hệ thống đã tự động nhận ${unclaimedCompletedRewards.length} phần quà tích lũy chưa nhận của bạn: `;
        let notificationMsgEn = `The system automatically claimed ${unclaimedCompletedRewards.length} of your unclaimed daily rewards: `;
        const summaryParts = [];
        if (coinsEarned > 0) summaryParts.push(`${coinsEarned} coins`);
        if (xpEarned > 0) summaryParts.push(`${xpEarned} XP`);
        if (itemsAwarded.length > 0) summaryParts.push(`${itemsAwarded.length} items`);
        
        notificationMsgVi += summaryParts.join(', ');
        notificationMsgEn += summaryParts.join(', ');

        await createNotification({
          recipientId: userId,
          actorId: null,
          type: 'streak_auto_claim',
          payload: {
            message_en: notificationMsgEn,
            message_vi: notificationMsgVi,
            coins: coinsEarned,
            xp: xpEarned,
            items: itemsAwarded
          }
        });
      }

      // Generate a new 14-day calendar
      const nextRewards = await generate14DayRewards(todayStr, streak.current_streak);
      streak = await prisma.userStreak.update({
        where: { user_id: userId },
        data: {
          rewards_generated_at: new Date(),
          precalculated_rewards: nextRewards as any
        }
      });
      rewards = nextRewards;
    }

    // Check if streak is broken
    let needsRecovery = false;
    let recoveryDate = '';

    if (streak.last_active_date !== null && streak.last_active_date !== todayStr && streak.last_active_date !== yesterdayStr) {
      // Check if they had completed quests on the last active date.
      // Wait, if they missed yesterday, they might need recovery.
      // Specifically: they need recovery if yesterday's quest is not completed.
      const yesterdayQuests = await prisma.userDailyQuest.findMany({
        where: { user_id: userId, date: yesterdayStr }
      });
      const completedYesterday = yesterdayQuests.some(q => q.is_completed);

      if (!completedYesterday && streak.current_streak > 0) {
        needsRecovery = true;
        recoveryDate = yesterdayStr;
      }
    }

    // Fetch user inventory to check for streak shields
    const stats = await prisma.studentStats.findUnique({
      where: { user_id: userId },
      select: { inventory: true }
    });
    const inventory = stats?.inventory && typeof stats.inventory === 'object' ? stats.inventory : {};
    const streakShields = Number((inventory as any)['streak_shield'] || 0);

    // Can claim today's reward if they completed at least 1 quest today, and reward for today is unclaimed
    const todayReward = rewards.find(r => r.dateStr === todayStr);
    const completedTodayQuest = quests.some(q => q.is_completed);
    const canClaimToday = !!todayReward && !todayReward.claimed && completedTodayQuest && !needsRecovery;

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      weeklyStreak: streak.weekly_streak,
      lastActiveDate: streak.last_active_date,
      rewardsGeneratedAt: streak.rewards_generated_at,
      precalculatedRewards: rewards,
      dailyQuests: quests,
      needsRecovery,
      recoveryDate,
      streakShields,
      canClaimToday
    };
  },

  // Spend shield to recover streak
  recoverStreak: async (userId: string): Promise<any> => {
    const todayStr = getUtcDateStr();
    const yesterdayStr = getYesterdayUtcDateStr();

    const stats = await prisma.studentStats.findUnique({ where: { user_id: userId } });
    if (!stats) throw new Error('Student stats not found');

    const inventory = stats.inventory && typeof stats.inventory === 'object' ? { ...stats.inventory as object } : {};
    const shieldCount = Number((inventory as any)['streak_shield'] || 0);

    if (shieldCount <= 0) {
      throw new Error('You do not have any Streak Shields in your inventory!');
    }

    // Deduct 1 shield
    (inventory as any)['streak_shield'] = shieldCount - 1;

    // Update streak status: set last_active_date to yesterday, so today's activity is consecutive!
    await prisma.$transaction([
      prisma.studentStats.update({
        where: { user_id: userId },
        data: { inventory: inventory as any }
      }),
      prisma.userStreak.update({
        where: { user_id: userId },
        data: {
          last_active_date: yesterdayStr
        }
      }),
      // Create a completed dummy quest for yesterday to satisfy the streak checker
      prisma.userDailyQuest.upsert({
        where: {
          user_id_quest_type_date: {
            user_id: userId,
            quest_type: 'earn_xp',
            date: yesterdayStr
          }
        },
        update: { is_completed: true, current_count: 50, target_count: 50 },
        create: {
          user_id: userId,
          quest_type: 'earn_xp',
          date: yesterdayStr,
          target_count: 50,
          current_count: 50,
          xp_reward: 0,
          is_completed: true
        }
      })
    ]);

    return await streakService.getStreakStatus(userId);
  },

  // Reset streak to 0
  resetStreak: async (userId: string): Promise<any> => {
    const todayStr = getUtcDateStr();

    await prisma.userStreak.update({
      where: { user_id: userId },
      data: {
        current_streak: 0,
        last_active_date: todayStr
      }
    });

    return await streakService.getStreakStatus(userId);
  },

  // Claim today's daily reward
  claimDailyReward: async (userId: string): Promise<any> => {
    const todayStr = getUtcDateStr();
    const status = await streakService.getStreakStatus(userId);

    if (status.needsRecovery) {
      throw new Error('Please resolve your broken streak recovery before claiming!');
    }
    if (!status.canClaimToday) {
      throw new Error('You cannot claim today\'s reward. Ensure you completed at least 1 quest today and have not already claimed.');
    }

    const streak = await prisma.userStreak.findUnique({ where: { user_id: userId } });
    if (!streak) throw new Error('Streak record not found');

    const rewards = (streak.precalculated_rewards as any as PrecalculatedReward[]) || [];
    const todayReward = rewards.find(r => r.dateStr === todayStr);

    if (!todayReward || todayReward.claimed) {
      throw new Error('Today\'s reward is already claimed or does not exist.');
    }

    // Award reward
    const stats = await prisma.studentStats.findUnique({ where: { user_id: userId } });
    if (!stats) throw new Error('Student stats not found');

    const inventory = stats.inventory && typeof stats.inventory === 'object' ? { ...stats.inventory as object } : {};

    let coinsToAward = 0;
    let xpToAward = 0;

    if (todayReward.rewardType === 'coins') {
      coinsToAward = todayReward.rewardAmount;
    } else if (todayReward.rewardType === 'xp') {
      xpToAward = todayReward.rewardAmount;
    } else if (todayReward.rewardType === 'shop_item' && todayReward.itemId) {
      const count = Number((inventory as any)[todayReward.itemId] || 0);
      (inventory as any)[todayReward.itemId] = count + 1;
    }

    // Mark reward claimed in precalculated array
    todayReward.claimed = true;
    todayReward.dateClaimed = todayStr;

    // Increment streak
    const nextStreak = streak.current_streak + 1;
    const nextLongest = Math.max(streak.longest_streak, nextStreak);
    
    // Weekly streak is incremented every 7 days completed
    const nextWeekly = nextStreak % 7 === 0 ? streak.weekly_streak + 1 : streak.weekly_streak;

    // Update database inside transaction
    const [updatedStreak] = await prisma.$transaction([
      prisma.userStreak.update({
        where: { user_id: userId },
        data: {
          current_streak: nextStreak,
          longest_streak: nextLongest,
          weekly_streak: nextWeekly,
          last_active_date: todayStr,
          precalculated_rewards: rewards as any
        }
      }),
      prisma.studentStats.update({
        where: { user_id: userId },
        data: {
          coins: { increment: coinsToAward },
          inventory: inventory as any
        }
      })
    ]);

    if (xpToAward > 0) {
      await levelService.addXp(userId, xpToAward, 'daily_streak_reward');
    }

    // Check milestone rewards
    const milestones = await prisma.streakReward.findMany({
      where: { is_active: true }
    });

    const milestoneClaims = [];
    for (const m of milestones) {
      let isEligible = false;
      if (m.reward_type === 'milestone') {
        if (m.is_repeatable) {
          isEligible = nextStreak > 0 && nextStreak % (m.required_days || 7) === 0;
        } else {
          isEligible = nextStreak === m.required_days;
        }
      } else if (m.reward_type === 'specific_day') {
        isEligible = m.specific_date === todayStr;
      }

      if (isEligible) {
        // Check if already claimed for this streak day
        const existingClaim = await prisma.userStreakRewardClaim.findUnique({
          where: {
            user_id_streak_reward_id_streak_day: {
              user_id: userId,
              streak_reward_id: m.id,
              streak_day: m.reward_type === 'specific_day' ? 0 : nextStreak
            }
          }
        });

        if (!existingClaim) {
          // Claim milestone reward
          await prisma.userStreakRewardClaim.create({
            data: {
              user_id: userId,
              streak_reward_id: m.id,
              streak_day: m.reward_type === 'specific_day' ? 0 : nextStreak
            }
          });

          // Process milestone reward payload
          const payload = m.reward_payload as any;
          if (payload) {
            let mCoins = Number(payload.coins || 0);
            let mXp = Number(payload.xp || 0);
            const mItems = payload.items || [];

            if (mCoins > 0) {
              await prisma.studentStats.update({
                where: { user_id: userId },
                data: { coins: { increment: mCoins } }
              });
            }
            if (mXp > 0) {
              await levelService.addXp(userId, mXp, 'streak_milestone_reward');
            }
            if (mItems.length > 0) {
              const currentStats = await prisma.studentStats.findUnique({ where: { user_id: userId } });
              const currentInv = currentStats?.inventory && typeof currentStats.inventory === 'object' ? { ...currentStats.inventory as object } : {};
              for (const it of mItems) {
                const count = Number((currentInv as any)[it.type] || 0);
                (currentInv as any)[it.type] = count + Number(it.quantity || 1);
              }
              await prisma.studentStats.update({
                where: { user_id: userId },
                data: { inventory: currentInv as any }
			  });
            }

            milestoneClaims.push({
              name: m.name,
              message_en: m.message_en || `Congratulations on reaching ${nextStreak} days streak!`,
              message_vi: m.message_vi || `Chúc mừng bạn đã đạt chuỗi ${nextStreak} ngày học liên tiếp!`,
              payload
            });
          }
        }
      }
    }

    return {
      success: true,
      claimedReward: todayReward,
      milestoneClaims,
      status: await streakService.getStreakStatus(userId)
    };
  }
};
