"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Flame,
  Coins,
  Sparkles,
  Shield,
  Award,
  Lock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  economyService,
  StreakStatusResponse,
  PrecalculatedReward,
  MilestoneClaim
} from "@/services/economyService";

interface DailyLoginCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (status: StreakStatusResponse) => void;
}

export default function DailyLoginCalendarModal({
  isOpen,
  onClose,
  onStatusUpdate
}: DailyLoginCalendarModalProps) {
  const t = useTranslations("Streak");
  const commonT = useTranslations("Common");
  const locale = useLocale();

  const [status, setStatus] = useState<StreakStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<MilestoneClaim[]>([]);
  const [showMilestoneAlert, setShowMilestoneAlert] = useState(false);
  const [questsExpanded, setQuestsExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await economyService.getStreakStatus();
      setStatus(data);
      if (onStatusUpdate) {
        onStatusUpdate(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [onStatusUpdate, t]);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMilestones([]);
      setShowMilestoneAlert(false);
    }
  }, [isOpen, fetchStatus]);

  if (!isOpen) return null;

  const handleClaim = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await economyService.claimDailyReward();
      setStatus(res.status);
      if (onStatusUpdate) {
        onStatusUpdate(res.status);
      }
      window.dispatchEvent(new Event("student-stats-updated"));
      if (res.milestoneClaims && res.milestoneClaims.length > 0) {
        setMilestones(res.milestoneClaims);
        setShowMilestoneAlert(true);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || t("claimError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecover = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setError(null);
      const updatedStatus = await economyService.recoverStreak();
      setStatus(updatedStatus);
      if (onStatusUpdate) {
        onStatusUpdate(updatedStatus);
      }
      window.dispatchEvent(new Event("student-stats-updated"));
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || t("recoverError"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setError(null);
      const updatedStatus = await economyService.resetStreak();
      setStatus(updatedStatus);
      if (onStatusUpdate) {
        onStatusUpdate(updatedStatus);
      }
      window.dispatchEvent(new Event("student-stats-updated"));
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || t("resetError"));
    } finally {
      setActionLoading(false);
    }
  };

  const getItemName = (itemId: string) => {
    return t(`items.${itemId}`);
  };

  const renderRewardIcon = (reward: PrecalculatedReward) => {
    switch (reward.rewardType) {
      case "coins":
        return <Coins className="h-6 w-6 text-yellow-500 animate-pulse" />;
      case "xp":
        return <Sparkles className="h-6 w-6 text-sol-accent" />;
      case "shop_item":
        return <Shield className="h-6 w-6 text-sol-green" />;
      case "badge":
        return <Award className="h-6 w-6 text-sol-yellow" />;
      default:
        return <HelpCircle className="h-6 w-6 text-sol-muted" />;
    }
  };

  const renderRewardAmount = (reward: PrecalculatedReward) => {
    if (reward.rewardType === "coins") {
      return t("coins", { amount: reward.rewardAmount });
    }
    if (reward.rewardType === "xp") {
      return t("xp", { amount: reward.rewardAmount });
    }
    if (reward.rewardType === "shop_item" && reward.itemId) {
      return getItemName(reward.itemId);
    }
    return t("badge");
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center bg-sol-bg/80 backdrop-blur-sm p-4 overflow-y-auto md:items-center">
      <div className="relative my-auto w-full max-w-6xl rounded-3xl border border-sol-border/30 bg-sol-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200 md:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-sol-muted hover:bg-sol-bg hover:text-sol-text transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-sol-surface/80 rounded-3xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sol-accent border-t-transparent" />
          </div>
        )}

        {/* Milestone Unlocked Modal Overlay */}
        {showMilestoneAlert && milestones.length > 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-sol-surface/95 rounded-3xl p-6 animate-in fade-in duration-300">
            <div className="w-full max-h-full overflow-y-auto flex flex-col items-center text-center py-4">
              <Trophy className="h-20 w-20 text-yellow-500 mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-sol-text mb-2">{t("milestoneUnlocked")}</h2>
              
              <div className="max-w-md space-y-4 my-4">
                {milestones.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-sol-border/20 bg-sol-bg/50">
                    <h4 className="font-bold text-sol-accent">{m.name}</h4>
                    <p className="text-sm text-sol-text/80 mt-1">
                      {locale === "vi" ? m.message_vi : m.message_en}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs font-bold text-sol-green">
                      {m.payload.coins && <span>+{t("coins", { amount: m.payload.coins })}</span>}
                      {m.payload.xp && <span>+{t("xp", { amount: m.payload.xp })}</span>}
                      {m.payload.items && m.payload.items.map((it, i) => (
                        <span key={i}>+{it.quantity} {getItemName(it.type)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowMilestoneAlert(false);
                  setMilestones([]);
                }}
                className="mt-4 rounded-2xl bg-sol-green px-8 py-3 font-black text-sol-bg hover:scale-105 transition-transform"
              >
                {commonT("confirm")}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-sol-border/20 pb-6 mb-6 gap-4">
          <div className="flex items-center gap-4 pr-12 md:pr-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 shrink-0">
              <Flame className="h-8 w-8 fill-current" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-sol-text tracking-tight leading-tight">{t("title")}</h1>
              <p className="text-xs md:text-sm text-sol-muted mt-0.5">
                {status ? t("currentStreak", { count: status.currentStreak }) : "..."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:flex md:w-auto md:items-center md:gap-6 mt-2 md:mt-0">
            <div className="bg-sol-bg/30 rounded-xl p-3 border border-sol-border/10 text-center md:bg-transparent md:border-0 md:p-0 md:text-right">
              <div className="text-[10px] md:text-xs text-sol-muted uppercase tracking-wider font-bold">{t("longestStreakLabel")}</div>
              <div className="text-base md:text-lg font-black text-sol-text whitespace-nowrap">
                {status ? t("days", { count: status.longestStreak }) : t("days", { count: 0 })}
              </div>
            </div>
            <div className="bg-sol-bg/30 rounded-xl p-3 border border-sol-border/10 text-center md:bg-transparent md:border-0 md:p-0 md:text-right border-l-0 md:border-l md:border-sol-border/20 md:pl-6">
              <div className="text-[10px] md:text-xs text-sol-muted uppercase tracking-wider font-bold">{t("weeklyStreakLabel")}</div>
              <div className="text-base md:text-lg font-black text-sol-text whitespace-nowrap">
                {status ? t("weeks", { count: status.weeklyStreak }) : t("weeks", { count: 0 })}
              </div>
            </div>
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {/* Streak Recovery Alert */}
        {status?.needsRecovery && (
          <div className="mb-6 rounded-2xl border border-sol-accent/30 bg-sol-accent/10 p-5 animate-pulse">
            <div className="flex items-center gap-3 text-sol-accent font-black text-lg">
              <AlertCircle className="h-6 w-6" />
              <h2>{t("needRecoveryTitle")}</h2>
            </div>
            <p className="text-sm text-sol-text/90 mt-2">{t("needRecoveryDesc")}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <button
                disabled={actionLoading || status.streakShields <= 0}
                onClick={handleRecover}
                className="inline-flex items-center gap-2 rounded-2xl bg-sol-accent px-5 py-3 font-bold text-sol-bg hover:scale-102 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                <Shield className="h-4 w-4" />
                {t("useShield", { count: status.streakShields })}
              </button>
              <button
                disabled={actionLoading}
                onClick={handleReset}
                className="rounded-2xl border border-sol-border bg-sol-surface px-5 py-3 font-bold text-sol-text hover:bg-sol-bg transition-colors"
              >
                {t("resetStreak")}
              </button>
              {status.streakShields <= 0 && (
                <span className="text-xs text-sol-accent font-bold">
                  {t("noShields")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Daily Quests Accordion */}
        {status?.dailyQuests && (
          <div className="mb-6 rounded-2xl border border-sol-border/20 bg-sol-bg/20 overflow-hidden">
            <button
              onClick={() => setQuestsExpanded(!questsExpanded)}
              className="w-full flex items-center justify-between p-4 bg-sol-bg/30 hover:bg-sol-bg/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-sol-text">{t("dailyQuests")}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sol-accent/15 text-sol-accent">
                  {t("completedCount", {
                    completed: status.dailyQuests.filter((q: any) => q.is_completed).length,
                    total: status.dailyQuests.length
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-sol-muted">
                <span className="hidden sm:inline">{questsExpanded ? t("collapse") : t("expand")}</span>
                {questsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </button>

            {/* Collapsible Panel */}
            {questsExpanded && (
              <div className="p-4 border-t border-sol-border/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                {status.dailyQuests.map((quest) => {
                  const percentage = Math.min(100, (quest.current_count / quest.target_count) * 100);
                  const questLabel = t(`questTypes.${quest.quest_type}`, { target: quest.target_count });

                  return (
                    <div
                      key={quest.id}
                      className={`p-3.5 rounded-xl border transition-all duration-300 ${
                        quest.is_completed
                          ? "border-sol-green/30 bg-sol-green/5"
                          : "border-sol-border/20 bg-sol-bg/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="font-bold text-xs text-sol-text line-clamp-2 min-h-[32px]">{questLabel}</div>
                        {quest.is_completed ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-sol-green shrink-0" />
                        ) : (
                          <span className="text-[10px] font-bold text-sol-accent whitespace-nowrap">+{quest.xp_reward} XP</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-sol-border/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              quest.is_completed ? "bg-sol-green" : "bg-sol-accent"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-sol-muted whitespace-nowrap">
                          {quest.current_count} / {quest.target_count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 14-Day Reward Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-sol-text">{t("rewardsCalendar")}</h3>
            {status?.canClaimToday && (
              <button
                disabled={actionLoading}
                onClick={handleClaim}
                className="rounded-2xl bg-sol-green px-5 py-2.5 text-sm font-black text-sol-bg hover:scale-105 transition-transform"
              >
                {t("claimReward")}
              </button>
            )}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {status?.precalculatedRewards.map((reward, idx) => {
              const isClaimed = reward.claimed;
              const isToday = reward.dateStr === getUtcDateStr();
              const isQuestDone = status.dailyQuests.some((q: any) => q.is_completed);

              // A day is "lock" if it's in the future
              const isFuture = reward.dateStr > getUtcDateStr();
              // A day is "locked and failed" if it's in the past and was not completed/claimed
              const isPast = reward.dateStr < getUtcDateStr();

              let bgClass = "bg-sol-bg/50 border-sol-border/20 text-sol-muted";
              let statusBadge = "";

              if (isClaimed) {
                bgClass = "bg-sol-green/10 border-sol-green/30 text-sol-green";
                statusBadge = t("claimed");
              } else if (isToday) {
                if (isQuestDone) {
                  bgClass = "bg-sol-accent/20 border-2 border-sol-accent text-sol-text shadow-[0_0_15px_rgba(var(--sol-accent-rgb),0.3)] animate-bounce";
                  statusBadge = t("claimReward");
                } else {
                  bgClass = "bg-sol-bg border-2 border-sol-accent text-sol-text shadow-[0_0_10px_rgba(var(--sol-accent-rgb),0.2)]";
                  statusBadge = "";
                }
              } else if (isFuture) {
                bgClass = "bg-sol-bg/20 border-sol-border/10 text-sol-muted/50";
                statusBadge = "";
              } else if (isPast) {
                bgClass = "bg-red-500/5 border-red-500/10 text-red-500/60";
                statusBadge = t("missed");
              }

              return (
                <div
                  key={idx}
                  className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all duration-300 min-h-[115px] ${bgClass}`}
                >
                  <div className="text-[11px] font-bold uppercase opacity-80">
                    {t("dayIndex", { count: idx + 1 })}
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    {isClaimed ? (
                      <CheckCircle2 className="h-6 w-6 text-sol-green" />
                    ) : isToday && isQuestDone ? (
                      <button
                        disabled={actionLoading}
                        onClick={handleClaim}
                        className="h-9 w-9 rounded-full bg-sol-accent text-sol-bg flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                        title={t("claimReward")}
                      >
                        <Sparkles className="h-5 w-5 fill-current" />
                      </button>
                    ) : isFuture ? (
                      <Lock className="h-6 w-6 text-sol-muted/30" />
                    ) : (
                      renderRewardIcon(reward)
                    )}
                  </div>

                  <div className="text-[11px] font-bold tracking-tight whitespace-normal break-words max-w-full leading-tight">
                    {renderRewardAmount(reward)}
                  </div>

                  {statusBadge && (
                    <div className={`text-[9px] font-bold mt-1 px-1 py-0.5 rounded ${
                      isClaimed ? "bg-sol-green/20" : isToday ? "bg-sol-accent/20 text-sol-accent" : "bg-sol-border/20"
                    }`}>
                      {statusBadge}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function getUtcDateStr(date: Date = new Date()): string {
  return date.toISOString().split("T")[0]!;
}
