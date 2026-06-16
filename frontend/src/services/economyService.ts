// frontend/src/services/economyService.ts
import { api } from "./api";

export interface ShopItem {
  id: string;
  price: number;
  isConsumable: boolean;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
}

export interface StudentStats {
  user_id: string;
  lessons_completed: number;
  total_xp: number;
  level: number;
  average_score: string | number;
  last_active: string;
  lives: number;
  last_life_restored_at: string;
  coins: number;
  level_points: number;
  coin_transactions: Array<{
    id: string;
    amount: number;
    reason: string;
    occurred_at: string;
  }>;
  inventory: Record<string, number>;
  equipped_items: {
    avatar?: string;
    frame?: string;
    title?: string;
    background?: string;
    theme?: string;
  };
  upgrades: {
    game_duration_bonus?: number;
    extra_lives_from_points?: number;
    coin_bonus_pct?: number;
    xp_bonus_pct?: number;
    extra_game_attempts?: number;
  };
}

export interface EconomyStatusResponse {
  stats: StudentStats;
  shopItems: ShopItem[];
}

export interface InventoryResponse {
  inventory: Array<{
    itemId: string;
    count: number;
    id: string;
    price: number;
    isConsumable: boolean;
    titleEn: string;
    titleVi: string;
    descriptionEn: string;
    descriptionVi: string;
  }>;
  equipped: Record<string, string>;
}

export const economyService = {
  getMaxLives: (level: number, extraLivesFromPoints: number): number => {
    const baseMax = 6 + Math.floor(level / 10);
    return Math.min(12, baseMax) + extraLivesFromPoints;
  },

  getStatus: async (): Promise<EconomyStatusResponse> => {
    const response = await api.get<EconomyStatusResponse>("/student-economy/status");
    return response.data;
  },

  getInventory: async (): Promise<InventoryResponse> => {
    const response = await api.get<InventoryResponse>("/student-economy/inventory");
    return response.data;
  },

  spendLevelPoint: async (upgradeType: string): Promise<{ success: boolean; stats: StudentStats }> => {
    const response = await api.post<{ success: boolean; stats: StudentStats }>("/student-economy/spend-level-point", { upgradeType });
    return response.data;
  },

  buyShopItem: async (itemId: string): Promise<{ success: boolean; stats: StudentStats }> => {
    const response = await api.post<{ success: boolean; stats: StudentStats }>("/student-economy/buy-shop-item", { itemId });
    return response.data;
  },

  equipItem: async (category: string, itemId: string): Promise<{ success: boolean; stats: StudentStats }> => {
    const response = await api.post<{ success: boolean; stats: StudentStats }>("/student-economy/equip-item", { category, itemId });
    return response.data;
  },

  useSkipGuard: async (snapshotId: string): Promise<{ success: boolean; snapshot: any }> => {
    const response = await api.post<{ success: boolean; snapshot: any }>("/student-economy/use-skip-guard", { snapshotId });
    return response.data;
  }
};
