"use client";

import { useTranslations, useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { testService } from "@/services/testService";
import { Loader2, ArrowRight, ArrowLeft, Send, CheckCircle2, XCircle, Award } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { formatTemplate } from "@/utils/mathService";
import ConfirmModal from "@/components/ui/ConfirmModal";
import * as LucideIcons from "lucide-react";


export default function PracticeRunnerPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const router = useRouter();
  const t = useTranslations("Practice");
  const commonT = useTranslations("Common");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answerInput, setAnswerInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [newlyEarned, setNewlyEarned] = useState<any[]>([]);
  const [finishModalType, setFinishModalType] = useState<"complete" | "abandon" | null>(null);

  useEffect(() => {
    fetchAttempt();
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      const data = await testService.getAttempt(attemptId);
      setAttempt(data);
      if (data.is_completed) {
        setIsFinished(true);
      } else {

        const firstUnansweredIndex = data.snapshots.findIndex((s: any) => s.student_answer === null);
        if (firstUnansweredIndex !== -1) {
          setCurrentIndex(firstUnansweredIndex);
        } else {
          setCurrentIndex(data.snapshots.length - 1);
        }
      }
    } catch (error) {
      console.error("Failed to load attempt:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentSnapshot = attempt?.snapshots[currentIndex];


  const currentTextEn = currentSnapshot?.template?.body_template_en
    ? formatTemplate(currentSnapshot.template.body_template_en, currentSnapshot.generated_variables) : "";
  const currentTextVi = currentSnapshot?.template?.body_template_vi
    ? formatTemplate(currentSnapshot.template.body_template_vi, currentSnapshot.generated_variables) : "";

  const primaryText = locale === "vi" ? currentTextVi : currentTextEn;
  const secondaryText = locale === "vi" ? currentTextEn : currentTextVi;


  const isAlreadyAnswered = currentSnapshot?.student_answer !== null;

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent | KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!answerInput || isAlreadyAnswered || submitting) return;

    setSubmitting(true);
    try {
      const res = await testService.submitAnswer(currentSnapshot.id, answerInput);
      setStatus(res.isCorrect ? "correct" : "incorrect");

      setAttempt((prev: any) => {
        const newSnapshots = [...prev.snapshots];
        newSnapshots[currentIndex] = {
          ...newSnapshots[currentIndex],
          student_answer: answerInput,
          is_correct: res.isCorrect
        };
        return { ...prev, snapshots: newSnapshots };
      });
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isAlreadyAnswered || submitting) return;

    setSubmitting(true);
    try {

      const res = await testService.submitAnswer(currentSnapshot.id, "");
      setStatus("incorrect");
      setAttempt((prev: any) => {
        const newSnapshots = [...prev.snapshots];
        newSnapshots[currentIndex] = {
          ...newSnapshots[currentIndex],
          student_answer: t("skipQuestion"),
          is_correct: false
        };
        return { ...prev, snapshots: newSnapshots };
      });
    } catch (error) {
      console.error("Failed to skip question:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < attempt.snapshots.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswerInput("");
      setStatus("idle");
    } else {
      setFinishModalType("complete");
    }
  };

  const handleFinish = () => {
    setFinishModalType("abandon");
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmFinish = async () => {
    if (isSubmitting) return;

    const actionType = finishModalType;
    setIsSubmitting(true);
    try {
      const data = await testService.finishAttempt(attemptId);


      setFinishModalType(null);


      if (data.newlyEarned) {
        setNewlyEarned(data.newlyEarned);
      }


      setIsFinished(true);


      setAttempt((prev: any) => ({
        ...prev,
        is_completed: true,
        total_score: data.total_score
      }));

      window.dispatchEvent(new Event("student-stats-updated"));

      if (actionType === "abandon") {
        handleReturnToLesson();
      }

    } catch (error: any) {

      if (error.response?.status === 400) {
        setIsFinished(true);
        setFinishModalType(null);
        if (actionType === "abandon") {
          handleReturnToLesson();
        }
      } else {
        console.error("Failed to finish:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnToLesson = () => {
    const template = attempt?.snapshots?.[0]?.template;
    const lessonId = template?.lesson?.id;
    const gradeSlug = template?.lesson?.grade?.slug;

    if (lessonId && gradeSlug) {
      router.push(`/student/learning/${gradeSlug}/${lessonId}`);
    } else {
      router.push('/student/learning');
    }
  };

  const onModalConfirm = () => {
    confirmFinish();
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if (submitting) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";


      if (isAlreadyAnswered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }


      if (!isAlreadyAnswered && !isInput && e.key === "Enter") {
        if (answerInput) {
          e.preventDefault();
          handleSubmit(e);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAlreadyAnswered, currentIndex, attempt, answerInput, submitting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-sol-accent" size={48} />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <h1 className="text-4xl font-black text-sol-text">{commonT("error.notFound")}</h1>
        <button onClick={() => router.back()} className="text-sol-accent hover:underline">
          {commonT("back")}
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center text-center space-y-6 bg-sol-surface/30 p-12 rounded-[3rem] border border-sol-border/10">
          <div className="w-24 h-24 rounded-full bg-sol-accent text-sol-bg flex items-center justify-center shadow-[0_0_50px_rgba(var(--sol-accent-rgb),0.5)]">
            <Award size={48} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-sol-text tracking-tight">{t("completeTitle")}</h1>
          <p className="text-sol-muted text-lg max-w-md">
            {t("scoreMessage", { score: attempt.total_score })}
          </p>

          {/* Newly Earned Achievements */}
          {newlyEarned.length > 0 && (
            <div className="w-full mt-12 space-y-6">
              <div className="flex items-center gap-4 justify-center">
                <div className="h-px w-12 bg-sol-accent/20" />
                <span className="text-xs font-black text-sol-accent uppercase tracking-widest">Achievements Earned</span>
                <div className="h-px w-12 bg-sol-accent/20" />
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {newlyEarned.map((ach: any) => {
                  const Icon = (LucideIcons as any)[ach.icon || "Trophy"] || LucideIcons.Trophy;
                  return (
                    <div key={ach.slug} className="flex flex-col items-center gap-3 p-6 bg-sol-surface rounded-[2rem] border border-sol-accent/20 shadow-xl animate-in slide-in-from-bottom-4 duration-500 hover:scale-105 transition-transform">
                      <div className="p-3 bg-sol-accent/10 text-sol-accent rounded-2xl">
                        <Icon size={24} />
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-sol-text">
                          {locale === "vi" ? ach.title_vi : ach.title_en}
                        </div>
                        <div className="text-[10px] font-black text-sol-accent mt-0.5">+{ach.xp_reward} XP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleReturnToLesson}
            className="mt-8 px-12 py-4 bg-sol-accent text-sol-bg rounded-2xl font-bold hover:bg-sol-accent/90 transition-all shadow-lg hover:shadow-sol-accent/20 active:scale-95"
          >
            {t("returnToLesson")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleFinish}
          className="flex items-center gap-2 text-sol-muted hover:text-red-500 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} /> {t("finishAbandon")}
        </button>

        <div className="flex items-center gap-2 px-4 py-2 bg-sol-surface rounded-full border border-sol-border/10 text-sm font-bold text-sol-muted">
          {t("questionInfo", { current: currentIndex + 1, total: attempt.snapshots.length })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-sol-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-sol-accent transition-all duration-500"
          style={{ width: `${((currentIndex) / attempt.snapshots.length) * 100}%` }}
        />
      </div>

      {/* Runner Card */}
      <div className="bg-sol-surface border border-sol-border/10 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col gap-8 shadow-sm">

        {/* Status stripe */}
        <div className={`absolute top-0 left-0 w-full h-1 transition-colors duration-500
          ${currentSnapshot?.student_answer
            ? (currentSnapshot.is_correct ? 'bg-green-500' : 'bg-red-500')
            : (status === 'correct' ? 'bg-green-500' : status === 'incorrect' ? 'bg-red-500' : 'bg-sol-accent')}
        `} />

        {/* Question Content */}
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none prose-p:text-sol-text prose-strong:text-sol-accent text-xl md:text-2xl leading-relaxed font-bold">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{primaryText}</ReactMarkdown>
          </div>
          <div className="prose dark:prose-invert max-w-none prose-p:text-sol-muted/70 text-base md:text-lg leading-relaxed italic">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{secondaryText}</ReactMarkdown>
          </div>
        </div>

        {/* Answer Area */}
        <div className="pt-8 border-t border-sol-border/10 space-y-6">
          {isAlreadyAnswered ? (
            <div className="flex flex-col gap-6">
              <div className="w-full bg-sol-bg/50 border-2 border-sol-border/20 rounded-2xl px-6 py-4 text-sol-text font-mono font-bold text-lg opacity-70">
                {t("yourAnswer", { answer: currentSnapshot.student_answer })}
              </div>

              {currentSnapshot.is_correct ? (
                <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 p-5 rounded-xl">
                  <CheckCircle2 size={24} /> {t("correct")}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500/90 font-bold bg-red-500/10 p-5 rounded-xl">
                  <XCircle size={24} /> {t("incorrect")}
                </div>
              )}

              <button
                autoFocus
                onClick={handleNext}
                className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-sol-surface text-sol-text rounded-2xl font-bold border border-sol-border/20 hover:bg-sol-accent hover:text-sol-bg hover:border-sol-accent transition-all group shadow-sm focus:ring-4 focus:ring-sol-accent/30"
              >
                <span>{currentIndex < attempt.snapshots.length - 1 ? t("nextQuestion") : t("finishBtn")}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  value={answerInput}
                  onChange={(e) => {
                    setAnswerInput(e.target.value);
                    setStatus("idle");
                  }}
                  placeholder={t("enterAnswer")}
                  disabled={submitting}
                  className={`w-full bg-sol-bg border-2 rounded-2xl px-6 py-4 text-sol-text placeholder-sol-muted/40 outline-none transition-all font-mono font-bold text-lg disabled:opacity-50
                    ${status === 'correct' ? 'border-green-500/50 focus:border-green-500' : ''}
                    ${status === 'incorrect' ? 'border-red-500/50 focus:border-red-500' : ''}
                    ${status === 'idle' ? 'border-sol-border/20 focus:border-sol-accent/50' : ''}
                  `}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={submitting || !answerInput}
                  className="absolute right-2 p-3 bg-sol-surface rounded-xl text-sol-accent hover:bg-sol-accent hover:text-sol-bg transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={submitting}
                  className="text-sm font-bold text-sol-muted hover:text-sol-orange transition-colors"
                >
                  {t("skipQuestion")}
                </button>
              </div>

              {status === "correct" && (
                <div className="flex items-center gap-2 text-green-500 font-bold bg-green-500/10 p-5 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <CheckCircle2 size={24} /> {t("correct")}
                </div>
              )}
              {status === "incorrect" && (
                <div className="flex items-center gap-2 text-red-500/90 font-bold bg-red-500/10 p-5 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <XCircle size={24} /> {t("notQuiteRight")}
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        onConfirm={onModalConfirm}
        isOpen={finishModalType !== null}
        title={finishModalType === "complete" ? t("modals.completeTitle") : t("modals.abandonTitle")}
        message={
          finishModalType === "complete"
            ? t("modals.completeMessage")
            : t("modals.abandonMessage")
        }
        confirmText={finishModalType === "complete" ? t("modals.submitBtn") : t("modals.abandonBtn")}
        cancelText={finishModalType === "complete" ? t("modals.cancel") : t("modals.keepGoing")}
        onCancel={() => setFinishModalType(null)}
        isDestructive={finishModalType === "abandon"}
      />
    </div>
  );
}
