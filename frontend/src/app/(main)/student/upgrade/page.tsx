"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { economyService, StudentStats } from "@/services/economyService";
import { 
  Loader2, 
  Crown,
  Heart,
  Coins,
  Activity,
  Zap,
  Check,
  Plus
} from "lucide-react";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import Hero from "@/components/ui/Hero";

export default function UpgradePage() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"customization" | "talents">("talents");

  // Student Stats & Customization state
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);

  const fetchEconomy = async () => {
    try {
      const econ = await economyService.getStatus();
      setStats(econ.stats);
      
      const inv = await economyService.getInventory();
      setInventory(inv.inventory);
      setEquipped(inv.equipped);
    } catch (err) {
      console.error("Failed to load student economy:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchEconomy();
  }, []);

  const handleUpgrade = async (upgradeType: string) => {
    if (upgradingId) return;
    setUpgradingId(upgradeType);
    try {
      const res = await economyService.spendLevelPoint(upgradeType);
      if (res.success) {
        setStats(res.stats);
        window.dispatchEvent(new Event("student-stats-updated"));
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to upgrade talent");
    } finally {
      setUpgradingId(null);
    }
  };

  const handleEquip = async (category: string, itemId: string) => {
    const isCurrentlyEquipped = equipped[category] === itemId;
    const targetItemId = isCurrentlyEquipped ? "" : itemId; // toggle equip/unequip
    
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

  // Group customization inventory by category
  const getCategorizedCustomizations = () => {
    const categories: Record<string, { label: string; items: any[] }> = {
      avatar: { label: locale === "vi" ? "Ảnh đại diện" : "Avatars", items: [] },
      frame: { label: locale === "vi" ? "Khung hồ sơ" : "Profile Frames", items: [] },
      title: { label: locale === "vi" ? "Danh hiệu" : "Titles", items: [] },
      background: { label: locale === "vi" ? "Hình nền" : "Profile Backgrounds", items: [] },
      theme: { label: locale === "vi" ? "Giao diện" : "App Themes", items: [] }
    };

    inventory.forEach(item => {
      if (item.itemId.startsWith("avatar")) {
        categories.avatar.items.push(item);
      } else if (item.itemId.startsWith("frame")) {
        categories.frame.items.push(item);
      } else if (item.itemId.startsWith("title")) {
        categories.title.items.push(item);
      } else if (item.itemId.startsWith("bg")) {
        categories.background.items.push(item);
      } else if (item.itemId.startsWith("theme")) {
        categories.theme.items.push(item);
      }
    });

    return categories;
  };

  const categorizedItems = getCategorizedCustomizations();

  return (
    <ProtectedRoute requiredRole="student">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        
        {/* Hero Banner */}
        <Hero
          icon={<Zap size={112} className="text-sol-accent md:h-40 md:w-40" />}
          className="md:rounded-[3rem]"
          containerClassName="relative z-10 flex w-full flex-col items-start gap-4 lg:max-w-4xl lg:flex-row lg:justify-between"
        >
          <div className="space-y-3 md:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
              <Zap size={11} className="md:h-3.5 md:w-3.5" />
              <span>{locale === "vi" ? "NÂNG CẤP & THIÊN PHÚ" : "UPGRADE & TALENTS"}</span>
            </div>
            <h1 className="max-w-[15ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
              {locale === "vi" ? "Nâng cấp & Thiên phú" : "Upgrade & Talents"}
            </h1>
            <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl font-medium">
              {locale === "vi" 
                ? "Sử dụng điểm cấp độ để nâng cấp năng lực thiên phú và trang trí hồ sơ cá nhân của bạn." 
                : "Spend your level-up points to unlock passive boost talents and customize your profile cosmetics."}
            </p>
          </div>
        </Hero>

        {/* Tab Headers */}
        <div className="flex border-b border-sol-border/30 max-w-2xl mx-auto gap-4">
          <button
            onClick={() => setActiveTab("talents")}
            className={`flex-1 pb-4 text-sm font-black uppercase tracking-wider text-center border-b-2 transition-all duration-300 hover:cursor-pointer ${
              activeTab === "talents"
                ? "border-sol-accent text-sol-accent"
                : "border-transparent text-sol-muted hover:text-sol-accent"
            }`}
          >
            {locale === "vi" ? "Thiên phú & Nâng cấp" : "Talents & Upgrades"}
          </button>
          <button
            onClick={() => setActiveTab("customization")}
            className={`flex-1 pb-4 text-sm font-black uppercase tracking-wider text-center border-b-2 transition-all duration-300 hover:cursor-pointer ${
              activeTab === "customization"
                ? "border-sol-accent text-sol-accent"
                : "border-transparent text-sol-muted hover:text-sol-accent"
            }`}
          >
            {locale === "vi" ? "Cá nhân hóa hồ sơ" : "Profile Customization"}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="max-w-2xl mx-auto w-full">
          
          {/* Tab 1: Profile Customization */}
          {activeTab === "customization" && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
              
              <div className="space-y-6 relative z-10">
                <h2 className="text-2xl font-black text-sol-text flex items-center gap-2 border-b border-sol-border/20 pb-4">
                  <Crown className="text-sol-accent" size={22} />
                  {locale === "vi" ? "Trang Trí Hồ Sơ" : "Customize Profile"}
                </h2>
                
                {loadingStats ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-sol-accent" size={32} />
                  </div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-sol-border/30 rounded-2xl bg-sol-bg/30 text-sol-muted font-bold text-sm">
                    {locale === "vi" 
                      ? "Bạn chưa mua vật phẩm trang trí nào. Hãy ghé Cửa hàng nhé!" 
                      : "No customization items unlocked yet. Visit the Shop to unlock items!"}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(categorizedItems).map(([category, catData]) => {
                      if (catData.items.length === 0) return null;

                      return (
                        <div key={category} className="space-y-3">
                          <h3 className="text-sm font-black uppercase tracking-wider text-sol-muted">
                            {catData.label}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {catData.items.map((item) => {
                              const isEquipped = equipped[category] === item.itemId;

                              return (
                                <div
                                  key={item.itemId}
                                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4
                                    ${isEquipped 
                                      ? "bg-sol-accent/10 border-sol-accent text-sol-text" 
                                      : "bg-sol-bg/50 border-sol-border/20 text-sol-text hover:border-sol-accent/30"}
                                  `}
                                >
                                  <div className="space-y-1">
                                    <p className="font-bold text-sm">
                                      {locale === "vi" ? item.titleVi : item.titleEn}
                                    </p>
                                    <p className="text-[10px] text-sol-muted font-semibold leading-none">
                                      {locale === "vi" ? item.descriptionVi : item.descriptionEn}
                                    </p>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleEquip(category, item.itemId)}
                                    disabled={equippingId !== null}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300 flex items-center gap-1.5 hover:cursor-pointer
                                      ${isEquipped 
                                        ? "bg-sol-accent text-sol-bg hover:opacity-90" 
                                        : "bg-sol-surface border border-sol-border/30 text-sol-text hover:border-sol-accent hover:text-sol-accent"}
                                    `}
                                  >
                                    {equippingId === item.itemId ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : isEquipped ? (
                                      <>
                                        <Check size={12} />
                                        {locale === "vi" ? "Dùng" : "Equipped"}
                                      </>
                                    ) : (
                                      locale === "vi" ? "Trang bị" : "Equip"
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Talents & Level Points Upgrades */}
          {activeTab === "talents" && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between border-b border-sol-border/20 pb-4 gap-4">
                  <h2 className="text-2xl font-black text-sol-text flex items-center gap-2">
                    <Zap className="text-sol-accent" size={22} />
                    {locale === "vi" ? "Thiên Phú Nâng Cấp" : "Level Up Talents"}
                  </h2>
                  
                  {stats && (
                    <div className="flex items-center gap-1.5 bg-sol-accent/10 border border-sol-accent/20 px-3.5 py-1.5 rounded-full">
                      <Zap className="text-sol-accent animate-pulse" size={14} />
                      <span className="text-xs font-black uppercase text-sol-accent tracking-wider">
                        {locale === "vi" ? `ĐIỂM: ${stats.level_points}` : `POINTS: ${stats.level_points}`}
                      </span>
                    </div>
                  )}
                </div>

                {loadingStats ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-sol-accent" size={32} />
                  </div>
                ) : !stats ? (
                  <div className="text-center py-6 text-sol-muted font-bold text-sm">
                    {locale === "vi" ? "Không có dữ liệu nâng cấp." : "No upgrades data available."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Upgrades List */}
                    {[
                      { 
                        id: "extra_lives", 
                        title: locale === "vi" ? "Tối Đa Tim Thêm (+1 Tim)" : "Max Lives (+1 Heart)",
                        desc: locale === "vi" ? "Tăng thêm 1 tim tối đa cho bạn. Tối đa mua được 3 lần." : "Increase your maximum lives limit by 1. Up to 3 times.",
                        current: `${(stats.upgrades as any)?.extra_lives_from_points || 0} / 3`,
                        cost: 10,
                        disabled: ((stats.upgrades as any)?.extra_lives_from_points || 0) >= 3 || stats.level_points < 10,
                        icon: <Heart size={20} className="text-sol-orange fill-sol-orange" />
                      },
                      { 
                        id: "coin_bonus", 
                        title: locale === "vi" ? "Tiền Thưởng Ancoin (+5%)" : "Ancoin Bonus (+5% Coins)",
                        desc: locale === "vi" ? "Nhận thêm 5% Ancoin sau mỗi lần hoàn thành luyện tập." : "Add 5% bonus coins to all future practice completions.",
                        current: `+${(stats.upgrades as any)?.coin_bonus_pct || 0}%`,
                        cost: 1,
                        disabled: stats.level_points < 1,
                        icon: <Coins size={20} className="text-sol-accent" />
                      },
                      { 
                        id: "xp_bonus", 
                        title: locale === "vi" ? "Kinh Nghiệm Nhân Lên (+5% XP)" : "XP Boost (+5% XP)",
                        desc: locale === "vi" ? "Nhận thêm 5% điểm kinh nghiệm (XP) sau mỗi hoạt động học tập." : "Add 5% bonus XP to all future learning actions.",
                        current: `+${(stats.upgrades as any)?.xp_bonus_pct || 0}%`,
                        cost: 1,
                        disabled: stats.level_points < 1,
                        icon: <Activity size={20} className="text-pink-500" />
                      },
                      { 
                        id: "game_duration_bonus", 
                        title: locale === "vi" ? "Tăng Giờ Chơi (+5 giây)" : "Game Duration (+5 Seconds)",
                        desc: locale === "vi" ? "Thêm 5 giây vào thời gian giới hạn của các chế độ chơi toán." : "Add 5 extra seconds to standard game mode durations.",
                        current: `+${(stats.upgrades as any)?.game_duration_bonus || 0}s`,
                        cost: 1,
                        disabled: stats.level_points < 1,
                        icon: <Zap size={20} className="text-sol-yellow text-amber-500" />
                      },
                      { 
                        id: "extra_attempts", 
                        title: locale === "vi" ? "Mua Vé Thách Đấu (+1 Lượt)" : "Extra Attempts (+1 Attempt)",
                        desc: locale === "vi" ? "Nhận thêm 1 lượt tham gia thử thách game đấu trí. Tối đa mua được 5 lần." : "Add 1 additional active challenge attempt to your limit. Up to 5 times.",
                        current: `${(stats.upgrades as any)?.extra_game_attempts || 0} / 5`,
                        cost: 10,
                        disabled: ((stats.upgrades as any)?.extra_game_attempts || 0) >= 5 || stats.level_points < 10,
                        icon: <Crown size={20} className="text-purple-500" />
                      }
                    ].map((talent) => (
                      <div
                        key={talent.id}
                        className="p-5 rounded-2xl bg-sol-bg/50 border border-sol-border/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-sol-accent/30"
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 p-3 bg-sol-surface rounded-xl border border-sol-border/30 h-fit">
                            {talent.icon}
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sol-text text-sm flex items-center gap-2">
                              {talent.title}
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sol-border/20 text-sol-muted">
                                {locale === "vi" ? `Hiện có: ${talent.current}` : `Current: ${talent.current}`}
                              </span>
                            </h4>
                            <p className="text-xs text-sol-muted leading-relaxed font-medium">
                              {talent.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleUpgrade(talent.id)}
                          disabled={upgradingId !== null || talent.disabled}
                          className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sol-accent text-sol-bg text-xs font-black uppercase tracking-wider hover:cursor-pointer hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {upgradingId === talent.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Plus size={12} />
                              {locale === "vi" ? `Nâng cấp (${talent.cost} đ)` : `Upgrade (${talent.cost} pt)`}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}
