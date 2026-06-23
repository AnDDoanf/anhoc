"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  Flame,
  Coins,
  Sparkles,
  Shield,
  AlertCircle,
  Check
} from "lucide-react";
import { adminService, StreakReward, StreakRewardPayload } from "@/services/adminService";

export default function AdminStreakPage() {
  const t = useTranslations("Streak");

  const [rewards, setRewards] = useState<StreakReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardType, setRewardType] = useState<"milestone" | "specific_day">("milestone");
  const [requiredDays, setRequiredDays] = useState<number | "">("");
  const [specificDate, setSpecificDate] = useState("");
  const [messageEn, setMessageEn] = useState("");
  const [messageVi, setMessageVi] = useState("");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Payload elements
  const [coinsReward, setCoinsReward] = useState<number | "">("");
  const [xpReward, setXpReward] = useState<number | "">("");
  const [rewardItems, setRewardItems] = useState<Array<{ type: string; quantity: number }>>([]);
  const [selectedItemType, setSelectedItemType] = useState("streak_shield");
  const [selectedItemQty, setSelectedItemQty] = useState(1);

  const shopItems = [
    { id: "streak_shield", labelVi: "Khiên Chuỗi", labelEn: "Streak Shield" },
    { id: "skip_guard", labelVi: "Khiên Bỏ Qua", labelEn: "Skip Guard" },
    { id: "xp_booster", labelVi: "Tăng XP", labelEn: "XP Booster" },
    { id: "challenge_ticket", labelVi: "Vé Thách Đấu", labelEn: "Challenge Ticket" },
    { id: "ai_tutor_credits", labelVi: "Lượt Gia Sư AI", labelEn: "AI Tutor Credits" }
  ];

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.listStreakRewards();
      setRewards(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const openCreateForm = () => {
    setIsEditing(true);
    setEditingId(null);
    setName("");
    setDescription("");
    setRewardType("milestone");
    setRequiredDays("");
    setSpecificDate("");
    setMessageEn("");
    setMessageVi("");
    setIsRepeatable(false);
    setIsActive(true);
    setCoinsReward("");
    setXpReward("");
    setRewardItems([]);
  };

  const openEditForm = (reward: StreakReward) => {
    setIsEditing(true);
    setEditingId(reward.id);
    setName(reward.name);
    setDescription(reward.description || "");
    setRewardType(reward.reward_type);
    setRequiredDays(reward.required_days ?? "");
    setSpecificDate(reward.specific_date || "");
    setMessageEn(reward.message_en || "");
    setMessageVi(reward.message_vi || "");
    setIsRepeatable(reward.is_repeatable);
    setIsActive(reward.is_active);

    const payload = reward.reward_payload || {};
    setCoinsReward(payload.coins !== undefined ? payload.coins : "");
    setXpReward(payload.xp !== undefined ? payload.xp : "");
    setRewardItems(payload.items || []);
  };

  const handleAddItem = () => {
    if (selectedItemQty <= 0) return;
    const existing = rewardItems.find(it => it.type === selectedItemType);
    if (existing) {
      setRewardItems(rewardItems.map(it => it.type === selectedItemType ? { ...it, quantity: it.quantity + selectedItemQty } : it));
    } else {
      setRewardItems([...rewardItems, { type: selectedItemType, quantity: selectedItemQty }]);
    }
    setSelectedItemQty(1);
  };

  const handleRemoveItem = (type: string) => {
    setRewardItems(rewardItems.filter(it => it.type !== type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const payload: StreakRewardPayload = {
      name,
      description: description.trim() || null,
      reward_type: rewardType,
      specific_date: rewardType === "specific_day" ? specificDate : null,
      required_days: rewardType === "milestone" ? Number(requiredDays) : null,
      message_en: messageEn.trim() || null,
      message_vi: messageVi.trim() || null,
      is_repeatable: isRepeatable,
      is_active: isActive,
      reward_payload: {
        coins: coinsReward !== "" ? Number(coinsReward) : undefined,
        xp: xpReward !== "" ? Number(xpReward) : undefined,
        items: rewardItems.length > 0 ? rewardItems : undefined
      }
    };

    try {
      setLoading(true);
      setError(null);
      if (editingId) {
        await adminService.updateStreakReward(editingId, payload);
        showSuccess(t("admin.success.update"));
      } else {
        await adminService.createStreakReward(payload);
        showSuccess(t("admin.success.create"));
      }
      setIsEditing(false);
      fetchRewards();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to save reward");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.deleteConfirm"))) return;
    try {
      setLoading(true);
      setError(null);
      await adminService.deleteStreakReward(id);
      showSuccess(t("admin.success.delete"));
      fetchRewards();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Failed to delete reward");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const getItemLabel = (type: string) => {
    return t(`items.${type}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sol-border/25 pb-6">
        <div>
          <h1 className="text-3xl font-black text-sol-text flex items-center gap-2">
            <Flame className="text-sol-accent fill-current" />
            {t("admin.title")}
          </h1>
          <p className="text-sm text-sol-muted mt-1">
            {t("admin.subtitle")}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-2xl bg-sol-accent px-5 py-3 font-bold text-sol-bg hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" />
            {t("admin.createReward")}
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-sol-green/20 bg-sol-green/10 p-4 text-sol-green font-bold text-sm animate-in slide-in-from-top duration-300">
          <Check className="h-5 w-5" />
          {successMsg}
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-500 text-sm animate-in slide-in-from-top duration-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {isEditing ? (
        /* CRUD Edit / Create Form Block */
        <form onSubmit={handleSubmit} className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl animate-in zoom-in-98 duration-200">
          <h2 className="text-xl font-black text-sol-text border-b border-sol-border/10 pb-4">
            {editingId ? t("admin.editReward") : t("admin.createReward")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Fields Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.name")}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                  placeholder="e.g. Day 7 Milestone"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.description")}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-2.5 text-sm text-sol-text focus:border-sol-accent focus:outline-none h-20 resize-none"
                  placeholder="e.g. Awarded on reaching 7 days streak"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.rewardType")}</label>
                  <select
                    value={rewardType}
                    onChange={(e) => setRewardType(e.target.value as any)}
                    className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                  >
                    <option value="milestone">{t("admin.types.milestone")}</option>
                    <option value="specific_day">{t("admin.types.specific_day")}</option>
                  </select>
                </div>

                {rewardType === "milestone" ? (
                  <div>
                    <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.requiredDays")}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={requiredDays}
                      onChange={(e) => setRequiredDays(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                      placeholder="e.g. 7"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.specificDate")}</label>
                    <input
                      type="text"
                      required
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.messageEn")}</label>
                <textarea
                  value={messageEn}
                  onChange={(e) => setMessageEn(e.target.value)}
                  className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-2 text-sm text-sol-text focus:border-sol-accent focus:outline-none h-20 resize-none"
                  placeholder="English congrats popup message"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-sol-text mb-1">{t("admin.fields.messageVi")}</label>
                <textarea
                  value={messageVi}
                  onChange={(e) => setMessageVi(e.target.value)}
                  className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg px-4 py-2 text-sm text-sol-text focus:border-sol-accent focus:outline-none h-20 resize-none"
                  placeholder="Tin nhắn chúc mừng bằng tiếng Việt"
                />
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                {rewardType === "milestone" && (
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-sol-text">
                    <input
                      type="checkbox"
                      checked={isRepeatable}
                      onChange={(e) => setIsRepeatable(e.target.checked)}
                      className="rounded border-sol-border/30 bg-sol-bg text-sol-accent"
                    />
                    {t("admin.fields.isRepeatable")}
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-sol-text">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-sol-border/30 bg-sol-bg text-sol-accent"
                  />
                  {t("admin.fields.isActive")}
                </label>
              </div>
            </div>

            {/* Right Fields Column: Reward Payload Customizer */}
            <div className="space-y-6 bg-sol-bg/20 p-5 rounded-2xl border border-sol-border/20">
              <h3 className="font-bold text-sol-text text-base border-b border-sol-border/10 pb-2 flex items-center gap-2">
                <Sparkles className="text-sol-yellow text-amber-500" />
                {t("admin.rewardsConfig")}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-sol-muted mb-1 uppercase tracking-wider">{t("admin.fields.coins")}</label>
                  <div className="relative">
                    <Coins className="absolute left-3.5 top-3.5 h-4 w-4 text-sol-muted" />
                    <input
                      type="number"
                      min={0}
                      value={coinsReward}
                      onChange={(e) => setCoinsReward(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg pl-10 pr-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-sol-muted mb-1 uppercase tracking-wider">{t("admin.fields.xp")}</label>
                  <div className="relative">
                    <Sparkles className="absolute left-3.5 top-3.5 h-4 w-4 text-sol-muted" />
                    <input
                      type="number"
                      min={0}
                      value={xpReward}
                      onChange={(e) => setXpReward(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-2xl border border-sol-border/30 bg-sol-bg pl-10 pr-4 py-3 text-sm text-sol-text focus:border-sol-accent focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Shop Items Payload Sub-form */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-sol-muted uppercase tracking-wider">{t("admin.fields.items")}</label>
                
                <div className="flex flex-wrap items-center gap-3 bg-sol-bg/40 p-3 rounded-xl border border-sol-border/20">
                  <div className="flex-1 min-w-[150px]">
                    <select
                      value={selectedItemType}
                      onChange={(e) => setSelectedItemType(e.target.value)}
                      className="w-full rounded-xl border border-sol-border/30 bg-sol-bg px-3 py-2 text-xs text-sol-text focus:border-sol-accent focus:outline-none"
                    >
                      {shopItems.map(it => (
                        <option key={it.id} value={it.id}>
                          {t(`items.${it.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-20">
                    <input
                      type="number"
                      min={1}
                      value={selectedItemQty}
                      onChange={(e) => setSelectedItemQty(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-xl border border-sol-border/30 bg-sol-bg px-3 py-2 text-xs text-sol-text text-center focus:border-sol-accent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="rounded-xl bg-sol-accent hover:opacity-90 px-4 py-2 text-xs font-bold text-sol-bg transition-all"
                  >
                    {t("admin.addItem")}
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {rewardItems.length === 0 ? (
                    <p className="text-xs text-sol-muted italic p-2">{t("admin.noItems")}</p>
                  ) : (
                    rewardItems.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-sol-surface border border-sol-border/20 p-3 rounded-xl text-xs font-bold text-sol-text">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-sol-green" />
                          <span>{getItemLabel(it.type)}</span>
                          <span className="text-sol-muted">(x{it.quantity})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.type)}
                          className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 border-t border-sol-border/10 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-2xl border border-sol-border bg-sol-surface px-6 py-3 font-bold text-sol-text hover:bg-sol-bg transition-colors"
            >
              {t("admin.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-sol-green px-6 py-3 font-bold text-sol-bg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {t("admin.save")}
            </button>
          </div>
        </form>
      ) : (
        /* Reward List Grid */
        <div className="space-y-6">
          {loading && rewards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sol-accent border-t-transparent" />
            </div>
          ) : rewards.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-sol-border/30 bg-sol-surface p-12 text-center shadow-sm">
              <Flame className="h-12 w-12 text-sol-muted mx-auto mb-4" />
              <p className="font-bold text-sol-text">{t("admin.empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rewards.map((reward) => {
                const payload = reward.reward_payload || {};
                const items = payload.items || [];

                return (
                  <div
                    key={reward.id}
                    className={`bg-sol-surface border rounded-3xl p-6 flex flex-col justify-between shadow-lg transition-all ${
                      reward.is_active ? "border-sol-border/30 hover:border-sol-accent/30" : "border-sol-border/10 opacity-70"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h3 className="text-lg font-black text-sol-text leading-tight">{reward.name}</h3>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {reward.is_active ? (
                            <span className="rounded-full bg-sol-green/10 px-2.5 py-1 text-[10px] font-black text-sol-green uppercase">
                              {t("admin.statusActive")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-sol-border/20 px-2.5 py-1 text-[10px] font-black text-sol-muted uppercase">
                              {t("admin.statusHidden")}
                            </span>
                          )}
                          <span className="rounded-full bg-sol-accent/10 px-2.5 py-1 text-[10px] font-black text-sol-accent uppercase">
                            {reward.reward_type === "milestone" ? t("admin.types.milestone") : t("admin.types.specific_day")}
                          </span>
                        </div>
                      </div>

                      {reward.description && (
                        <p className="text-xs text-sol-muted mb-4 font-bold">{reward.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4 border-t border-sol-border/10 pt-4 mb-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-sol-muted tracking-wider">
                            {reward.reward_type === "milestone" ? t("admin.fields.requiredDays") : t("admin.fields.specificDate")}
                          </span>
                          <p className="font-black text-sol-text text-sm mt-0.5">
                            {reward.reward_type === "milestone" 
                              ? (reward.is_repeatable ? `${reward.required_days} (Repeat)` : reward.required_days)
                              : reward.specific_date}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-sol-muted tracking-wider">
                            {t("admin.payload")}
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 font-black text-sol-green text-xs mt-0.5">
                            {payload.coins && <span className="flex items-center gap-1"><Coins className="h-3 w-3" />+{payload.coins}</span>}
                            {payload.xp && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />+{payload.xp} XP</span>}
                            {items.length > 0 && <span className="flex items-center gap-1"><Shield className="h-3 w-3" />+{items.length} items</span>}
                          </div>
                        </div>
                      </div>

                      {/* Display items details if configured */}
                      {items.length > 0 && (
                        <div className="bg-sol-bg/30 p-2.5 rounded-xl border border-sol-border/10 mb-4">
                          <span className="text-[9px] uppercase font-black text-sol-muted tracking-widest">{t("admin.itemsList")}</span>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {items.map((it: any, i: number) => (
                              <span key={i} className="text-[10px] font-bold text-sol-text/80 bg-sol-bg px-2 py-0.5 rounded-lg border border-sol-border/20">
                                {getItemLabel(it.type)} (x{it.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-sol-border/10 pt-4 mt-auto">
                      <button
                        onClick={() => openEditForm(reward)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sol-border bg-sol-surface px-4 py-2 text-xs font-bold text-sol-text hover:border-sol-accent hover:text-sol-accent transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {t("admin.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(reward.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-sol-surface px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("admin.delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
