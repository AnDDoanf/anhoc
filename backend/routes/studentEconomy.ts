// backend/routes/studentEconomy.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.ts';
import { economyService, SHOP_ITEMS } from '../services/economyService.ts';
import { streakService } from '../services/streakService.ts';

const router = Router();

// GET /api/v1/student-economy/status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await economyService.getStats(userId);
    res.json({
      stats,
      shopItems: Object.values(SHOP_ITEMS)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/student-economy/inventory
router.get('/inventory', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await economyService.getStats(userId);
    const inventory = stats.inventory && typeof stats.inventory === 'object' ? stats.inventory : {};
    
    // Map item IDs to detailed ShopItem info + count
    const items = Object.entries(inventory).map(([itemId, count]) => {
      const shopItem = SHOP_ITEMS[itemId];
      return {
        itemId,
        count,
        ...(shopItem || {
          id: itemId,
          titleEn: itemId,
          titleVi: itemId,
          descriptionEn: 'Unknown Item',
          descriptionVi: 'Vật phẩm không xác định',
          price: 0,
          isConsumable: true
        })
      };
    });

    res.json({
      inventory: items,
      equipped: stats.equipped_items || {}
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/spend-level-point
router.post('/spend-level-point', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { upgradeType } = req.body;
    if (!upgradeType) {
      return res.status(400).json({ error: "upgradeType is required" });
    }
    const stats = await economyService.spendLevelPoint(userId, upgradeType);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/buy-shop-item
router.post('/buy-shop-item', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ error: "itemId is required" });
    }
    const stats = await economyService.buyShopItem(userId, itemId);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/equip-item
router.post('/equip-item', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { category, itemId } = req.body;
    if (!category || itemId === undefined) {
      return res.status(400).json({ error: "category and itemId are required" });
    }
    const stats = await economyService.equipItem(userId, category, itemId);
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/use-skip-guard
router.post('/use-skip-guard', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { snapshotId } = req.body;
    if (!snapshotId) {
      return res.status(400).json({ error: "snapshotId is required" });
    }
    const snapshot = await economyService.useSkipGuard(userId, snapshotId);
    res.json({ success: true, snapshot });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/student-economy/streak/status
router.get('/streak/status', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const status = await streakService.getStreakStatus(userId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/streak/claim
router.post('/streak/claim', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await streakService.claimDailyReward(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/streak/recover
router.post('/streak/recover', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await streakService.recoverStreak(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/v1/student-economy/streak/reset
router.post('/streak/reset', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await streakService.resetStreak(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
