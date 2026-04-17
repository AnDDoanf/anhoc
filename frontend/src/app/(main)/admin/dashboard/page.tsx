"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminService, type AdminLessonRef } from "@/services/adminService";
import { Activity, Award, BookOpen, Trophy, Users, Zap } from "lucide-react";
import { format } from "date-fns";

type TopUser = {
  id: string;
  username: string;
  email: string;
  attempts: number;
  xp: number;
};

type RecentActivity = {
  id: string;
  total_score: number;
  started_at: string;
  user?: {
    id: string;
    username: string;
    email?: string;
  } | null;
  lesson?: AdminLessonRef | null;
};

type DashboardStats = {
  summary: {
    users: number;
    lessons: number;
    attempts: number;
    avgScore: number;
  };
  topUsers: TopUser[];
  recentActivity: RecentActivity[];
};

export default function AdminDashboard() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sol-muted font-bold animate-pulse">{t("gatheringIntelligence")}</p>
      </div>
    );
  }

  const summaryCards = [
    {
      label: t("summary.users"),
      value: stats?.summary?.users || 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: t("summaryTrends.growing"),
    },
    {
      label: t("summary.lessons"),
      value: stats?.summary?.lessons || 0,
      icon: BookOpen,
      color: "text-sol-accent",
      bg: "bg-sol-accent/10",
      trend: t("summaryTrends.available"),
    },
    {
      label: t("summary.attempts"),
      value: stats?.summary?.attempts || 0,
      icon: Zap,
      color: "text-sol-orange",
      bg: "bg-sol-orange/10",
      trend: t("summaryTrends.active"),
    },
    {
      label: t("summary.avgScore"),
      value: `${Math.round(stats?.summary?.avgScore || 0)}%`,
      icon: Award,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: t("summaryTrends.stable"),
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section>
        <h1 className="text-4xl font-black text-sol-text tracking-tight uppercase">
          {t("title")}
        </h1>
        <p className="text-sol-muted font-bold max-w-2xl mt-2">{t("subtitle")}</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="group bg-sol-surface border border-sol-border/10 rounded-lg p-6 hover:border-sol-accent/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sol-accent/5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={card.color} size={24} />
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-sol-bg text-sol-muted uppercase tracking-wider">
                {card.trend}
              </span>
            </div>
            <div className="text-xs font-black text-sol-muted uppercase tracking-widest mb-1">
              {card.label}
            </div>
            <div className="text-3xl font-black text-sol-text group-hover:text-sol-accent transition-colors">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-sol-orange" size={24} />
            <h2 className="text-xl font-black text-sol-text tracking-tight uppercase">
              {t("topUsers.title")}
            </h2>
          </div>
          <div className="bg-sol-surface border border-sol-border/10 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 space-y-2">
              {stats?.topUsers?.map((user, i) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="w-full flex items-center justify-between p-4 rounded-lg transition-colors group text-left hover:bg-sol-bg/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-sol-accent/10 flex items-center justify-center font-black text-sol-accent text-sm">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black text-sol-text group-hover:text-sol-accent transition-colors">
                        {user.username}
                      </div>
                      <div className="truncate text-[10px] text-sol-muted font-bold uppercase tracking-wider">
                        {user.xp} XP
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-sol-text">{user.attempts}</div>
                    <div className="text-[10px] text-sol-muted font-bold uppercase tracking-wider">
                      {t("topUsers.attempts")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <Activity className="text-sol-accent" size={24} />
            <h2 className="text-xl font-black text-sol-text tracking-tight uppercase">
              {t("recentActivity.title")}
            </h2>
          </div>
          <div className="bg-sol-surface border border-sol-border/10 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sol-border/5 bg-sol-bg/50">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.student")}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.lesson")}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.score")}</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sol-border/5">
                {stats?.recentActivity?.map((activity) => (
                  <tr key={activity.id} className="hover:bg-sol-bg/30 transition-colors group">
                    <td className="px-6 py-4">
                      {activity.user?.id ? (
                        <Link
                          href={`/admin/users/${activity.user.id}`}
                          className="font-black text-sol-text group-hover:text-sol-accent transition-colors"
                        >
                          {activity.user.username}
                        </Link>
                      ) : (
                        <span className="font-black text-sol-text">{t("userDetail.unknownUser")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-sol-muted">
                        {getLessonTitle(activity.lesson, locale, t("userDetail.unassignedLesson"))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-xs ${Number(activity.total_score) >= 80 ? "bg-green-500/10 text-green-500" : "bg-sol-orange/10 text-sol-orange"}`}>
                        {Math.round(activity.total_score)}%
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-sol-muted font-bold">
                        {format(new Date(activity.started_at), "HH:mm, MMM d")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function getLessonTitle(lesson: AdminLessonRef | null | undefined, locale: string, fallback: string) {
  if (!lesson) return fallback;
  return locale === "vi" ? lesson.title_vi : lesson.title_en;
}
