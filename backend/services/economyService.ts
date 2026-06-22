// backend/services/economyService.ts
import prisma from '../lib/db.ts';
import { randomUUID } from 'crypto';

export interface ShopItem {
  id: string;
  price: number;
  isConsumable: boolean;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
}

export const SHOP_ITEMS: Record<string, ShopItem> = {
  avatar_pack_1: { id: 'avatar_pack_1', price: 100, isConsumable: false, titleEn: 'Classic Avatar Pack', titleVi: 'Gói Ảnh Đại Diện Cổ Điển', descriptionEn: 'A set of classic mathematical shapes avatars.', descriptionVi: 'Bộ ảnh đại diện các hình học cổ điển.' },
  avatar_pack_2: { id: 'avatar_pack_2', price: 150, isConsumable: false, titleEn: 'Cosmic Avatar Pack', titleVi: 'Gói Ảnh Đại Diện Vũ Trụ', descriptionEn: 'Out of this world avatars for your profile.', descriptionVi: 'Bộ ảnh đại diện vũ trụ huyền bí.' },
  frame_gold: { id: 'frame_gold', price: 200, isConsumable: false, titleEn: 'Gold Profile Frame', titleVi: 'Khung Vàng Hoàng Gia', descriptionEn: 'A premium shiny gold frame.', descriptionVi: 'Khung vàng lấp lánh cao cấp.' },
  frame_neon: { id: 'frame_neon', price: 300, isConsumable: false, titleEn: 'Neon Glow Frame', titleVi: 'Khung Neon Phát Sáng', descriptionEn: 'A dynamic cyber neon frame.', descriptionVi: 'Khung neon phong cách cyberpunk.' },
  title_math_wizard: { id: 'title_math_wizard', price: 100, isConsumable: false, titleEn: 'Math Wizard Title', titleVi: 'Danh Hiệu Phù Thủy Toán Học', descriptionEn: 'Display "Math Wizard" on your profile.', descriptionVi: 'Hiển thị danh hiệu "Phù Thủy Toán Học".' },
  title_algebra_master: { id: 'title_algebra_master', price: 150, isConsumable: false, titleEn: 'Algebra Master Title', titleVi: 'Danh Hiệu Bậc Thầy Đại Số', descriptionEn: 'Display "Algebra Master" on your profile.', descriptionVi: 'Hiển thị danh hiệu "Bậc Thầy Đại Số".' },
  bg_space: { id: 'bg_space', price: 250, isConsumable: false, titleEn: 'Deep Space Background', titleVi: 'Nền Không Gian Sâu Thẳm', descriptionEn: 'A cosmic galaxy profile background.', descriptionVi: 'Hình nền trang cá nhân dải ngân hà.' },
  bg_sunset: { id: 'bg_sunset', price: 250, isConsumable: false, titleEn: 'Retro Sunset Background', titleVi: 'Nền Hoàng Hôn Retro', descriptionEn: 'A cozy vaporwave sunset background.', descriptionVi: 'Hình nền hoàng hôn ấm áp.' },
  theme_cyberpunk: { id: 'theme_cyberpunk', price: 300, isConsumable: false, titleEn: 'Cyberpunk Theme', titleVi: 'Giao Diện Cyberpunk', descriptionEn: 'Unlock neon cyberpunk app theme.', descriptionVi: 'Mở khóa giao diện ứng dụng neon cyberpunk.' },
  study_pet_dragon: { id: 'study_pet_dragon', price: 500, isConsumable: false, titleEn: 'Pet Baby Dragon', titleVi: 'Thú Cưng Rồng Con', descriptionEn: 'A cute virtual study companion dragon.', descriptionVi: 'Rồng con ảo đồng hành cùng bạn học tập.' },
  
  // Consumables
  skip_guard: { id: 'skip_guard', price: 50, isConsumable: true, titleEn: 'Skip Guard', titleVi: 'Bảo Vệ Bỏ Qua', descriptionEn: 'Skip a practice question and get full marks.', descriptionVi: 'Bỏ qua một câu hỏi luyện tập và vẫn được tính điểm đúng.' },
  streak_shield: { id: 'streak_shield', price: 80, isConsumable: true, titleEn: 'Streak Shield', titleVi: 'Khiên Bảo Vệ Chuỗi', descriptionEn: 'Protects your daily learning streak if you miss a day.', descriptionVi: 'Bảo vệ chuỗi học tập nếu bạn lỡ quên học một ngày.' },
  xp_booster: { id: 'xp_booster', price: 120, isConsumable: true, titleEn: 'Double XP Booster', titleVi: 'Nhân Đôi XP', descriptionEn: 'Earn double XP for the next 30 minutes.', descriptionVi: 'Nhận gấp đôi điểm XP trong 30 phút tới.' },
  challenge_ticket: { id: 'challenge_ticket', price: 30, isConsumable: true, titleEn: 'Challenge Ticket', titleVi: 'Vé Thử Thách', descriptionEn: 'Enter premium dual challenges.', descriptionVi: 'Vé tham gia các trận đấu thách đấu cao cấp.' },
  ai_tutor_credits: { id: 'ai_tutor_credits', price: 40, isConsumable: true, titleEn: 'AI Tutor Credits', titleVi: 'Lượt Hỏi Gia Sư AI', descriptionEn: 'Ask 10 additional questions to the AI tutor.', descriptionVi: 'Nạp thêm 10 lượt hỏi gia sư chatbot AI.' }
};

