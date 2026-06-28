// src/components/feature/Milestone.tsx
"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  PlayCircle,
  Loader2
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LessonMastery, lessonService } from "@/services/lessonService";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MilestoneProps {
  lessonId: string;
  gradeId: string;
  title: string;
  index: number;
  isEven: boolean;
  isLast: boolean;
  mastery?: LessonMastery;
}

export default function Milestone({
  lessonId,
  gradeId,
  title,
  index,
  isEven,
  isLast,
  mastery
}: MilestoneProps) {
  const t = useTranslations("Path");
  const commonT = useTranslations("Common");
  const practiceT = useTranslations("Practice");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, width: 288 });
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const updateModalPosition = useCallback(() => {
    if (!titleRef.current) return;

    const rect = titleRef.current.getBoundingClientRect();
    const preferredWidth = Math.min(320, Math.max(240, rect.width));
    const viewportPadding = 16;
    const alignedLeft = isEven ? rect.right - preferredWidth : rect.left;
    const maxLeft = window.innerWidth - preferredWidth - viewportPadding;
    const nextLeft = Math.min(Math.max(alignedLeft, viewportPadding), Math.max(viewportPadding, maxLeft));

    setModalPosition({
      top: rect.bottom + 4,
      left: nextLeft,
      width: preferredWidth
    });
  }, [isEven]);

  const handleOpenModal = () => {
    updateModalPosition();
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);

  const handleStartPractice = async () => {
    setLoading(true);
    try {
      const attempt = await lessonService.startPractice(lessonId, "all");
      setIsModalOpen(false);
      router.push(`/student/practice/${attempt.id}`);
    } catch (error: any) {
      console.error("Failed to start practice:", error);
      alert(error.response?.data?.error || "Failed to start practice session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen) return;

    const syncPosition = () => updateModalPosition();
    syncPosition();

    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [isModalOpen, updateModalPosition]);

  const isPassed = mastery?.completion_status === "completed";
  const accentTextClass = isPassed ? "text-sol-green" : "text-sol-accent";
  const accentButtonClass = isPassed
    ? "border-sol-green/20 bg-sol-green/10 text-sol-green hover:border-sol-green hover:bg-sol-green hover:text-sol-bg"
    : "border-sol-border/10 bg-sol-surface text-sol-text hover:border-sol-accent hover:bg-sol-accent hover:text-sol-bg";
  const practiceButtonClass = isPassed
    ? "border-sol-green/20 bg-sol-green/10 text-sol-green hover:bg-sol-green hover:text-sol-bg hover:border-sol-green shadow-sm shadow-sol-green/5"
    : "border-sol-accent/20 bg-sol-accent/10 text-sol-accent hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent shadow-sm shadow-sol-accent/5";

  return (
    <div className="relative flex min-h-[220px] w-full items-start justify-start md:items-center md:justify-center sm:min-h-[260px] md:min-h-[300px]">
      {(index > 1 || !isLast) && (
        <div className={`absolute left-10 sm:left-12 md:left-1/2 z-0 w-1 -translate-x-1/2 bg-gradient-to-b sm:w-1.5 ${
          isPassed ? "from-sol-green/60 to-sol-green/20" : "from-sol-accent/60 to-sol-accent/20"
        } ${
          index === 1
            ? "top-[33px] sm:top-[39px] md:top-1/2 h-[calc(100%-33px)] sm:h-[calc(100%-39px)] md:h-1/2"
            : isLast
              ? "top-0 h-[33px] sm:h-[39px] md:h-1/2"
              : "top-0 h-full"
        }`} />
      )}

      <div className={`relative z-10 flex w-full max-w-6xl flex-col items-start gap-6 pl-20 pr-4 sm:pl-24 sm:pr-6 md:flex-row md:items-center md:gap-12 lg:gap-16 md:px-4
        ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
      >
        <div className={`relative w-full space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700 md:w-[min(30rem,42vw)] md:space-y-6 lg:w-[min(34rem,44vw)] ${isEven ? "md:text-right" : "md:text-left"} pt-7 sm:pt-9 md:pt-0`}>
          <h3
            ref={titleRef}
            onClick={handleOpenModal}
            className={`text-2xl font-black leading-tight tracking-tight sm:text-3xl md:text-4xl hover:text-sol-accent cursor-pointer transition-colors ${isPassed ? "text-sol-green" : "text-sol-text"}`}
          >
            {title}
          </h3>

          <div className={`flex flex-wrap items-center gap-4 text-xs text-sol-muted sm:gap-6 sm:text-sm ${isEven ? "md:justify-end" : "md:justify-start"}`}>
            <span className="flex items-center gap-2">
              <Clock size={16} className={accentTextClass} />
              {t("estimatedTime", { min: 45 })}
            </span>
            <span className="flex items-center gap-2">
              <BookOpen size={16} className={accentTextClass} />
              {commonT("format")}
            </span>
          </div>

        </div>

        <div
          onClick={handleOpenModal}
          className="absolute left-10 sm:left-12 top-5 sm:top-7 -translate-x-1/2 md:relative md:left-auto md:top-auto md:translate-x-0 md:translate-y-0 flex w-20 items-center justify-center sm:w-24 md:w-40 cursor-pointer"
        >
          <div className={`group z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 bg-sol-bg transition-transform duration-500 hover:scale-110 sm:h-16 sm:w-16 md:h-20 md:w-20 ${isPassed ? "border-sol-green shadow-[0_0_30px_rgba(var(--sol-green-rgb),0.3)]" : "border-sol-accent shadow-[0_0_30px_rgba(var(--sol-accent-rgb),0.3)]"}`}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-sol-bg sm:h-8 sm:w-8 md:h-10 md:w-10 ${isPassed ? "bg-sol-green" : "bg-sol-accent"}`}>
              {isPassed ? <Check size={18} className="sm:h-5 sm:w-5" /> : <span className="text-base font-black sm:text-lg">{index}</span>}
            </div>
          </div>

          <div className={`absolute h-20 w-20 animate-ping rounded-full opacity-20 sm:h-24 sm:w-24 md:h-32 md:w-32 ${isPassed ? "bg-sol-green/10" : "bg-sol-accent/10"}`} />
        </div>

        <div className="hidden md:block md:w-[min(30rem,42vw)] lg:w-[min(34rem,44vw)]" />
      </div>

      {isModalOpen && (
        <>
          <button
            type="button"
            aria-label="Close modal"
            className="fixed inset-0 z-[60] cursor-default bg-transparent"
            onClick={handleCloseModal}
          />

          <div
            className="animate-milestone-pop fixed z-[80] flex origin-top-left flex-col gap-3 rounded-[1.5rem] border border-sol-border/20 bg-sol-surface p-4 shadow-2xl"
            style={{
              top: `${modalPosition.top}px`,
              left: `${modalPosition.left}px`,
              width: `${modalPosition.width}px`
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              prefetch={false}
              href={`/student/learning/${gradeId}/${lessonId}`}
              onClick={handleCloseModal}
              className={`group flex w-full items-center justify-center gap-3 rounded-2xl border px-6 py-3 text-center font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${accentButtonClass}`}
            >
              <span>{t("startLesson")}</span>
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <button
              type="button"
              onClick={handleStartPractice}
              disabled={loading}
              className={`group flex w-full items-center justify-center gap-3 rounded-2xl border px-6 py-3 font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 ${practiceButtonClass}`}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <PlayCircle size={18} className="transition-transform group-hover:scale-110" />
              )}
              <span>{loading ? practiceT("starting") : isPassed ? practiceT("reviewBtn") : practiceT("startBtn")}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
