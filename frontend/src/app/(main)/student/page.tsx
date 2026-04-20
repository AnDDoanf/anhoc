"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { useTranslations } from "next-intl";
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

export default function UserHomePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const t = useTranslations("Common");
  const dt = useTranslations("Dashboard");
  const [profile, setProfile] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, activityData] = await Promise.all([
          authService.getProfile(),
          authService.getActivity()
        ]);
        setProfile(profileData);
        setActivity(activityData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: t("level"),
      value: profile?.student_stats?.level || 1,
      icon: <Target className="text-sol-accent" size={24} />,
      color: "bg-sol-accent/10"
    },
    {
      label: t("xp"),
      value: profile?.student_stats?.total_xp || 0,
      icon: <Flame className="text-sol-orange" size={24} />,
      color: "bg-sol-orange/10"
    },
    {
      label: t("lessonsCompleted"),
      value: profile?.student_stats?.lessons_completed || 0,
      icon: <BookOpen className="text-sol-blue" size={24} />,
      color: "bg-sol-blue/10"
    },
    {
      label: t("averageScore"),
      value: `${profile?.student_stats?.average_score || 0}%`,
      icon: <TrendingUp className="text-sol-green" size={24} />,
      color: "bg-sol-green/10"
    }
  ];

  return (
    <ProtectedRoute requiredRole="student">
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-sol-surface border border-sol-border/30 p-8 md:p-12 shadow-2xl shadow-sol-accent/5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sol-accent/10 border border-sol-accent/20 text-sol-accent text-sm font-black uppercase tracking-wider">
                <Sparkles size={14} />
                {dt("studentHub")}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-sol-text tracking-tight">
                {dt("welcomeBackMessage", { email: user?.username || user?.email?.split("@")[0] || "" })}
              </h1>
              <p className="text-lg text-sol-muted font-medium max-w-xl">
                {dt("readyMessage")}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link 
                  href="/student/learning"
                  className="px-6 py-3 bg-sol-accent text-sol-bg font-black rounded-2xl shadow-lg shadow-sol-accent/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                >
                  {dt("continueLearning")}
                  <ChevronRight size={18} />
                </Link>
                <Link 
                  href="/student/achievements"
                  className="px-6 py-3 bg-sol-bg text-sol-text border border-sol-border font-black rounded-2xl hover:bg-sol-surface active:scale-95 transition-all flex items-center gap-2"
                >
                  {dt("viewBadges")}
                  <Trophy size={18} />
                </Link>
              </div>
            </div>

            {/* Quick Level Card */}
            <div className="flex-shrink-0 bg-sol-bg/50 backdrop-blur-md border border-sol-border/30 rounded-[2rem] p-6 w-full md:w-64 text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-sol-accent/20 flex items-center justify-center">
                  <span className="text-4xl font-black text-sol-accent">{profile?.student_stats?.level || 1}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-sol-orange text-sol-bg text-[10px] font-black px-2 py-1 rounded-lg">
                  {t("level").toUpperCase().substring(0, 3)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-sol-muted uppercase tracking-widest">{t("xp")}</p>
                <p className="text-2xl font-black text-sol-text">{profile?.student_stats?.total_xp || 0}</p>
              </div>
              <div className="w-full bg-sol-border/20 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sol-accent transition-all duration-1000" 
                  style={{ width: `${(profile?.student_stats?.total_xp % 1000) / 10}%` }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <div 
              key={idx}
              className="bg-sol-surface border border-sol-border/30 rounded-3xl p-6 shadow-lg hover:shadow-sol-accent/5 transition-all group overflow-hidden relative"
            >
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-500 ${stat.color.replace('/10', '')}`} />
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-sm font-black text-sol-muted uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black text-sol-text">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.color} group-hover:rotate-12 transition-transform duration-300`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-sol-text tracking-tight flex items-center gap-2">
                    <Clock className="text-sol-accent" size={24} />
                    {t("activity")}
                  </h2>
                  <p className="text-sol-muted font-medium">{dt("activityDescription")}</p>
                </div>
                <div className="hidden sm:block px-4 py-2 bg-sol-bg rounded-xl border border-sol-border/30 text-sm font-bold text-sol-muted">
                  {dt("last7Days")}
                </div>
             </div>

             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activity} key={theme || 'light'}>
                    <defs>
                      <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString(undefined, { weekday: 'short' });
                      }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        borderRadius: '1rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontWeight: 900
                      }}
                      itemStyle={{ color: 'var(--accent)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="xp" 
                      stroke="var(--accent)" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorXp)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Right Sidebar / Tips */}
          <div className="space-y-6">
            <div className="bg-sol-surface border border-sol-border/30 rounded-[2.5rem] p-8 shadow-xl h-full relative overflow-hidden">
              <h3 className="text-xl font-black text-sol-text mb-6 flex items-center gap-2">
                <Trophy className="text-sol-orange" size={20} />
                {dt("quickTips")}
              </h3>
              <div className="space-y-6">
                {[
                  { title: dt("dailyStreak"), desc: dt("dailyStreakDesc"), icon: <Flame className="text-sol-orange" /> },
                  { title: dt("masteryFocus"), desc: dt("masteryFocusDesc"), icon: <Target className="text-sol-blue" /> },
                  { title: dt("newChallenges"), desc: dt("newChallengesDesc"), icon: <Sparkles className="text-sol-accent" /> }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group cursor-default">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-sol-bg border border-sol-border/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-sol-text text-sm">{item.title}</p>
                      <p className="text-xs text-sol-muted font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-sol-border/30">
                <Link 
                  href="/student/practice"
                  className="w-full py-4 bg-sol-bg border border-sol-border/30 text-sol-text font-black rounded-2xl hover:border-sol-accent hover:text-sol-accent transition-all flex items-center justify-center gap-2 group"
                >
                  {dt("openPracticeHub")}
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
