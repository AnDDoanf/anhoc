"use client";

import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Milestone from "@/components/feature/Milestone";
import Hero from "@/components/ui/Hero";
import { Trophy, ArrowLeft, Layers, Target, Loader2, Flame, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useEffect, useMemo } from "react";
import { LessonMastery, lessonService } from "@/services/lessonService";
import GradeTestEntry from "@/components/feature/GradeTestEntry";
import { GradeTest, testService } from "@/services/testService";
import { ActivityPoint, authService } from "@/services/auth";
import { economyService, StreakStatusResponse } from "@/services/economyService";
import { useTheme } from "@/hooks/useTheme";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export default function GradePathPage() {
  const params = useParams();
  const gradeId = params.gradeId as string;

  const t = useTranslations("Path");
  const commonT = useTranslations("Common");
  const dashboardT = useTranslations("Dashboard");
  const streakT = useTranslations("Streak");
  const locale = useLocale();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [gradeGroup, setGradeGroup] = useState<any>(null);
  const [gradeTest, setGradeTest] = useState<GradeTest | null>(null);
  const [masteryByLessonId, setMasteryByLessonId] = useState<Record<string, LessonMastery>>({});
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [streakStatus, setStreakStatus] = useState<StreakStatusResponse | null>(null);
  const sidebarInnerRef = useRef<HTMLDivElement | null>(null);
  const [sidebarTop, setSidebarTop] = useState(96);

  const handleBackToHub = () => {
    localStorage.removeItem("last_learning_grade");
  };

  useEffect(() => {
    if (gradeId) {
      localStorage.setItem("last_learning_grade", gradeId);
    }
  }, [gradeId]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const [lessons, mastery, tests, activityData, streakData] = await Promise.all([
          lessonService.list(),
          lessonService.getMasteryAll().catch((error) => {
            console.error("Failed to load lesson mastery:", error);
            return [] as LessonMastery[];
          }),
          testService.listGradeTests().catch((error) => {
            console.error("Failed to load grade tests:", error);
            return [] as GradeTest[];
          }),
          authService.getActivity().catch((error) => {
            console.error("Failed to load activity:", error);
            return [] as ActivityPoint[];
          }),
          economyService.getStreakStatus().catch((error) => {
            console.error("Failed to load streak status:", error);
            return null;
          }),
        ]);
        const masteryMap = mastery.reduce<Record<string, LessonMastery>>((acc, item) => {
          acc[item.lesson_id] = item;
          return acc;
        }, {});
        setMasteryByLessonId(masteryMap);
        setActivity(activityData);
        setStreakStatus(streakData);
        const currentGradeLessons = lessons.filter((l: any) => l.grade?.slug === gradeId);

        if (currentGradeLessons.length > 0) {
          const firstLesson = currentGradeLessons[0];
          const gradeLabel = locale === "vi" ? firstLesson.grade?.title_vi : firstLesson.grade?.title_en;
          setGradeGroup({
            grade: gradeId,
            label: gradeLabel || gradeId,
            lessons: currentGradeLessons,
          });
          const matchedTest = tests.find((test) => (
            test.grade_slug === gradeId || test.grade?.slug === gradeId
          )) || null;
          setGradeTest(matchedTest);
        } else {
          setGradeGroup(null);
          setGradeTest(null);
        }
      } catch (error) {
        console.error("Failed to load grade path:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [gradeId, locale]);

  useEffect(() => {
    if (loading) return;

    let frameId = 0;
    let smoothScroll = window.scrollY;
    let targetScroll = window.scrollY;
    const sidebarNode = sidebarInnerRef.current;

    const syncSidebarBase = () => {
      const sidebarHeight = sidebarInnerRef.current?.offsetHeight ?? 0;
      const centeredTop = Math.max(96, Math.round((window.innerHeight - sidebarHeight) / 2));
      setSidebarTop(centeredTop);
    };

    const animateSidebar = () => {
      smoothScroll += (targetScroll - smoothScroll) * 0.12;
      const lagOffset = Math.max(-120, Math.min(120, targetScroll - smoothScroll));

      if (sidebarInnerRef.current) {
        sidebarInnerRef.current.style.transform = `translate3d(0, ${lagOffset}px, 0)`;
      }

      if (Math.abs(targetScroll - smoothScroll) > 0.2) {
        frameId = window.requestAnimationFrame(animateSidebar);
      } else {
        smoothScroll = targetScroll;
        if (sidebarInnerRef.current) {
          sidebarInnerRef.current.style.transform = "translate3d(0, 0, 0)";
        }
        frameId = 0;
      }
    };

    const handleScroll = () => {
      targetScroll = window.scrollY;
      if (!frameId) {
        frameId = window.requestAnimationFrame(animateSidebar);
      }
    };

    const handleResize = () => {
      syncSidebarBase();
    };

    window.requestAnimationFrame(() => {
      syncSidebarBase();
      if (sidebarNode) {
        sidebarNode.style.willChange = "transform";
      }
    });

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      if (sidebarNode) {
        sidebarNode.style.transform = "translate3d(0, 0, 0)";
        sidebarNode.style.willChange = "auto";
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [loading]);

  const currentStreak = useMemo(() => streakStatus?.currentStreak ?? 0, [streakStatus]);
  const activeDays = useMemo(() => activity.filter((item) => item.xp > 0).length, [activity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  if (!gradeGroup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h1 className="text-4xl font-black text-sol-text">{commonT("error.gradeNotFound")}</h1>
        <Link
          href="/student/learning?select=true"
          prefetch={false}
          onClick={handleBackToHub}
          className="text-sol-accent hover:underline">{commonT("backToHub")}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 space-y-8 md:space-y-16 md:py-12">

      {/* Header & Back Link */}
      <div className="space-y-5 md:space-y-8">
        <Hero
          icon={<Trophy size={140} className="h-20 w-20 text-sol-accent sm:h-32 sm:w-32 md:h-36 md:w-36" />}
          className="md:rounded-[3rem]"
          containerClassName="relative z-10 space-y-3 sm:space-y-4"
        >
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
              <Target size={11} className="md:h-3.5 md:w-3.5" />
              <span>{t("eyebrow")}</span>
            </div>
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sol-accent/10 text-sol-accent shadow-sm">
                <Target size={20} />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-sol-text sm:text-3xl md:text-5xl">
                {gradeGroup.label}
              </h1>
            </div>
          </div>

          <div className="mt-5 flex gap-4 border-t border-sol-border/20 pt-5 sm:mt-8 sm:gap-6 sm:pt-8">
            <div className="flex items-center gap-2 text-xs font-bold text-sol-muted uppercase tracking-widest">
              <Layers size={14} className="text-sol-accent" />
              <span>{t("modules", { count: gradeGroup.lessons.length })}</span>
            </div>
          </div>
        </Hero>

        <Link
          href="/student/learning?select=true"
          prefetch={false}
          onClick={handleBackToHub}
          className="inline-flex items-center gap-2 text-sol-muted hover:text-sol-accent transition-colors font-bold text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>{commonT("backToHub")}</span>
        </Link>

        {gradeTest && <GradeTestEntry test={gradeTest} />}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="relative pb-20 sm:pb-24 md:pb-32">
          {gradeGroup.lessons.map((lesson: any, idx: number) => {
            const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
            return (
              <Milestone
                key={lesson.id}
                lessonId={lesson.id}
                gradeId={gradeId}
                title={title}
                index={idx + 1}
                isEven={idx % 2 === 0}
                isLast={idx === gradeGroup.lessons.length - 1}
                mastery={masteryByLessonId[lesson.id]}
              />
            );
          })}

          <div className="flex flex-col items-center justify-center space-y-5 pt-16 animate-in zoom-in duration-1000 delay-500 sm:space-y-8 sm:pt-24">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sol-accent text-sol-bg shadow-[0_0_50px_rgba(var(--sol-accent-rgb),0.5)] sm:h-24 sm:w-24">
              <Trophy size={48} />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black uppercase tracking-[0.18em] text-sol-text sm:text-2xl sm:tracking-widest">{t("completionTitle")}</h3>
              <p className="text-sm text-sol-muted sm:text-base">{t("completionSub")}</p>
            </div>
          </div>
        </div>

        <aside className="hidden xl:block xl:sticky xl:self-start" style={{ top: `${sidebarTop}px` }}>
          <div
            ref={sidebarInnerRef}
            className="space-y-6 will-change-transform"
          >
            <section className="overflow-hidden rounded-[2rem] border border-sol-border/30 bg-sol-surface shadow-sm">
            <div className="border-b border-sol-border/30 p-5">
              <div className="flex items-center gap-2 text-sol-accent">
                <Flame size={18} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{dashboardT("dailyStreak")}</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-black text-sol-text">{currentStreak}</p>
                  <p className="text-sm font-bold text-sol-text/65">
                    {streakT("currentStreak", { count: currentStreak })}
                  </p>
                </div>
                <div className="rounded-2xl border border-sol-accent/20 bg-sol-accent/10 px-3 py-2 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sol-accent">{commonT("activity")}</p>
                  <p className="text-sm font-black text-sol-text">{activeDays}/7</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activity} key={theme || "light"}>
                    <defs>
                      <linearGradient id="pathActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={10}
                      tick={{ fill: "var(--text-secondary)", fontSize: 11, fontWeight: 800 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString(locale, { weekday: "narrow" })}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                      contentStyle={{
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                        boxShadow: "0 12px 30px rgba(0,0,0,0.08)"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="xp"
                      stroke="var(--accent)"
                      strokeWidth={3}
                      fill="url(#pathActivity)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            </section>

            <section className="rounded-[2rem] border border-sol-border/30 bg-sol-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sol-accent">{streakT("dailyQuests")}</p>
                <h3 className="mt-2 text-xl font-black text-sol-text">
                  {streakT("completedCount", {
                    completed: streakStatus?.dailyQuests?.filter((quest) => quest.is_completed).length ?? 0,
                    total: streakStatus?.dailyQuests?.length ?? 0
                  })}
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {(streakStatus?.dailyQuests ?? []).map((quest) => (
                <div
                  key={quest.id}
                  className={`rounded-2xl border px-4 py-3 ${
                    quest.is_completed
                      ? "border-sol-green/20 bg-sol-green/10"
                      : "border-sol-border/20 bg-sol-bg/55"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${quest.is_completed ? "text-sol-green" : "text-sol-muted"}`}>
                      {quest.is_completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-sol-text">
                        {streakT(`questTypes.${quest.quest_type}`, { target: quest.target_count })}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
                        <span className="text-sol-text/65">
                          {quest.current_count}/{quest.target_count}
                        </span>
                        <span className="text-sol-accent">+{quest.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
