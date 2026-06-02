"use client";

import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import Can from "@/components/auth/Can";
import { GraduationCap, Library, Globe, ArrowUpRight, PlusCircle, Layers, BookMarked, ChevronRight, BookOpen, PlayCircle, Loader2, Pencil, Trash2, Flame, Users, Sparkles, TrendingUp, ShieldAlert } from "lucide-react";
import CreateLessonModal from "@/components/feature/CreateLessonModal";
import Hero from "@/components/ui/Hero";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Lesson, LessonMastery, Subject, lessonService } from "@/services/lessonService";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { ActivityPoint, authService, NearbyLearner } from "@/services/auth";
import { useTheme } from "@/hooks/useTheme";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type LessonGradeGroup = {
  grade: string;
  label: string;
  lessons: Lesson[];
};

type LessonSubjectGroup = {
  subject: string;
  label: string;
  grades: LessonGradeGroup[];
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error || error.response?.data?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
};

export default function LearningDashboard() {
  const t = useTranslations("Learning");
  const practiceT = useTranslations("Practice");
  const commonT = useTranslations("Common");
  const dashboardT = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const { theme } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metaModal, setMetaModal] = useState<"subject" | "grade" | "subjectAccess" | null>(null);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonGroups, setLessonGroups] = useState<LessonSubjectGroup[]>([]);
  const [masteryData, setMasteryData] = useState<Record<string, LessonMastery>>({});
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [startingPracticeId, setStartingPracticeId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [nearbyLearners, setNearbyLearners] = useState<NearbyLearner[]>([]);
  const [recommendedUser, setRecommendedUser] = useState<NearbyLearner | null>(null);
  const [socialSummary, setSocialSummary] = useState({ followers: 0, following: 0 });
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);
  const [lockedSubjects, setLockedSubjects] = useState<Subject[]>([]);
  const [requestingSubjectId, setRequestingSubjectId] = useState<number | null>(null);

  const fetchDisplayData = useCallback(async () => {
    try {
      const [lessons, mastery, activityData, socializingData, subjectCatalog] = await Promise.all([
        lessonService.list(),
        lessonService.getMasteryAll(),
        authService.getActivity(),
        authService.getSocializing(),
        lessonService.getSubjectCatalog()
      ]);

      // Map mastery by lesson_id for easy lookup
      const masteryMap = mastery.reduce<Record<string, LessonMastery>>((acc, item) => {
        acc[item.lesson_id] = item;
        return acc;
      }, {});
      setMasteryData(masteryMap);

      const groups = lessons.reduce<Record<string, Omit<LessonSubjectGroup, "grades"> & { grades: Record<string, LessonGradeGroup> }>>((acc, lesson) => {
        const subjectId = lesson.subject?.id || "other";
        const subjectKey = String(subjectId);
        const subjectLabel = locale === "vi" ? lesson.subject?.title_vi : lesson.subject?.title_en;
        const gradeSlug = lesson.grade?.slug || "other";
        const gradeLabel = locale === "vi" ? lesson.grade?.title_vi : lesson.grade?.title_en;
        if (!acc[subjectKey]) {
          acc[subjectKey] = {
            subject: subjectKey,
            label: subjectLabel || lesson.subject?.slug || "Other",
            grades: {},
          };
        }
        if (!acc[subjectKey].grades[gradeSlug]) {
          acc[subjectKey].grades[gradeSlug] = { grade: gradeSlug, label: gradeLabel || gradeSlug, lessons: [] };
        }
        acc[subjectKey].grades[gradeSlug].lessons.push(lesson);
        return acc;
      }, {});
      setLessonGroups(
        Object.values(groups).map((subject) => ({
          ...subject,
          grades: Object.values(subject.grades).sort((a, b) => a.label.localeCompare(b.label)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
      );
      setActivity(activityData);
      setNearbyLearners(socializingData.nearbyLearners);
      setRecommendedUser(socializingData.recommendedUser);
      setSocialSummary(socializingData.summary);
      setLockedSubjects(subjectCatalog.filter((subject) => subject.is_classified && subject.role_visible && !subject.has_access));
    } catch (err) {
      console.error("Failed to load dashboard lessons:", err);
    }
  }, [locale]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    for (let index = activity.length - 1; index >= 0; index -= 1) {
      if ((activity[index]?.xp || 0) > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [activity]);

  const activeDays = useMemo(() => activity.filter((item) => item.xp > 0).length, [activity]);

  const handleFollowToggle = async (learner: NearbyLearner) => {
    setFollowLoadingId(learner.id);
    try {
      if (learner.is_following) {
        await authService.unfollowUser(learner.id);
      } else {
        await authService.followUser(learner.id);
      }
      await fetchDisplayData();
    } catch (error) {
      console.error("Failed to update follow state:", error);
      alert(getApiErrorMessage(error, "Failed to update follow state."));
    } finally {
      setFollowLoadingId(null);
    }
  };

  useEffect(() => {
    fetchDisplayData();
  }, [fetchDisplayData]);

  const handleCreateSuccess = () => {
    fetchDisplayData();
    window.dispatchEvent(new Event("lesson-meta-updated"));
  };

  const handleEdit = (id: string) => {
    setEditLessonId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      try {
        await lessonService.remove(id);
        fetchDisplayData();
      } catch (err) {
        console.error("Failed to delete lesson", err);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditLessonId(null), 300); // clear after animation
  };

  const getGradeKey = (subject: string, grade: string) => `${subject}:${grade}`;

  const toggleGrade = (subject: string, grade: string) => {
    const gradeKey = getGradeKey(subject, grade);
    setExpandedGrades((current) => ({ ...current, [gradeKey]: !current[gradeKey] }));
  };

  const handleStartPractice = async (lessonId: string) => {
    setStartingPracticeId(lessonId);
    try {
      const attempt = await lessonService.startPractice(lessonId);
      router.push(`/student/practice/${attempt.id}`);
    } catch (error) {
      console.error("Failed to start practice:", error);
      alert(getApiErrorMessage(error, "Failed to start practice session."));
    } finally {
      setStartingPracticeId(null);
    }
  };

  const handleRequestSubjectAccess = async (subjectId: number) => {
    setRequestingSubjectId(subjectId);
    try {
      await lessonService.requestSubjectAccess(subjectId);
      await fetchDisplayData();
    } catch (error) {
      console.error("Failed to request subject access:", error);
      alert(getApiErrorMessage(error, t("classifiedRequestError")));
    } finally {
      setRequestingSubjectId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Educational Hero Header */}
      <Hero
        iconPosition="bottom-right"
        icon={<GraduationCap size={160} className="text-sol-accent md:h-[300px] md:w-[300px]" />}
        className="md:rounded-[3rem]"
        containerClassName="relative z-10 flex w-full flex-col items-start gap-5 lg:max-w-4xl"
      >
        <div className="space-y-5 md:space-y-8">
          <div className="space-y-3 md:space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sol-accent/20 bg-sol-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sol-accent sm:px-3 sm:py-1.5 md:text-xs">
              <GraduationCap size={11} className="md:h-3.5 md:w-3.5" />
              <span>{commonT("adventure")}</span>
            </div>

            <h1 className="max-w-[11ch] text-[1.75rem] font-black leading-[1.05] tracking-tight text-sol-text sm:text-4xl md:max-w-none md:text-6xl">
              {t("title")}
            </h1>
            
            <p className="max-w-xl text-[13px] leading-relaxed text-sol-muted sm:text-sm md:text-xl">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 md:px-5 md:py-2.5">
              <Globe size={16} className="md:h-[18px] md:w-[18px]" />
              <span>{commonT("curriculumYear")}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface/90 px-4 py-2 text-sm font-bold text-sol-text md:px-5 md:py-2.5">
              <Library size={16} className="text-sol-accent md:h-[18px] md:w-[18px]" />
              <span>{commonT("tracks", { count: 12 })}</span>
            </div>
          </div>
        </div>
      </Hero>

      <Can I="manage" a="lesson">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => setMetaModal("subject")}
            className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface px-4 py-2.5 text-sm font-bold text-sol-text transition-transform hover:scale-105 hover:text-sol-accent cursor-pointer md:px-5 md:py-3"
          >
            <BookMarked size={18} className="md:h-5 md:w-5" />
            <span>{t("newSubject")}</span>
          </button>
          <button
            onClick={() => setMetaModal("subjectAccess")}
            className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface px-4 py-2.5 text-sm font-bold text-sol-text transition-transform hover:scale-105 hover:text-sol-accent cursor-pointer md:px-5 md:py-3"
          >
            <ShieldAlert size={18} className="md:h-5 md:w-5" />
            <span>{t("manageSubjectAccess")}</span>
          </button>
          <button
            onClick={() => setMetaModal("grade")}
            className="flex items-center gap-2 rounded-2xl border border-sol-border/20 bg-sol-surface px-4 py-2.5 text-sm font-bold text-sol-text transition-transform hover:scale-105 hover:text-sol-accent cursor-pointer md:px-5 md:py-3"
          >
            <Layers size={18} className="md:h-5 md:w-5" />
            <span>{t("newGrade")}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-sol-accent px-4 py-2.5 text-sm font-bold text-sol-bg shadow-lg shadow-sol-accent/20 transition-transform hover:scale-105 cursor-pointer md:px-6 md:py-3"
          >
            <PlusCircle size={18} className="md:h-5 md:w-5" />
            <span>{t("newLesson")}</span>
          </button>
        </div>
      </Can>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="space-y-12 md:space-y-24">
          {lockedSubjects.length > 0 && (
            <section className="rounded-[2rem] border border-sol-orange/30 bg-sol-surface p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sol-orange">
                <ShieldAlert size={20} />
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-sol-text">{t("classifiedSubjectsTitle")}</h2>
                  <p className="text-sm font-bold text-sol-text/65">{t("classifiedSubjectsSubtitle")}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {lockedSubjects.map((subject) => {
                  const subjectLabel = locale === "vi" ? subject.title_vi : subject.title_en;
                  const isPending = subject.request_status === "pending";
                  const isRejected = subject.request_status === "rejected";

                  return (
                    <div key={subject.id} className="rounded-[1.6rem] border border-sol-border/30 bg-sol-bg p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sol-orange">{t("classifiedBadge")}</p>
                      <h3 className="mt-2 text-xl font-black text-sol-text">{subjectLabel}</h3>
                      <p className="mt-1 text-sm font-medium text-sol-text/65">{subject.slug}</p>
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => handleRequestSubjectAccess(subject.id)}
                          disabled={isPending || requestingSubjectId === subject.id}
                          className="rounded-2xl bg-sol-accent px-4 py-3 text-sm font-black text-sol-bg disabled:opacity-60"
                        >
                          {requestingSubjectId === subject.id
                            ? t("classifiedRequestSending")
                            : isPending
                              ? t("classifiedRequestPending")
                              : isRejected
                                ? t("classifiedRequestRetry")
                                : t("classifiedRequestAction")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {lessonGroups.map((subject) => (
            <section key={subject.subject} className="group/section space-y-8 md:space-y-12">
              <div className="flex flex-col gap-3 border-b border-sol-border/30 pb-4 sm:flex-row sm:items-end sm:justify-between md:pb-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-sol-text transition-colors group-hover/section:text-sol-accent md:text-3xl">
                    {subject.label}
                  </h2>
                  <p className="text-sol-muted text-sm font-medium">
                    {t("tracks", { count: subject.grades.length })}
                  </p>
                </div>
              </div>

              {subject.grades.map((group) => (
                <div
                  key={`${subject.subject}-${group.grade}`}
                  className="rounded-3xl border border-sol-border/30 bg-sol-surface p-5 shadow-sm transition-all hover:border-sol-accent/40 hover:bg-sol-surface md:p-6"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleGrade(subject.subject, group.grade)}
                      aria-expanded={Boolean(expandedGrades[getGradeKey(subject.subject, group.grade)])}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-sol-text">{group.label}</h3>
                        <p className="text-sm font-bold text-sol-text/75">
                          {t("lessonCount", { count: group.lessons.length })}
                        </p>
                      </div>
                      <ChevronRight
                        size={22}
                        className={`shrink-0 text-sol-accent transition-transform ${expandedGrades[getGradeKey(subject.subject, group.grade)] ? "rotate-90" : ""}`}
                      />
                    </button>
                    <Link
                      href={`/student/learning/${group.grade}`}
                      prefetch={false}
                      className="group/link inline-flex shrink-0 items-center gap-2 rounded-2xl border border-sol-accent/35 bg-sol-accent/12 px-4 py-2.5 text-sm font-black text-sol-accent transition-all hover:bg-sol-accent hover:text-sol-bg"
                    >
                      {t("viewPath")} <ArrowUpRight size={16} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </Link>
                  </div>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      expandedGrades[getGradeKey(subject.subject, group.grade)]
                        ? "mt-5 grid-rows-[1fr] border-t border-sol-border/20 pt-5 opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="scrollbar-theme -mx-1 overflow-x-auto pb-2">
                        <div className="flex min-w-full gap-4 px-1">
                        {group.lessons.map((lesson, idx) => {
                          const title = locale === "vi" ? lesson.title_vi : lesson.title_en;
                          const mastery = masteryData[lesson.id];
                          return (
                            <article
                              key={lesson.id}
                              className="flex w-80 shrink-0 snap-start flex-col rounded-[2rem] border border-sol-border/30 bg-sol-bg p-5 shadow-md transition-all hover:border-sol-accent/35 hover:shadow-xl"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sol-accent/30 bg-sol-accent/12 text-sm font-black text-sol-accent">
                                    {idx + 1}
                                  </div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sol-text/60">
                                    {t("section", { n: idx + 1 })}
                                  </p>
                                </div>

                                <Can I="manage" a="lesson">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEdit(lesson.id)}
                                      className="rounded-xl p-2 text-sol-text/55 transition-colors hover:bg-sol-accent/10 hover:text-sol-accent"
                                      title="Edit Lesson"
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(lesson.id)}
                                      className="rounded-xl p-2 text-sol-text/55 transition-colors hover:bg-red-500/10 hover:text-red-500"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </Can>
                              </div>

                              <div className="mt-5 flex-1 space-y-4">
                                <h4 className="text-lg font-black leading-tight text-sol-text md:text-xl">
                                  {title}
                                </h4>

                                {mastery && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                      <span className={mastery.completion_status === "completed" ? "text-green-500" : "text-sol-accent"}>
                                        {mastery.completion_status.replace("_", " ")}
                                      </span>
                                      <span className="text-sol-text/65">{Number(mastery.mastery_score).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-sol-border/25">
                                      <div
                                        className={`h-full transition-all duration-700 ${mastery.completion_status === "completed" ? "bg-green-500" : "bg-sol-accent"}`}
                                        style={{ width: `${mastery.mastery_score}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="mt-6 flex gap-3">
                                <Link
                                  href={`/student/learning/${group.grade}/${lesson.id}`}
                                  prefetch={false}
                                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-sol-border/25 bg-sol-surface px-4 py-3 text-sm font-black text-sol-text transition-all hover:border-sol-accent/35 hover:text-sol-accent"
                                >
                                  <BookOpen size={16} />
                                  <span>{t("viewLesson")}</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleStartPractice(lesson.id)}
                                  disabled={startingPracticeId === lesson.id}
                                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sol-accent px-4 py-3 text-sm font-black text-sol-bg transition-all hover:bg-sol-accent/90 disabled:opacity-60"
                                >
                                  {startingPracticeId === lesson.id ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                                  <span>
                                    {startingPracticeId === lesson.id
                                      ? practiceT("starting")
                                      : mastery?.completion_status === "completed"
                                        ? practiceT("reviewBtn")
                                        : practiceT("startBtn")}
                                  </span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
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
                    {t("streakLabel", { count: currentStreak })}
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
                      <linearGradient id="learningActivity" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#learningActivity)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2">
                {activity.map((item) => (
                  <div key={item.date} className="space-y-2 text-center">
                    <div
                      className={`h-12 rounded-2xl border ${
                        item.xp > 0
                          ? "border-sol-accent/35 bg-sol-accent/15"
                          : "border-sol-border/15 bg-sol-bg/70"
                      }`}
                    />
                    <p className="text-[10px] font-black uppercase tracking-widest text-sol-text/55">
                      {new Date(item.date).toLocaleDateString(locale, { weekday: "narrow" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-sol-border/30 bg-sol-surface p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sol-accent">
                <Users size={18} />
                <span className="text-xs font-black uppercase tracking-[0.2em]">{t("socializingTitle")}</span>
              </div>
              <div className="rounded-full border border-sol-border/30 bg-sol-bg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sol-text/55">
                {t("nearbyCount", { count: nearbyLearners.length })}
              </div>
            </div>

            <p className="mt-3 text-sm font-medium leading-relaxed text-sol-text/65">
              {t("socializingSubtitle")}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.5rem] border border-sol-border/30 bg-sol-bg p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-sol-text/55">{t("followersLabel")}</p>
                <p className="mt-1 text-2xl font-black text-sol-text">{socialSummary.followers}</p>
              </div>
              <div className="rounded-[1.5rem] border border-sol-border/30 bg-sol-bg p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-sol-text/55">{t("followingLabel")}</p>
                <p className="mt-1 text-2xl font-black text-sol-text">{socialSummary.following}</p>
              </div>
            </div>

            {recommendedUser && (
              <div className="mt-5 rounded-[1.5rem] border border-sol-accent/30 bg-sol-accent/10 p-4">
                <div className="flex items-center gap-2 text-sol-accent">
                  <Sparkles size={16} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("recommendedUserTitle")}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sol-accent text-sm font-black text-sol-bg">
                    {recommendedUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-sol-text">{recommendedUser.username}</p>
                    <p className="text-xs font-bold text-sol-text/60">
                      {[recommendedUser.country, `Lv ${recommendedUser.level}`].filter(Boolean).join(" | ")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFollowToggle(recommendedUser)}
                  disabled={followLoadingId === recommendedUser.id}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sol-accent px-4 py-3 text-sm font-black text-sol-bg transition-all hover:bg-sol-accent/90 disabled:opacity-60"
                >
                  {followLoadingId === recommendedUser.id && <Loader2 size={15} className="animate-spin" />}
                  <span>{recommendedUser.is_following ? t("followingAction") : t("followAction")}</span>
                </button>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {nearbyLearners.map((learner) => (
                <div
                  key={learner.id}
                  className="rounded-[1.5rem] border border-sol-border/30 bg-sol-bg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sol-accent/12 text-sm font-black text-sol-accent">
                      {learner.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-sol-text">{learner.username}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-bold text-sol-text/60">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles size={12} className="text-sol-accent" />
                          Lv {learner.level}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp size={12} className="text-sol-green" />
                          {Math.round(learner.average_score || 0)}%
                        </span>
                        {learner.country && <span>{learner.country}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFollowToggle(learner)}
                    disabled={followLoadingId === learner.id}
                    className={`mt-3 w-full rounded-2xl px-4 py-2.5 text-sm font-black transition-all ${
                      learner.is_following
                        ? "border border-sol-border/30 bg-sol-surface text-sol-text hover:border-sol-accent/30 hover:text-sol-accent"
                        : "bg-sol-accent text-sol-bg hover:bg-sol-accent/90"
                    } disabled:opacity-60`}
                  >
                    {followLoadingId === learner.id ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{t("updatingFollow")}</span> : learner.is_following ? t("followingAction") : t("followAction")}
                  </button>
                </div>
              ))}

              {nearbyLearners.length === 0 && (
                <div className="rounded-[1.5rem] border border-sol-border/30 bg-sol-bg p-4 text-sm font-medium text-sol-text/60">
                  {t("noNearbyLearners")}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Progress Footer */}
      <section className="space-y-3 rounded-[2rem] border border-sol-border/30 bg-sol-surface p-6 text-center shadow-sm md:space-y-4 md:rounded-[3rem] md:p-12">
        <h3 className="text-xl font-bold text-sol-text md:text-2xl">{t("readyChallengeTitle")}</h3>
        <p className="text-sol-muted max-w-lg mx-auto">
          {t("readyChallengeSubtitle")}
        </p>
      </section>

      <CreateLessonModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleCreateSuccess}
        editLessonId={editLessonId}
      />
      <CreateSubjectModal
        isOpen={metaModal === "subject"}
        onClose={() => setMetaModal(null)}
        onSuccess={handleCreateSuccess}
      />
      <ManageSubjectAccessModal
        isOpen={metaModal === "subjectAccess"}
        onClose={() => setMetaModal(null)}
        onSuccess={handleCreateSuccess}
      />
      <CreateGradeModal
        isOpen={metaModal === "grade"}
        onClose={() => setMetaModal(null)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

function ManageSubjectAccessModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations("Learning.metaModal");
  const locale = useLocale();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const items = await lessonService.getSubjectCatalog();
      setSubjects(items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("loadSubjectsError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    void loadSubjects();
  }, [isOpen, loadSubjects]);

  if (!isOpen) return null;

  const toggleClassified = async (subject: Subject) => {
    setSavingId(subject.id);
    setErrorMessage("");
    try {
      await lessonService.updateSubject(subject.id, {
        is_classified: !subject.is_classified,
      });
      await loadSubjects();
      onSuccess();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("saveError")));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <MetaModal title={t("subjectAccessTitle")} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm font-medium leading-6 text-sol-muted">{t("subjectAccessHint")}</p>
        {errorMessage && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">{errorMessage}</p>}
        <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-lg border border-sol-border/20 bg-sol-bg px-4 py-4 text-sm font-bold text-sol-muted">{t("loadingSubjects")}</div>
          ) : subjects.map((subject) => {
            const label = locale === "vi" ? subject.title_vi : subject.title_en;
            return (
              <div key={subject.id} className="rounded-xl border border-sol-border/20 bg-sol-bg/80 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-sol-text">{label}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-sol-muted">{subject.slug}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${subject.is_classified ? "bg-sol-orange/15 text-sol-orange" : "bg-sol-green/15 text-sol-green"}`}>
                    {subject.is_classified ? t("classifiedState") : t("openState")}
                  </span>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={savingId === subject.id}
                    onClick={() => toggleClassified(subject)}
                    className="rounded-lg bg-sol-accent px-4 py-2 text-sm font-black text-sol-bg disabled:opacity-60"
                  >
                    {savingId === subject.id
                      ? t("saving")
                      : subject.is_classified
                        ? t("makeOpen")
                        : t("makeClassified")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MetaModal>
  );
}

function CreateSubjectModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations("Learning.metaModal");
  const [form, setForm] = useState({ title_en: "", title_vi: "", slug: "", color: "#268bd2", is_classified: false });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      await lessonService.createSubject(form);
      onSuccess();
      onClose();
      setForm({ title_en: "", title_vi: "", slug: "", color: "#268bd2", is_classified: false });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("saveError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MetaModal title={t("subjectTitle")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MetaField label={t("titleEn")} value={form.title_en} onChange={(value) => setForm({ ...form, title_en: value })} required />
        <MetaField label={t("titleVi")} value={form.title_vi} onChange={(value) => setForm({ ...form, title_vi: value })} required />
        <MetaField label={t("slug")} value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
        <MetaField label={t("color")} type="color" value={form.color} onChange={(value) => setForm({ ...form, color: value })} />
        <label className="flex items-center gap-3 rounded-lg border border-sol-border/20 bg-sol-bg px-3 py-3 font-bold text-sol-text">
          <input
            type="checkbox"
            checked={form.is_classified}
            onChange={(event) => setForm({ ...form, is_classified: event.target.checked })}
            className="h-4 w-4 accent-sol-accent"
          />
          <span>{t("classified")}</span>
        </label>
        {errorMessage && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">{errorMessage}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg">
          {loading ? t("saving") : t("createSubject")}
        </button>
      </form>
    </MetaModal>
  );
}

function CreateGradeModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useTranslations("Learning.metaModal");
  const locale = useLocale();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState({ title_en: "", title_vi: "", slug: "", subject_id: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    lessonService.getSubjects().then((items) => {
      setSubjects(items);
      setForm((current) => ({ ...current, subject_id: current.subject_id || items[0]?.id || 0 }));
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      await lessonService.createGrade(form);
      onSuccess();
      onClose();
      setForm({ title_en: "", title_vi: "", slug: "", subject_id: subjects[0]?.id || 0 });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("saveError")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MetaModal title={t("gradeTitle")} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <MetaField label={t("titleEn")} value={form.title_en} onChange={(value) => setForm({ ...form, title_en: value })} required />
        <MetaField label={t("titleVi")} value={form.title_vi} onChange={(value) => setForm({ ...form, title_vi: value })} required />
        <MetaField label={t("slug")} value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} />
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">{t("subject")}</span>
          <select
            required
            value={form.subject_id}
            onChange={(event) => setForm({ ...form, subject_id: Number(event.target.value) })}
            className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none focus:border-sol-accent"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {locale === "vi" ? subject.title_vi : subject.title_en}
              </option>
            ))}
          </select>
        </label>
        {errorMessage && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-500">{errorMessage}</p>}
        <button disabled={loading || subjects.length === 0} className="w-full rounded-lg bg-sol-accent px-4 py-3 font-black text-sol-bg disabled:opacity-50">
          {loading ? t("saving") : t("createGrade")}
        </button>
      </form>
    </MetaModal>
  );
}

function MetaModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-sol-bg/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-sol-border/20 bg-sol-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-sol-text">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-sol-muted hover:bg-sol-bg hover:text-sol-text">x</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetaField({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-sol-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 font-bold text-sol-text outline-none focus:border-sol-accent"
      />
    </label>
  );
}
