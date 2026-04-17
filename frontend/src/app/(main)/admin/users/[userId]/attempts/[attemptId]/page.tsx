"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { testService } from "@/services/testService";
import { formatTemplate } from "@/utils/mathService";
import { normalizeQuestionType } from "@/utils/questionType";
import { ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import remarkMath from "remark-math";

type AttemptReview = {
  id: string;
  total_score?: number | string | null;
  is_completed?: boolean | null;
  is_practice: boolean;
  started_at: string;
  completed_at?: string | null;
  snapshots: SnapshotReview[];
};

type SnapshotReview = {
  id: string;
  generated_variables: Record<string, unknown>;
  student_answer?: string | null;
  right_answers?: string[];
  is_correct?: boolean | null;
  points_earned?: number | null;
  responded_at?: string | null;
  template?: {
    template_type: string;
    body_template_en: string;
    body_template_vi: string;
    explanation_template_en?: string | null;
    explanation_template_vi?: string | null;
  } | null;
};

export default function AdminAttemptReviewPage() {
  const t = useTranslations("AdminAttemptReview");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const params = useParams<{ userId: string; attemptId: string }>();
  const { userId, attemptId } = params;
  const [attempt, setAttempt] = useState<AttemptReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttempt = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await testService.getAttempt(attemptId);
        setAttempt(data);
      } catch (err) {
        console.error("Failed to load attempt review:", err);
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) {
      fetchAttempt();
    }
  }, [attemptId, t]);

  const score = Number(attempt?.total_score || 0);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link
          href={`/admin/users/${userId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-sol-border/30 bg-sol-surface px-4 py-2 text-sm font-black text-sol-muted transition hover:border-sol-accent/40 hover:text-sol-accent"
        >
          <ArrowLeft size={16} />
          {t("backToInsight")}
        </Link>

        {loading && (
          <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-sol-border/10 bg-sol-surface p-8">
            <Loader2 className="animate-spin text-sol-accent" size={42} />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 font-black text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && !attempt && (
          <div className="rounded-lg border border-sol-border/10 bg-sol-surface p-8 text-center">
            <h1 className="text-3xl font-black text-sol-text">{commonT("error.notFound")}</h1>
          </div>
        )}

        {attempt && !loading && (
          <>
            <section className="rounded-lg border border-sol-border/10 bg-sol-surface p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="mb-3 pill-badge inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-black uppercase tracking-[0.28em]">
                    {t("eyebrow")}
                  </div>
                  <h1 className="text-3xl font-black text-sol-text sm:text-4xl">
                    {t("title")}
                  </h1>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-sol-muted">
                    <span className="inline-flex items-center gap-2">
                      <Clock size={15} />
                      {format(new Date(attempt.started_at), "HH:mm, MMM d, yyyy")}
                    </span>
                    <span>{t("questions", { count: attempt.snapshots.length })}</span>
                  </div>
                </div>
                <div className={`rounded-lg px-4 py-3 text-2xl font-black ${score >= 80 ? "bg-green-500/10 text-green-500" : "bg-sol-orange/10 text-sol-orange"}`}>
                  {Math.round(score)}%
                </div>
              </div>
            </section>

            <div className="space-y-4">
              {attempt.snapshots.map((snapshot, index) => (
                <QuestionReviewCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  index={index}
                  total={attempt.snapshots.length}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function QuestionReviewCard({
  snapshot,
  index,
  total,
  locale,
  t,
}: {
  snapshot: SnapshotReview;
  index: number;
  total: number;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const template = snapshot.template;
  const primaryText = useMemo(() => {
    if (!template) return "";
    const body = locale === "vi" ? template.body_template_vi : template.body_template_en;
    return formatTemplate(body, snapshot.generated_variables);
  }, [template, locale, snapshot.generated_variables]);

  const secondaryText = useMemo(() => {
    if (!template) return "";
    const body = locale === "vi" ? template.body_template_en : template.body_template_vi;
    return formatTemplate(body, snapshot.generated_variables);
  }, [template, locale, snapshot.generated_variables]);

  const explanation = template
    ? locale === "vi"
      ? template.explanation_template_vi || template.explanation_template_en
      : template.explanation_template_en || template.explanation_template_vi
    : "";
  const answerText = snapshot.student_answer || t("unanswered");
  const rightAnswerText = snapshot.right_answers?.length ? snapshot.right_answers.join(", ") : t("noAnswerKey");
  const questionType = template ? normalizeQuestionType(template.template_type) : "numeric_input";

  return (
    <section className="overflow-hidden rounded-lg border border-sol-border/10 bg-sol-surface shadow-sm">
      <div className={`h-1 ${snapshot.is_correct ? "bg-green-500" : "bg-red-500"}`} />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-widest text-sol-muted">
            {t("questionNumber", { current: index + 1, total })}
          </div>
          <div className="rounded-lg bg-sol-bg px-3 py-1 text-xs font-black uppercase tracking-wider text-sol-muted">
            {t(`types.${questionType}`)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none prose-p:text-sol-text prose-strong:text-sol-accent text-xl leading-relaxed font-bold">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {primaryText}
            </ReactMarkdown>
          </div>
          {secondaryText && (
            <div className="prose dark:prose-invert max-w-none prose-p:text-sol-muted/70 text-base leading-relaxed italic">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {secondaryText}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnswerBox label={t("studentAnswer")} value={answerText} />
          <AnswerBox label={t("correctAnswer")} value={rightAnswerText} accent />
        </div>

        <div className={`flex items-center gap-2 rounded-lg p-4 font-black ${snapshot.is_correct ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
          {snapshot.is_correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          {snapshot.is_correct ? t("correct") : t("incorrect")}
        </div>

        {explanation && (
          <div className="rounded-lg border border-sol-border/10 bg-sol-bg/40 p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-widest text-sol-muted">
              {t("explanation")}
            </div>
            <div className="prose dark:prose-invert max-w-none prose-p:text-sol-text">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {formatTemplate(explanation, snapshot.generated_variables)}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AnswerBox({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-sol-border/10 bg-sol-bg/40 p-4">
      <div className="mb-2 text-xs font-black uppercase tracking-widest text-sol-muted">{label}</div>
      <div className={`font-mono text-sm font-black ${accent ? "text-sol-accent" : "text-sol-text"}`}>
        {value}
      </div>
    </div>
  );
}
