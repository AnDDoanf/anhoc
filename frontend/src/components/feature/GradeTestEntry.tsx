"use client";

import { isAxiosError } from "axios";
import { ArrowRight, CheckCircle2, Loader2, Lock, Medal } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradeTest, testService } from "@/services/testService";

interface GradeTestEntryProps {
  test: GradeTest;
  className?: string;
}

export default function GradeTestEntry({ test, className = "" }: GradeTestEntryProps) {
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
  const labels = locale === "vi"
    ? {
        unlocked: "Da mo khoa",
        locked: "Chua mo khoa",
        questions: `${test.questionCount} cau hoi`,
        attempts: `${attemptCount} luot lam`,
        progress: "Tien do luyen tap",
        summary: `${completedLessons}/${eligibility.requiredLessonCount} bai hoc dat ${eligibility.minimumScore}%+`,
        ready: "Ban da du dieu kien de lam bai kiem tra tong hop cho lop nay.",
        requirement: `Can luyen tap tat ca bai hoc trong lop nay va dat it nhat ${eligibility.minimumScore}% moi bai.`,
        start: "Lam bai kiem tra",
        starting: "Dang vao bai...",
        lockedButton: "Luyen tap de mo khoa",
        lockedHint: remainingLessons === 1
          ? "Con 1 bai hoc chua dat yeu cau."
          : `Con ${remainingLessons} bai hoc chua dat yeu cau.`,
        startError: "Khong the bat dau bai kiem tra.",
      }
    : {
        unlocked: "Unlocked",
        locked: "Locked",
        questions: `${test.questionCount} questions`,
        attempts: `${attemptCount} attempts`,
        progress: "Practice progress",
        summary: `${completedLessons}/${eligibility.requiredLessonCount} lessons at ${eligibility.minimumScore}%+`,
        ready: "You have unlocked this grade test and can start it any time.",
        requirement: `Practice every lesson in this grade and score at least ${eligibility.minimumScore}% on each one.`,
        start: "Take grade test",
        starting: "Starting...",
        lockedButton: "Practice to unlock",
        lockedHint: remainingLessons === 1
          ? "1 lesson still needs a 70%+ practice score."
          : `${remainingLessons} lessons still need 70%+ practice scores.`,
        startError: "Failed to start the grade test.",
      };

  const handleStart = async () => {
    if (!eligibility.eligible) return;

    setLoading(true);
    try {
      const attempt = await testService.startGradeTest(test.grade_id);
      router.push(`/student/practice/${attempt.id}`);
    } catch (error) {
      console.error("Failed to start grade test:", error);
      alert(isAxiosError(error) ? error.response?.data?.error || labels.startError : labels.startError);
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
              {eligibility.eligible ? labels.unlocked : labels.locked}
            </span>
            <span className="rounded-full border border-sol-border/20 bg-sol-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sol-muted">
              {labels.questions}
            </span>
            {attemptCount > 0 && (
              <span className="rounded-full border border-sol-border/20 bg-sol-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sol-muted">
                {labels.attempts}
              </span>
            )}
          </div>

          <div>
            <h4 className="text-lg font-black text-sol-text md:text-xl">{title}</h4>
            <p className="mt-1 text-sm font-medium text-sol-muted">
              {eligibility.eligible ? labels.ready : labels.requirement}
            </p>
          </div>

          <div className="rounded-2xl border border-sol-border/20 bg-sol-surface/70 p-4">
            <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-sol-muted">
              <span>{labels.progress}</span>
              <span>{labels.summary}</span>
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
            className={`inline-flex items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-black transition-all ${
              eligibility.eligible
                ? "bg-sol-text text-sol-bg hover:bg-sol-accent"
                : "cursor-not-allowed bg-sol-border/15 text-sol-muted"
            } disabled:opacity-70`}
          >
            <span>{loading ? labels.starting : eligibility.eligible ? labels.start : labels.lockedButton}</span>
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
            <span>{eligibility.eligible ? labels.ready : labels.lockedHint}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
