"use client";

import { isAxiosError } from "axios";
import { ArrowRight, CheckCircle2, Loader2, Lock, Medal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradeTest, testService } from "@/services/testService";

interface GradeTestEntryProps {
  test: GradeTest;
  className?: string;
}

export default function GradeTestEntry({ test, className = "" }: GradeTestEntryProps) {
  const t = useTranslations("GradeTest");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const title = locale === "vi" ? test.title_vi : test.title_en;
  const eligibility = test.eligibility;
  const attemptCount = test.attempts?.length ?? 0;
  const completedLessons = eligibility.completedLessonCount;
  const requiredLessons = Math.max(eligibility.requiredLessonCount, 1);
  const remainingLessons = Math.max(eligibility.requiredLessonCount - completedLessons, 0);
  const progressWidth = Math.min((completedLessons / requiredLessons) * 100, 100);

  const lockedHint = remainingLessons === 1
    ? t("lockedHint.one")
    : t("lockedHint.other", { count: remainingLessons });

  const handleStart = async () => {
    if (!eligibility.eligible) return;

    setLoading(true);
    try {
      const attempt = await testService.startGradeTest(test.grade_id);
      router.push(`/student/practice/${attempt.id}`);
    } catch (error) {
      console.error("Failed to start grade test:", error);
      alert(isAxiosError(error) ? error.response?.data?.error || t("startError") : t("startError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-[1.75rem] border border-sol-border/25 bg-sol-bg/80 p-4 shadow-sm md:p-5 ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-sol-accent/25 bg-sol-accent/10 text-sol-accent">
              <Medal size={18} />
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
                eligibility.eligible
                  ? "bg-sol-green/10 text-sol-green"
                  : "bg-sol-orange/10 text-sol-orange"
              }`}
            >
              {eligibility.eligible ? t("unlocked") : t("locked")}
            </span>
            <span className="rounded-full border border-sol-border/20 bg-sol-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sol-muted">
              {t("questions", { count: test.questionCount })}
            </span>
            {attemptCount > 0 && (
              <span className="rounded-full border border-sol-border/20 bg-sol-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sol-muted">
                {t("attempts", { count: attemptCount })}
              </span>
            )}
          </div>

          <div>
            <h4 className="text-lg font-black text-sol-text md:text-xl">{title}</h4>
            <p className="mt-1 text-sm font-medium text-sol-muted">
              {eligibility.eligible ? t("ready") : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-sol-border/20 bg-sol-surface/70 p-4">
            <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-sol-muted">
              <span>{t("progress")}</span>
              <span>{t("summary", { completed: completedLessons, required: eligibility.requiredLessonCount, score: eligibility.minimumScore })}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sol-border/15">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  eligibility.eligible ? "bg-sol-green" : "bg-sol-accent"
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[220px]">
          <button
            type="button"
            onClick={handleStart}
            disabled={!eligibility.eligible || loading}
            className={`inline-flex items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-black transition-all border ${
              eligibility.eligible
                ? "bg-sol-accent/10 text-sol-accent border-sol-accent/25 hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent"
                : "cursor-not-allowed bg-sol-border/15 border-transparent text-sol-muted"
            } disabled:opacity-70`}
          >
            <span>{loading ? t("starting") : eligibility.eligible ? t("start") : t("lockedButton")}</span>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : eligibility.eligible ? (
              <ArrowRight size={18} />
            ) : (
              <Lock size={18} />
            )}
          </button>

          <div className="flex items-start gap-2 rounded-2xl bg-sol-accent/8 px-3 py-2 text-xs font-medium text-sol-muted">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-sol-accent" />
            <span>{eligibility.eligible ? t("ready") : lockedHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
