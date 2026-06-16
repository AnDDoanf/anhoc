// frontend/src/app/(main)/student/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import { economyService, StudentStats } from "@/services/economyService";
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  User, 
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

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const locale = useLocale();
  
  // Tab control
  const [activeTab, setActiveTab] = useState<"security" | "customization" | "talents">("talents");

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t("passwordMismatch") });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await authService.updatePassword({ currentPassword, newPassword });
      setMessage({ type: "success", text: t("passwordSuccess") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage({ type: "error", text: t("passwordError") });
    } finally {
      setLoading(false);
    }
  };

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
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Hero Banner */}
        <Hero
          icon={<ShieldCheck size={160} className="text-sol-accent md:h-[260px] md:w-[260px]" />}
          iconPosition="bottom-right"
          className="md:rounded-[3rem]"
          containerClassName="relative z-10 flex w-full flex-col items-start gap-5 lg:max-w-2xl"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-sol-accent">
              <User size={12} />
              <span>{t("userSettings")}</span>
            </div>
            <h1 className="text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:text-6xl">
              {t("userSettings")}
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-sol-muted md:text-lg font-medium">
              {locale === "vi" 
                ? "Quản lý bảo mật, cá nhân hóa hồ sơ và phân bổ tài năng cấp độ của bạn." 
                : "Manage your account security, equip cosmetics, and allocate your level-up talents."}
            </p>
          </div>
        </Hero>

        {/* Tab Headers */}
        <div className="flex border-b border-sol-border/30 max-w-2xl mx-auto gap-4">
          <button
            onClick={() => setActiveTab("talents")}
            className={`flex-1 pb-4 text-sm font-black uppercase tracking-wider text-center border-b-2 transition-all duration-300 ${
              activeTab === "talents"
                ? "border-sol-accent text-sol-accent"
                : "border-transparent text-sol-muted hover:text-sol-accent"
            }`}
          >
            {locale === "vi" ? "Thiên phú & Nâng cấp" : "Talents & Upgrades"}
          </button>
          <button
            onClick={() => setActiveTab("customization")}
            className={`flex-1 pb-4 text-sm font-black uppercase tracking-wider text-center border-b-2 transition-all duration-300 ${
              activeTab === "customization"
                ? "border-sol-accent text-sol-accent"
                : "border-transparent text-sol-muted hover:text-sol-accent"
            }`}
          >
            {locale === "vi" ? "Cá nhân hóa hồ sơ" : "Profile Customization"}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 pb-4 text-sm font-black uppercase tracking-wider text-center border-b-2 transition-all duration-300 ${
              activeTab === "security"
                ? "border-sol-accent text-sol-accent"
                : "border-transparent text-sol-muted hover:text-sol-accent"
            }`}
          >
            {locale === "vi" ? "Bảo mật & Tài khoản" : "Security & Account"}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="max-w-2xl mx-auto w-full">
          
          {/* Tab 1: Security & Password */}
          {activeTab === "security" && (
            <div className="bg-sol-surface border border-sol-border/30 rounded-3xl p-8 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sol-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-sol-accent/10 transition-colors duration-500" />
              
              <form onSubmit={handlePasswordSubmit} className="space-y-6 relative z-10">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-sol-muted px-1 flex items-center gap-2">
                      <KeyRound size={14} />
                      {t("currentPassword")}
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sol-muted px-1">
                        {t("newPassword")}
                      </label>
                      <div className="relative">
                        <input
                          type={showNew ? "text" : "password"}
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
                        >
                          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-sol-muted px-1">
                        {t("confirmPassword")}
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? "text" : "password"}
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-sol-bg/50 border border-sol-border/30 rounded-2xl px-4 py-3 pr-12 text-sol-text focus:outline-none focus:ring-2 focus:ring-sol-accent/20 focus:border-sol-accent transition-all duration-300"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-sol-muted hover:text-sol-accent transition-colors"
                        >
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {message && (
                  <div
                    className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${
                      message.type === "success"
                        ? "bg-sol-accent/10 border border-sol-accent/20 text-sol-accent"
                        : "bg-sol-orange/10 border border-sol-orange/20 text-sol-orange"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle2 size={18} className="shrink-0" />
                    ) : (
                      <AlertCircle size={18} className="shrink-0" />
                    )}
                    <p className="text-sm font-bold">{message.text}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sol-accent text-sol-bg font-black py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-sol-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {t("updating")}
                    </>
                  ) : (
                    t("updatePassword")
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Profile Customization */}
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
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all duration-300 flex items-center gap-1.5
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

          {/* Tab 3: Talents & Level Points Upgrades */}
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
                          className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sol-accent text-sol-bg text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
