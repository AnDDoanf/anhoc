"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { adminService, type AdminLessonRef, type AdminUserInsights } from "@/services/adminService";
import { Activity, ArrowLeft, BookOpen, CalendarDays, Clock, Eye, Loader2, Mail, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminUserInsightPage() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [insights, setInsights] = useState<AdminUserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminService.getUserInsights(userId);
        setInsights(data);
      } catch (err) {
        console.error("Failed to fetch user insights:", err);
        setError(t("userDetail.error"));
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchInsights();
    }
  }, [userId, t]);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-sol-border/30 bg-sol-surface px-4 py-2 text-sm font-black text-sol-muted transition hover:border-sol-accent/40 hover:text-sol-accent"
        >
          <ArrowLeft size={16} />
          {t("userDetail.backToDashboard")}
        </Link>

        {loading && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-lg border border-sol-border/10 bg-sol-surface p-8">
            <Loader2 className="animate-spin text-sol-accent" size={36} />
            <p className="font-black text-sol-muted">{t("userDetail.loading")}</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 font-black text-red-500">
            {error}
          </div>
        )}

        {insights && !loading && (
          <UserInsightsDashboard insights={insights} locale={locale} t={t} />
        )}
      </div>
    </ProtectedRoute>
  );
}

function UserInsightsDashboard({
  insights,
  locale,
  t,
}: {
  insights: AdminUserInsights;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const detailCards = [
    { label: t("userDetail.metrics.level"), value: insights.summary.level, icon: Sparkles },
    { label: t("userDetail.metrics.xp"), value: insights.summary.totalXp, icon: Zap },
    { label: t("userDetail.metrics.average"), value: `${Math.round(insights.summary.avgScore)}%`, icon: Target },
    { label: t("userDetail.metrics.best"), value: `${Math.round(insights.summary.bestScore)}%`, icon: Trophy },
    { label: t("userDetail.metrics.attempts"), value: insights.summary.attempts, icon: Activity },
    { label: t("userDetail.metrics.completedLessons"), value: insights.summary.completedLessons, icon: BookOpen },
  ];

  return (
    <>
      <section className="rounded-lg border border-sol-border/10 bg-sol-surface shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-sol-border/10 bg-sol-bg/40 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 pill-badge inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black uppercase tracking-[0.28em]">
              <Sparkles size={15} />
              {t("userDetail.eyebrow")}
            </div>
            <h1 className="truncate text-3xl font-black text-sol-text sm:text-4xl">
              {insights.user.username}
            </h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-sol-muted">
              <span className="inline-flex items-center gap-2">
                <Mail size={15} />
                {insights.user.email}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={15} />
                {t("userDetail.joined", {
                  date: new Date(insights.user.created_at).toLocaleDateString(locale),
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-6">
          {detailCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-sol-border/10 bg-sol-bg/40 p-4">
              <card.icon className="mb-3 text-sol-accent" size={20} />
              <div className="text-[10px] font-black uppercase tracking-widest text-sol-muted">
                {card.label}
              </div>
              <div className="mt-1 text-2xl font-black text-sol-text">{card.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InsightBlock title={t("userDetail.recentAttempts")}>
          <div className="space-y-2">
            {insights.recentAttempts.length === 0 ? (
              <EmptyText text={t("userDetail.emptyAttempts")} />
            ) : (
              insights.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between gap-4 rounded-lg bg-sol-bg/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-sol-text">
                      {getLessonTitle(attempt.lesson, locale, t("userDetail.unassignedLesson"))}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-sol-muted">
                      <Clock size={13} />
                      {format(new Date(attempt.started_at), "HH:mm, MMM d")}
                      <span>{attempt.question_count} {t("userDetail.questions")}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ScoreBadge score={attempt.total_score} />
                    <Link
                      href={`/admin/users/${insights.user.id}/attempts/${attempt.id}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-sol-border/30 px-3 py-2 text-xs font-black text-sol-text transition hover:border-sol-accent/50 hover:text-sol-accent"
                    >
                      <Eye size={14} />
                      {t("userDetail.viewAnswers")}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </InsightBlock>

        <InsightBlock title={t("userDetail.lessonMastery")}>
          <div className="space-y-3">
            {insights.mastery.length === 0 ? (
              <EmptyText text={t("userDetail.emptyMastery")} />
            ) : (
              insights.mastery.map((record) => (
                <div key={record.lesson_id} className="space-y-2 rounded-lg bg-sol-bg/40 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="truncate font-black text-sol-text">
                      {getLessonTitle(record.lesson, locale, t("userDetail.unassignedLesson"))}
                    </div>
                    <span className="text-xs font-black text-sol-accent">
                      {Math.round(record.mastery_score)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-sol-border/30">
                    <div
                      className="h-2 rounded-full bg-sol-accent"
                      style={{ width: `${Math.min(Math.max(record.mastery_score, 0), 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-sol-muted">
                    {getStatusLabel(record.completion_status, t)} - {formatMinutes(record.total_study_time, t)}
                  </div>
                </div>
              ))
            )}
          </div>
        </InsightBlock>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InsightBlock title={t("userDetail.achievements")}>
          <div className="space-y-2">
            {insights.achievements.length === 0 ? (
              <EmptyText text={t("userDetail.emptyAchievements")} />
            ) : (
              insights.achievements.map((record) => (
                <div key={`${record.achievement.id}-${record.earned_at}`} className="flex items-center justify-between gap-4 rounded-lg bg-sol-bg/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-sol-text">
                      {locale === "vi" ? record.achievement.title_vi : record.achievement.title_en}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sol-muted">
                      {format(new Date(record.earned_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <span className="rounded-lg bg-sol-accent/10 px-2 py-1 text-xs font-black text-sol-accent">
                    +{record.achievement.xp_reward} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </InsightBlock>

        <InsightBlock title={t("userDetail.xpHistory")}>
          <div className="space-y-2">
            {insights.xpLogs.length === 0 ? (
              <EmptyText text={t("userDetail.emptyXp")} />
            ) : (
              insights.xpLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-4 rounded-lg bg-sol-bg/40 p-3">
                  <div className="min-w-0">
                    <div className="truncate font-black text-sol-text">
                      {formatReason(log.reason)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sol-muted">
                      {format(new Date(log.occurred_at), "MMM d, yyyy")}
                    </div>
                  </div>
                  <span className="font-black text-green-500">+{log.amount}</span>
                </div>
              ))
            )}
          </div>
        </InsightBlock>
      </div>
    </>
  );
}

function InsightBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-sol-border/10 bg-sol-surface p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-sol-text">{title}</h2>
      {children}
    </section>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${score >= 80 ? "bg-green-500/10 text-green-500" : "bg-sol-orange/10 text-sol-orange"}`}>
      {Math.round(score)}%
    </span>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-lg bg-sol-bg/40 p-4 text-sm font-bold text-sol-muted">{text}</p>;
}

function getLessonTitle(lesson: AdminLessonRef | null | undefined, locale: string, fallback: string) {
  if (!lesson) return fallback;
  return locale === "vi" ? lesson.title_vi : lesson.title_en;
}

function getStatusLabel(status: string, t: ReturnType<typeof useTranslations>) {
  const labels: Record<string, string> = {
    not_started: t("userDetail.status.notStarted"),
    in_progress: t("userDetail.status.inProgress"),
    completed: t("userDetail.status.completed"),
  };

  return labels[status] || status.replaceAll("_", " ");
}

function formatMinutes(seconds: number, t: ReturnType<typeof useTranslations>) {
  const minutes = Math.round(seconds / 60);
  return t("userDetail.studyTime", { minutes });
}

function formatReason(reason: string) {
  return reason.replaceAll("_", " ");
}
