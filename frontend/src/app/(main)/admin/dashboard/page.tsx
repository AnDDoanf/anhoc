"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { adminService, type AdminLessonRef } from "@/services/adminService";
import { useTheme } from "@/hooks/useTheme";
import { 
  Activity, 
  Award, 
  BookOpen, 
  Trophy, 
  Users, 
  Zap, 
  TrendingUp, 
  BarChart3,
  ChevronRight,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";

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

type ActivityPoint = {
  date: string;
  users: number;
  attempts: number;
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
  activityHistory: ActivityPoint[];
};

export default function AdminDashboard() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const { theme } = useTheme();
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <section>
        <h1 className="text-4xl font-black text-sol-text tracking-tight uppercase">
          {t("title")}
        </h1>
        <p className="text-sol-muted font-bold max-w-2xl mt-2">{t("subtitle")}</p>
      </section>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="group bg-sol-surface border border-sol-border/10 rounded-2xl p-6 hover:border-sol-accent/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sol-accent/5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-2xl ${card.bg}`}>
                <card.icon className={card.color} size={24} />
              </div>
              <span className="text-[10px] font-black px-2 py-1 rounded-full bg-sol-bg text-sol-muted uppercase tracking-wider">
                {card.trend}
              </span>
            </div>
            <div className="text-xs font-black text-sol-muted uppercase tracking-widest mb-1">
              {card.label}
            </div>
            <div className="text-4xl font-black text-sol-text group-hover:text-sol-accent transition-colors">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="bg-sol-surface border border-sol-border/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-sol-text tracking-tight flex items-center gap-2 uppercase">
              <BarChart3 className="text-sol-accent" size={24} />
              System Activity Trend
            </h2>
            <p className="text-sol-muted font-medium">User registrations and test attempts over the last 14 days</p>
          </div>
          <div className="px-4 py-2 bg-sol-bg rounded-xl border border-sol-border/30 text-sm font-bold text-sol-muted">
            Last 14 Days
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.activityHistory} key={theme || 'light'}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAttempts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  fontWeight: 900
                }}
                itemStyle={{ fontWeight: 800 }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontWeight: 800, fontSize: '12px' }} />
              <Area 
                name="New Users"
                type="monotone" 
                dataKey="users" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUsers)" 
                animationDuration={2000}
              />
              <Area 
                name="Attempts"
                type="monotone" 
                dataKey="attempts" 
                stroke="var(--accent)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAttempts)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-sol-orange" size={24} />
            <h2 className="text-xl font-black text-sol-text tracking-tight uppercase">
              {t("topUsers.title")}
            </h2>
          </div>
          <div className="bg-sol-surface border border-sol-border/10 rounded-[2rem] overflow-hidden shadow-xl p-4">
            <div className="space-y-2">
              {stats?.topUsers?.map((user, i) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="w-full flex items-center justify-between p-4 rounded-xl transition-all group text-left hover:bg-sol-bg active:scale-[0.98]"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sol-accent/10 flex items-center justify-center font-black text-sol-accent text-sm">
                      #{i + 1}
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
          <div className="bg-sol-surface border border-sol-border/10 rounded-[2.5rem] overflow-hidden shadow-xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sol-border/5 bg-sol-bg/50">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest rounded-tl-2xl">{t("recentActivity.student")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.lesson")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest">{t("recentActivity.score")}</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-sol-muted uppercase tracking-widest rounded-tr-2xl">{t("recentActivity.time")}</th>
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
                        <div className={`inline-flex items-center px-4 py-1.5 rounded-full font-black text-xs ${Number(activity.total_score) >= 80 ? "bg-green-500/10 text-green-500" : "bg-sol-orange/10 text-sol-orange"}`}>
                          {Math.round(activity.total_score)}%
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-sol-muted font-bold">
                          <Clock size={12} />
                          {format(new Date(activity.started_at), "HH:mm, MMM d")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
