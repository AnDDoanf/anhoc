// frontend/src/app/(main)/student/shop/page.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { economyService, ShopItem, StudentStats } from "@/services/economyService";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import Hero from "@/components/ui/Hero";
import { 
  Sparkles, 
  Coins, 
  Heart, 
  Shield, 
  Activity, 
  SkipForward, 
  Trophy, 
  Flame, 
  Loader2, 
  Check, 
  ShoppingBag,
  Ticket,
  Bot
} from "lucide-react";

export default function ShopPage() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Recovery countdown state
  const [timeToNextLife, setTimeToNextLife] = useState<string>("");

  const fetchEconomy = async () => {
    try {
      const [data, invData] = await Promise.all([
        economyService.getStatus(),
        economyService.getInventory()
      ]);
      setStats(data.stats);
      setShopItems(data.shopItems);
      setInventory(invData.inventory);
      setEquipped(invData.equipped);
    } catch (err) {
      console.error("Failed to load shop details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEconomy();
  }, []);

  const handleUpgrade = async (upgradeType: string) => {
    // Left for potential talent spending on this page, currently unused but safe
  };

  const handleEquip = async (category: string, itemId: string) => {
    const isCurrentlyEquipped = equipped[category] === itemId;
    const targetItemId = isCurrentlyEquipped ? "" : itemId; // toggle
    
    setEquippingId(itemId);
    try {
      const res = await economyService.equipItem(category, targetItemId);
      if (res.success) {
        setStats(res.stats);
        setEquipped(prev => ({
          ...prev,
          [category]: targetItemId
        }));
        window.dispatchEvent(new Event("student-stats-updated"));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to equip item");
    } finally {
      setEquippingId(null);
    }
  };

  const getItemCategory = (id: string): string => {
    if (id.startsWith("avatar")) return "avatar";
    if (id.startsWith("frame")) return "frame";
    if (id.startsWith("title")) return "title";
    if (id.startsWith("bg")) return "background";
    if (id.startsWith("theme")) return "theme";
    return "";
  };

  // Calculate max lives
  const maxLives = stats ? economyService.getMaxLives(stats.level, stats.upgrades?.extra_lives_from_points || 0) : 6;

  // Countdown timer logic for next life restoration
  useEffect(() => {
    if (!stats || stats.lives >= maxLives) {
      setTimeToNextLife("");
      return;
    }

    const interval = setInterval(() => {
      const lastRestored = new Date(stats.last_life_restored_at);
      const targetTime = new Date(lastRestored.getTime() + 3600000); // +1 hour
      const diffMs = targetTime.getTime() - Date.now();

      if (diffMs <= 0) {
        setTimeToNextLife("");
        clearInterval(interval);
        fetchEconomy(); // Refresh to pull restored life
      } else {
        const minutes = Math.floor(diffMs / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        const paddedSeconds = seconds.toString().padStart(2, "0");
        setTimeToNextLife(`${minutes}:${paddedSeconds}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats, maxLives]);

  const handleBuy = async (itemId: string) => {
    if (purchasingId) return;
    setPurchasingId(itemId);
    try {
      const res = await economyService.buyShopItem(itemId);
      if (res.success) {
        setStats(res.stats);
        window.dispatchEvent(new Event("student-stats-updated"));
        
        // Refresh inventory data after purchase
        const invData = await economyService.getInventory();
        setInventory(invData.inventory);
        setEquipped(invData.equipped);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to make purchase");
    } finally {
      setPurchasingId(null);
    }
  };

  // Category mapping
  const categories = [
    { id: "all", label: locale === "vi" ? "Tất cả" : "All" },
    { id: "customization", label: locale === "vi" ? "Cá nhân hóa" : "Customization" },
    { id: "boosters", label: locale === "vi" ? "Bổ trợ" : "Boosters" },
    { id: "pets", label: locale === "vi" ? "Thú cưng" : "Pets" },
    { id: "math", label: locale === "vi" ? "Trợ lý toán" : "Math Helpers" },
    { id: "inventory", label: locale === "vi" ? "Kho đồ" : "Inventory" }
  ];

  // Filtering items
  const filteredItems = shopItems.filter(item => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "customization") {
      return item.id.startsWith("avatar") || item.id.startsWith("frame") || item.id.startsWith("title") || item.id.startsWith("bg") || item.id.startsWith("theme");
    }
    if (selectedCategory === "boosters") {
      return item.id === "streak_shield" || item.id === "xp_booster";
    }
    if (selectedCategory === "pets") {
      return item.id.includes("pet");
    }
    if (selectedCategory === "math") {
      return item.id === "skip_guard" || item.id === "challenge_ticket" || item.id === "ai_tutor_credits";
    }
    return true;
  });

  // Get item specific icon & gradient styles
  const getItemVisuals = (id: string) => {
    if (id.startsWith("avatar")) {
      return {
        icon: <ShoppingBag className="text-sol-accent" size={28} />,
        bg: "bg-sol-accent/10 hover:border-sol-accent/30",
        btnColor: "bg-sol-accent text-sol-bg shadow-sol-accent/15"
      };
    }
    if (id.startsWith("frame")) {
      return {
        icon: <Trophy className="text-sol-orange" size={28} />,
        bg: "bg-sol-orange/10 hover:border-sol-orange/30",
        btnColor: "bg-sol-orange text-sol-bg shadow-sol-orange/15"
      };
    }
    if (id.startsWith("title")) {
      return {
        icon: <Sparkles className="text-sol-yellow text-amber-500" size={28} />,
        bg: "bg-amber-500/10 hover:border-amber-500/30",
        btnColor: "bg-amber-500 text-sol-bg shadow-amber-500/15"
      };
    }
    if (id.startsWith("bg") || id.startsWith("theme")) {
      return {
        icon: <Flame className="text-purple-500" size={28} />,
        bg: "bg-purple-500/10 hover:border-purple-500/30",
        btnColor: "bg-purple-500 text-white shadow-purple-500/15"
      };
    }
    if (id === "skip_guard") {
      return {
        icon: <SkipForward className="text-sol-green" size={28} />,
        bg: "bg-sol-green/10 hover:border-sol-green/30",
        btnColor: "bg-sol-green text-sol-bg shadow-sol-green/15"
      };
    }
    if (id === "xp_booster") {
      return {
        icon: <Activity className="text-pink-500" size={28} />,
        bg: "bg-pink-500/10 hover:border-pink-500/30",
        btnColor: "bg-pink-500 text-white shadow-pink-500/15"
      };
    }
    if (id === "streak_shield") {
      return {
        icon: <Shield className="text-blue-500" size={28} />,
        bg: "bg-blue-500/10 hover:border-blue-500/30",
        btnColor: "bg-blue-500 text-white shadow-blue-500/15"
      };
    }
    if (id === "challenge_ticket") {
      return {
        icon: <Ticket className="text-sol-orange" size={28} />,
        bg: "bg-sol-orange/10 hover:border-sol-orange/30",
        btnColor: "bg-sol-orange text-sol-bg shadow-sol-orange/15"
      };
    }
    if (id === "ai_tutor_credits") {
      return {
        icon: <Bot className="text-sol-accent" size={28} />,
        bg: "bg-sol-accent/10 hover:border-sol-accent/30",
        btnColor: "bg-sol-accent text-sol-bg shadow-sol-accent/15"
      };
    }
    return {
      icon: <Sparkles className="text-sol-accent" size={28} />,
      bg: "bg-sol-bg/50 hover:border-sol-accent/30",
      btnColor: "bg-sol-accent text-sol-bg shadow-sol-accent/15"
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="student">
      <div className="mx-auto max-w-7xl space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Shop Banner Hero */}
        <Hero
          icon={<ShoppingBag size={150} className="text-sol-accent md:h-[240px] md:w-[240px]" />}
          iconPosition="bottom-right"
          className="md:rounded-[3rem] relative overflow-hidden"
          containerClassName="relative z-10 flex w-full flex-col items-start gap-5 lg:max-w-2xl"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sol-accent">
              <Sparkles size={12} />
              <span>{locale === "vi" ? "CỬA HÀNG HỌC TẬP" : "STUDENT SHOP"}</span>
            </div>
            <h1 className="text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:text-6xl">
              {locale === "vi" ? "Cửa Hàng Anhoc" : "Anhoc Store"}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-sol-muted md:text-lg font-medium">
              {locale === "vi" 
                ? "Dùng Ancoin bạn kiếm được từ việc giải toán để mua các vật phẩm cực ngầu." 
                : "Spend your earned Ancoins to unlock cool items."}
            </p>
          </div>
        </Hero>

        {/* Currency & Lives Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Ancoins Balance */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 flex items-center justify-between shadow-xl shadow-sol-accent/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sol-accent/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-sol-accent/10 transition-colors" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs font-black text-sol-muted uppercase tracking-wider">
                {locale === "vi" ? "SỐ DƯ ANCOIN" : "ANCOIN BALANCE"}
              </span>
              <div className="flex items-center gap-2">
                <Coins className="text-sol-accent" size={24} />
                <span className="text-3xl font-black text-sol-text">{stats?.coins || 0}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-sol-accent/10 text-sol-accent">
              <Coins size={28} />
            </div>
          </div>

          {/* Lives Remaining */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 flex items-center justify-between shadow-xl shadow-sol-accent/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sol-orange/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-sol-orange/10 transition-colors" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs font-black text-sol-muted uppercase tracking-wider">
                {locale === "vi" ? "TIM SỨC MẠNH" : "LIVES REMAINING"}
              </span>
              <div className="flex items-center gap-2">
                <Heart className="text-sol-orange fill-sol-orange" size={24} />
                <span className="text-3xl font-black text-sol-text">{stats?.lives ?? 6} / {maxLives}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-sol-orange/10 text-sol-orange">
              <Heart size={28} />
            </div>
          </div>

          {/* Lives Recovery Count */}
          <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 flex items-center justify-between shadow-xl shadow-sol-accent/5 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sol-green/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-sol-green/10 transition-colors" />
            <div className="space-y-1 relative z-10">
              <span className="text-xs font-black text-sol-muted uppercase tracking-wider">
                {locale === "vi" ? "HỒI TIM TỰ ĐỘNG" : "LIFE RECOVERY"}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-sol-text">
                  {stats && stats.lives >= maxLives 
                    ? (locale === "vi" ? "Đầy Tim" : "Full Lives") 
                    : timeToNextLife ? `+1 in ${timeToNextLife}` : (locale === "vi" ? "Đang hồi..." : "Recovering...")}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-sol-green/10 text-sol-green">
              <Activity size={28} />
            </div>
          </div>

        </div>

        {/* Category Selector Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-sol-border/30">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border ${
                selectedCategory === cat.id
                  ? "bg-sol-accent border-sol-accent text-sol-bg shadow-lg shadow-sol-accent/10"
                  : "bg-sol-surface/50 border-sol-border/20 text-sol-muted hover:border-sol-accent hover:text-sol-accent"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Shop Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {selectedCategory === "inventory" ? (
            inventory.length === 0 ? (
              <div className="col-span-full text-center py-12 text-sol-muted font-bold text-lg">
                {locale === "vi" ? "Kho đồ trống. Hãy mua gì đó trong cửa hàng!" : "Your inventory is empty. Go buy something in the shop!"}
              </div>
            ) : (
              inventory.map((item) => {
                const category = getItemCategory(item.itemId);
                const isEquipped = category && equipped[category] === item.itemId;
                const visuals = getItemVisuals(item.itemId);

                return (
                  <div
                    key={item.id}
                    className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group"
                  >
                    
                    {/* Visual card header */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-3.5 rounded-2xl transition-all duration-300 group-hover:rotate-6 ${visuals.bg}`}>
                          {visuals.icon}
                        </div>
                        <span className="px-3 py-1 rounded-full bg-sol-accent/15 border border-sol-accent/20 text-[10px] font-black text-sol-accent uppercase tracking-wider">
                          {locale === "vi" ? `ĐANG CÓ: ${item.count}` : `OWNED: ${item.count}`}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-sol-text tracking-tight group-hover:text-sol-accent transition-colors">
                          {locale === "vi" ? item.titleVi : item.titleEn}
                        </h3>
                        <p className="text-xs text-sol-muted font-medium leading-relaxed">
                          {locale === "vi" ? item.descriptionVi : item.descriptionEn}
                        </p>
                      </div>
                    </div>

                    {/* Card use/equip footer */}
                    <div className="pt-6 mt-6 border-t border-sol-border/15 flex items-center justify-between gap-4">
                      {category ? (
                        <>
                          <span className="text-xs font-bold text-sol-muted uppercase tracking-wider">
                            {locale === "vi" ? "Trang bị" : "Customization"}
                          </span>
                          <button
                            onClick={() => handleEquip(category, item.itemId)}
                            disabled={equippingId !== null}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                              ${isEquipped 
                                ? "bg-sol-green text-sol-bg shadow-sol-green/15" 
                                : visuals.btnColor}
                            `}
                          >
                            {equippingId === item.itemId ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : isEquipped ? (
                              <>
                                <Check size={14} />
                                {locale === "vi" ? "Đang dùng" : "Equipped"}
                              </>
                            ) : (
                              locale === "vi" ? "Sử dụng" : "Equip"
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="text-xs font-bold text-sol-muted italic w-full text-center">
                          {locale === "vi" ? "Vật phẩm tiêu hao" : "Consumable Item"}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )
          ) : (
            filteredItems.map((item) => {
              const ownedCount = stats?.inventory ? (stats.inventory as any)[item.id] || 0 : 0;
              const isOwnedOneTime = !item.isConsumable && ownedCount > 0;
              const visuals = getItemVisuals(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-sol-surface border border-sol-border/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group`}
                >
                  
                  {/* Visual card header */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3.5 rounded-2xl transition-all duration-300 group-hover:rotate-6 ${visuals.bg}`}>
                        {visuals.icon}
                      </div>
                      {ownedCount > 0 && (
                        <span className="px-3 py-1 rounded-full bg-sol-accent/15 border border-sol-accent/20 text-[10px] font-black text-sol-accent uppercase tracking-wider">
                          {locale === "vi" ? `ĐANG CÓ: ${ownedCount}` : `OWNED: ${ownedCount}`}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-sol-text tracking-tight group-hover:text-sol-accent transition-colors">
                        {locale === "vi" ? item.titleVi : item.titleEn}
                      </h3>
                      <p className="text-xs text-sol-muted font-medium leading-relaxed">
                        {locale === "vi" ? item.descriptionVi : item.descriptionEn}
                      </p>
                    </div>
                  </div>

                  {/* Card purchase footer */}
                  <div className="pt-6 mt-6 border-t border-sol-border/15 flex items-center justify-between gap-4">
                    
                    {/* Price info */}
                    <div className="flex items-center gap-1">
                      <Coins className="text-sol-accent" size={16} />
                      <span className="text-lg font-black text-sol-text">{item.price}</span>
                    </div>

                    {/* Purchase Button */}
                    <button
                      onClick={() => handleBuy(item.id)}
                      disabled={purchasingId !== null || isOwnedOneTime || (stats?.coins || 0) < item.price}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2
                        ${isOwnedOneTime 
                          ? "bg-sol-border/10 border border-sol-border/30 text-sol-muted" 
                          : visuals.btnColor}
                      `}
                    >
                      {purchasingId === item.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : isOwnedOneTime ? (
                        <>
                          <Check size={14} />
                          {locale === "vi" ? "Đã sở hữu" : "Owned"}
                        </>
                      ) : (
                        locale === "vi" ? "Mua" : "Buy"
                      )}
                    </button>

                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}