export const economyService = {
  // Compute max lives based on user level and spent talent points
  getMaxLives: (level: number, extraLivesFromPoints: number): number => {
    const baseMax = 6 + Math.floor(level / 10);
    return Math.min(12, baseMax) + extraLivesFromPoints;
  },

  // Helper to fetch profile once, and perform in-memory computations for points sync and life restoration.
  fetchAndComputeStats: async (userId: string, tx?: any): Promise<{ stats: any; hasChanges: boolean; data: any }> => {
    let stats = await (tx || prisma).studentStats.findUnique({
      where: { user_id: userId }
    });

    let created = false;
    if (!stats) {
      stats = await (tx || prisma).studentStats.create({
        data: {
          user_id: userId,
          lives: 6,
          coins: 100,
          level_points: 0,
          coin_transactions: [],
          inventory: {},
          equipped_items: {},
          upgrades: {}
        }
      });
      created = true;
    }

    const upgrades = stats.upgrades && typeof stats.upgrades === 'object' ? (stats.upgrades as any) : {};
    const xpBonusPoints = Math.floor((upgrades.xp_bonus_pct || 0) / 5);
    const coinBonusPoints = Math.floor((upgrades.coin_bonus_pct || 0) / 5);
    const gameDurationPoints = Math.floor((upgrades.game_duration_bonus || 0) / 5);
    const extraLivesPoints = (upgrades.extra_lives_from_points || 0) * 10;
    const extraAttemptsPoints = (upgrades.extra_game_attempts || 0) * 10;
    
    const totalSpent = xpBonusPoints + coinBonusPoints + gameDurationPoints + extraLivesPoints + extraAttemptsPoints;
    const expectedCurrent = Math.max(0, (stats.level - 1) * 2 - totalSpent);
    
    let levelPoints = stats.level_points;
    let levelPointsChanged = false;
    if (stats.level_points < expectedCurrent) {
      levelPoints = expectedCurrent;
      levelPointsChanged = true;
    }

    // Now restore lives in-memory
    const extraLivesFromPoints = Number((upgrades as any).extra_lives_from_points || 0);
    const maxLives = economyService.getMaxLives(stats.level, extraLivesFromPoints);

    let lives = stats.lives;
    let lastLifeRestoredAt = stats.last_life_restored_at;
    let livesChanged = false;

    if (stats.lives >= maxLives) {
      if (stats.lives > maxLives) {
        lives = maxLives;
        lastLifeRestoredAt = new Date();
        livesChanged = true;
      }
    } else {
      const now = new Date();
      const lastRestored = new Date(stats.last_life_restored_at);
      const msDiff = now.getTime() - lastRestored.getTime();
      const hoursPassed = Math.floor(msDiff / 3600000); // 1 hour = 3,600,000 ms

      if (hoursPassed > 0) {
        lives = Math.min(maxLives, stats.lives + hoursPassed);
        lastLifeRestoredAt = lives === maxLives ? now : new Date(lastRestored.getTime() + hoursPassed * 3600000);
        livesChanged = true;
      }
    }

    const updatedStats = {
      ...stats,
      level_points: levelPoints,
      lives,
      last_life_restored_at: lastLifeRestoredAt
    };

    const data: any = {};
    if (levelPointsChanged) data.level_points = levelPoints;
    if (livesChanged) {
      data.lives = lives;
      data.last_life_restored_at = lastLifeRestoredAt;
    }

    return {
      stats: updatedStats,
      hasChanges: (levelPointsChanged || livesChanged) && !created,
      data
    };
  },

  // Retrieve user stats and restore lives
  getStats: async (userId: string): Promise<any> => {
    const { stats, hasChanges, data } = await economyService.fetchAndComputeStats(userId);
    if (hasChanges) {
      return await prisma.studentStats.update({
        where: { user_id: userId },
        data
      });
    }
    return stats;
  },

  // Consume 1 life for practice attempts
  consumeLife: async (userId: string): Promise<void> => {
    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    const upgrades = stats.upgrades && typeof stats.upgrades === 'object' ? stats.upgrades : {};
    const extraLivesFromPoints = Number((upgrades as any).extra_lives_from_points || 0);
    const maxLives = economyService.getMaxLives(stats.level, extraLivesFromPoints);

    if (stats.lives <= 0) {
      throw new Error("Out of lives. Wait for them to restore or purchase more in the shop!");
    }

    const newLives = stats.lives - 1;
    // If we were at max, the timer starts now
    const nextRestored = stats.lives === maxLives ? new Date() : stats.last_life_restored_at;

    await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        ...data,
        lives: newLives,
        last_life_restored_at: nextRestored
      }
    });
  },

  // Add coins with a transaction log capped at 50 history entries
  addCoins: async (userId: string, amount: number, reason: string): Promise<any> => {
    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    const nextCoins = Math.max(0, stats.coins + amount);
    
    // Add transaction to history
    let history = Array.isArray(stats.coin_transactions) ? stats.coin_transactions : [];
    const newTx = {
      id: randomUUID(),
      amount,
      reason,
      occurred_at: new Date().toISOString()
    };
    
    // Unshift and cap at 50
    history = [newTx, ...history].slice(0, 50);

    return await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        ...data,
        coins: nextCoins,
        coin_transactions: history
      }
    });
  },

  // Spend level-up points on upgrades
  spendLevelPoint: async (userId: string, upgradeType: string): Promise<any> => {
    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    const currentPoints = stats.level_points || 0;

    let cost = 1;
    if (upgradeType === 'extra_lives' || upgradeType === 'extra_attempts') {
      cost = 10;
    }

    if (currentPoints < cost) {
      throw new Error("Insufficient level-up points");
    }

    const upgrades = stats.upgrades && typeof stats.upgrades === 'object' ? { ...stats.upgrades as object } : {};

    if (upgradeType === 'game_duration_bonus') {
      const current = Number((upgrades as any).game_duration_bonus || 0);
      (upgrades as any).game_duration_bonus = current + 5; // Add 5 seconds
    } else if (upgradeType === 'extra_lives') {
      const current = Number((upgrades as any).extra_lives_from_points || 0);
      if (current >= 3) {
        throw new Error("Maximum extra lives upgrade (3) reached");
      }
      (upgrades as any).extra_lives_from_points = current + 1;
    } else if (upgradeType === 'coin_bonus') {
      const current = Number((upgrades as any).coin_bonus_pct || 0);
      (upgrades as any).coin_bonus_pct = current + 5; // Add 5% coin bonus
    } else if (upgradeType === 'xp_bonus') {
      const current = Number((upgrades as any).xp_bonus_pct || 0);
      (upgrades as any).xp_bonus_pct = current + 5; // Add 5% XP bonus
    } else if (upgradeType === 'extra_attempts') {
      const current = Number((upgrades as any).extra_game_attempts || 0);
      if (current >= 5) {
        throw new Error("Maximum extra game attempts upgrade (5) reached");
      }
      (upgrades as any).extra_game_attempts = current + 1; // Add 1 game attempt
    } else {
      throw new Error("Invalid upgrade type");
    }

    return await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        ...data,
        level_points: currentPoints - cost,
        upgrades: upgrades
      }
    });
  },

  // Buy a shop item
  buyShopItem: async (userId: string, itemId: string): Promise<any> => {
    const item = SHOP_ITEMS[itemId];
    if (!item) {
      throw new Error("Item not found");
    }

    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    if (stats.coins < item.price) {
      throw new Error("Insufficient coins");
    }

    const inventory = stats.inventory && typeof stats.inventory === 'object' ? { ...stats.inventory as object } : {};
    const count = Number((inventory as any)[itemId] || 0);

    if (!item.isConsumable && count > 0) {
      throw new Error("You already own this item");
    }

    // Deduct coins and update inventory
    const nextCoins = stats.coins - item.price;
    (inventory as any)[itemId] = count + 1;

    // Log transaction
    let history = Array.isArray(stats.coin_transactions) ? stats.coin_transactions : [];
    const newTx = {
      id: randomUUID(),
      amount: -item.price,
      reason: `purchase_${itemId}`,
      occurred_at: new Date().toISOString()
    };
    history = [newTx, ...history].slice(0, 50);

    return await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        ...data,
        coins: nextCoins,
        inventory: inventory,
        coin_transactions: history
      }
    });
  },

  // Equip an item from inventory
  equipItem: async (userId: string, category: string, itemId: string): Promise<any> => {
    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    const inventory = stats.inventory && typeof stats.inventory === 'object' ? stats.inventory : {};
    const count = Number((inventory as any)[itemId] || 0);

    if (itemId !== "" && count <= 0) {
      throw new Error("You do not own this item");
    }

    const equipped = stats.equipped_items && typeof stats.equipped_items === 'object' ? { ...stats.equipped_items as object } : {};
    if (itemId === "") {
      delete (equipped as any)[category];
    } else {
      (equipped as any)[category] = itemId;
    }

    return await prisma.studentStats.update({
      where: { user_id: userId },
      data: {
        ...data,
        equipped_items: equipped
      }
    });
  },

  // Use skip guard
  useSkipGuard: async (userId: string, snapshotId: string): Promise<any> => {
    const { stats, data } = await economyService.fetchAndComputeStats(userId);
    const inventory = stats.inventory && typeof stats.inventory === 'object' ? { ...stats.inventory as object } : {};
    const count = Number((inventory as any)['skip_guard'] || 0);

    if (count <= 0) {
      throw new Error("No skip guards remaining in inventory");
    }

    // Deduct 1 skip guard
    (inventory as any)['skip_guard'] = count - 1;

    // Log transaction
    let history = Array.isArray(stats.coin_transactions) ? stats.coin_transactions : [];
    const newTx = {
      id: randomUUID(),
      amount: 0,
      reason: "used_skip_guard",
      occurred_at: new Date().toISOString()
    };
    history = [newTx, ...history].slice(0, 50);

    const [updatedSnapshot] = await prisma.$transaction([
      prisma.questionSnapshot.update({
        where: { id: snapshotId },
        data: {
          is_correct: true,
          points_earned: 10,
          student_answer: "Skip Guard",
          responded_at: new Date()
        },
        include: {
          template: true
        }
      }),
      prisma.studentStats.update({
        where: { user_id: userId },
        data: {
          ...data,
          inventory: inventory,
          coin_transactions: history
        }
      })
    ]);

    return updatedSnapshot;
  }
};
