"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { adminService } from "@/services/adminService";
import { 
  Users, 
  BookOpen, 
  Award, 
  Zap, 
  TrendingUp, 
  Activity,
  History,
  Trophy
} from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const [stats, setStats] = useState<any>(null);
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
      color: "bg-blue-500",
      trend: "+12%" 
    },
    { 
      label: t("summary.lessons"), 
      value: stats?.summary?.lessons || 0, 
      icon: BookOpen, 
      color: "bg-sol-accent",
      trend: "+3 this week" 
    },
    { 
      label: t("summary.attempts"), 
      value: stats?.summary?.attempts || 0, 
      icon: Zap, 
      color: "bg-sol-orange",
      trend: "Active" 
    },
    { 
      label: t("summary.avgScore"), 
      value: `${Math.round(stats?.summary?.avgScore || 0)}%`, 
      icon: Award, 
      color: "bg-green-500",
      trend: "Stable" 
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <section>
        <h1 className="text-4xl font-black text-sol-text tracking-tight uppercase">
          {t("title")}
        </h1>
        <p className="text-sol-muted font-bold max-w-2xl mt-2">
          {t("subtitle")}
        </p>
      </section>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="group bg-sol-surface border border-sol-border/10 rounded-3xl p-6 hover:border-sol-accent/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-sol-accent/5">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${card.color}/10 text-white`}>
                <card.icon className={`text-${card.color.replace('bg-', '')}`} size={24} />
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
        {/* Most Active Students */}
        <section className="xl:col-span-1 space-y-4">
          <div className="flex items-center gap-3">
             <Trophy className="text-sol-orange" size={24} />
             <h2 className="text-xl font-black text-sol-text tracking-tight uppercase">
               {t("topUsers.title")}
             </h2>
          </div>
          <div className="bg-sol-surface border border-sol-border/10 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-4 space-y-2">
              {stats?.topUsers?.map((user: any, i: number) => (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-sol-bg/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sol-accent/10 flex items-center justify-center font-black text-sol-accent text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-black text-sol-text group-hover:text-sol-accent transition-colors">
                        {user.username}
                      </div>
                      <div className="text-[10px] text-sol-muted font-bold uppercase tracking-wider">
                        {user.xp} XP
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-sol-text">
                       {user.attempts}
                    </div>
                    <div className="text-[10px] text-sol-muted font-bold uppercase tracking-wider">
                       {t("topUsers.attempts")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Live Activity */}
        <section className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
             <Activity className="text-sol-accent" size={24} />
             <h2 className="text-xl font-black text-sol-text tracking-tight uppercase">
               {t("recentActivity.title")}
             </h2>
          </div>
          <div className="bg-sol-surface border border-sol-border/10 rounded-[2.5rem] overflow-hidden shadow-sm">
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
                 {stats?.recentActivity?.map((activity: any) => (
                   <tr key={activity.id} className="hover:bg-sol-bg/30 transition-colors group">
                     <td className="px-6 py-4">
                       <span className="font-black text-sol-text group-hover:text-sol-accent transition-colors">{activity.user?.username}</span>
                     </td>
                     <td className="px-6 py-4">
                        <span className="font-bold text-sol-muted">
                          {locale === "vi" ? activity.lesson?.title_vi : activity.lesson?.title_en}
                        </span>
                     </td>
                     <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded-md font-black text-xs ${Number(activity.total_score) >= 80 ? 'bg-green-500/10 text-green-500' : 'bg-sol-orange/10 text-sol-orange'}`}>
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
