"use client";

import ProtectedRoute from "@/components/guard/ProtectedRoute";
import CreateTemplateModal from "@/components/feature/CreateTemplateModal";
import { testService } from "@/services/testService";
import { formatTemplate } from "@/utils/mathService";
import { AlertTriangle, CheckCircle2, Clock3, Flag, Loader2, Pencil, RefreshCw, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type ReportStatus = "all" | "open" | "reviewing" | "resolved" | "dismissed";

type QuestionReport = {
  id: string;
  reason: string;
  status: Exclude<ReportStatus, "all">;
  created_at: string;
  reporter?: {
    id: string;
    username: string;
    email: string;
  } | null;
  template?: {
    id: string;
    template_type: string;
    difficulty: string;
    body_template_en: string;
    body_template_vi: string;
    accepted_formulas?: string[];
    lesson?: {
      id: string;
      title_en: string;
      title_vi: string;
      grade?: {
        title_en: string;
        title_vi: string;
      } | null;
      subject?: {
        title_en: string;
        title_vi: string;
      } | null;
    } | null;
  } | null;
  snapshot?: {
    id: string;
    generated_variables?: Record<string, unknown>;
    student_answer?: string | null;
    is_correct?: boolean | null;
  } | null;
  attempt?: {
    id: string;
    is_practice: boolean;
    started_at: string;
  } | null;
};

type ApiError = {
  response?: {
    data?: {
      error?: string;
    };
  };
};

const statusOptions: ReportStatus[] = ["all", "open", "reviewing", "resolved", "dismissed"];
const editableStatuses: Exclude<ReportStatus, "all">[] = ["open", "reviewing", "resolved", "dismissed"];

const getErrorMessage = (err: unknown, fallback: string) => {
  return (err as ApiError)?.response?.data?.error || fallback;
};

export default function AdminReportsPage() {
  const t = useTranslations("AdminReports");
  const locale = useLocale();
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [status, setStatus] = useState<ReportStatus>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await testService.listQuestionReports(status);
      setReports(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.load")));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return reports;

    return reports.filter((report) => {
      const template = report.template;
      const lesson = template?.lesson;
      const reporter = report.reporter;
      return [
        report.reason,
        template?.body_template_en,
        template?.body_template_vi,
        template?.template_type,
        lesson?.title_en,
        lesson?.title_vi,
        reporter?.username,
        reporter?.email,
      ].some((value) => String(value || "").toLowerCase().includes(needle));
    });
  }, [reports, search]);

  const totals = useMemo(() => {
    return {
      all: reports.length,
      active: reports.filter((report) => ["open", "reviewing"].includes(report.status)).length,
      resolved: reports.filter((report) => report.status === "resolved").length,
    };
  }, [reports]);

  const handleStatusChange = async (reportId: string, nextStatus: string) => {
    setUpdatingId(reportId);
    setError(null);
    try {
      const updated = await testService.updateQuestionReport(reportId, nextStatus);
      setReports((current) => current.map((report) => (
        report.id === reportId ? { ...report, ...updated } : report
      )));
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("errors.update")));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTemplateModalClose = () => {
    setEditTemplateId(null);
  };

  const handleTemplateUpdated = () => {
    loadReports();
  };

  const getQuestionText = (report: QuestionReport) => {
    const template = report.template;
    if (!template) return t("unknownQuestion");
    const body = locale === "vi" ? template.body_template_vi : template.body_template_en;
    return formatTemplate(body, report.snapshot?.generated_variables || {});
  };

  const getLessonTitle = (report: QuestionReport) => {
    const lesson = report.template?.lesson;
    if (!lesson) return t("unassignedLesson");
    const subject = lesson.subject ? (locale === "vi" ? lesson.subject.title_vi : lesson.subject.title_en) : "";
    const grade = lesson.grade ? (locale === "vi" ? lesson.grade.title_vi : lesson.grade.title_en) : "";
    const lessonTitle = locale === "vi" ? lesson.title_vi : lesson.title_en;
    return [subject, grade, lessonTitle].filter(Boolean).join(" / ");
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-sol-border/20 bg-sol-surface px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sol-accent">
              <Flag size={13} />
              {t("eyebrow")}
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-sol-text">{t("title")}</h1>
            <p className="mt-2 max-w-2xl font-bold text-sol-muted">{t("subtitle")}</p>
          </div>

          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-sol-border/20 bg-sol-surface px-4 py-3 text-sm font-black text-sol-text transition-colors hover:border-sol-accent/40 hover:text-sol-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t("refresh")}
          </button>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label={t("metrics.current")} value={totals.all} icon={<Flag size={20} />} />
          <MetricCard label={t("metrics.active")} value={totals.active} icon={<Clock3 size={20} />} />
          <MetricCard label={t("metrics.resolved")} value={totals.resolved} icon={<CheckCircle2 size={20} />} />
        </div>

        <section className="rounded-lg border border-sol-border/10 bg-sol-surface p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-sol-muted">{t("statusFilter")}</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ReportStatus)}
                className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 text-sm font-bold text-sol-text outline-none focus:border-sol-accent"
              >
                {statusOptions.map((item) => (
                  <option key={item} value={item}>{t(`statuses.${item}`)}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-sol-muted">{t("search")}</span>
              <div className="flex items-center gap-2 rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-3 focus-within:border-sol-accent">
                <Search size={16} className="text-sol-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-sm font-bold text-sol-text outline-none placeholder:text-sol-muted/60"
                />
              </div>
            </label>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="animate-spin text-sol-accent" size={36} />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-lg border border-sol-border/10 bg-sol-surface p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sol-accent/10 text-sol-accent">
              <Flag size={24} />
            </div>
            <h2 className="text-xl font-black text-sol-text">{t("empty.title")}</h2>
            <p className="mt-1 font-bold text-sol-muted">{t("empty.subtitle")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <article key={report.id} className="rounded-lg border border-sol-border/10 bg-sol-surface p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={report.status} label={t(`statuses.${report.status}`)} />
                      <span className="rounded-lg bg-sol-bg px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sol-muted">
                        {report.template?.template_type || t("unknownType")}
                      </span>
                      <span className="rounded-lg bg-sol-orange/10 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-sol-orange">
                        {report.template?.difficulty || t("unknownDifficulty")}
                      </span>
                    </div>

                    <h2 className="text-xl font-black leading-snug text-sol-text">{getQuestionText(report)}</h2>
                    <p className="text-sm font-bold text-sol-muted">{getLessonTitle(report)}</p>
                  </div>

                  <label className="min-w-[180px] space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sol-muted">{t("setStatus")}</span>
                    <select
                      value={report.status}
                      disabled={updatingId === report.id}
                      onChange={(event) => handleStatusChange(report.id, event.target.value)}
                      className="w-full rounded-lg border border-sol-border/30 bg-sol-bg px-3 py-2 text-sm font-bold text-sol-text outline-none focus:border-sol-accent disabled:opacity-60"
                    >
                      {editableStatuses.map((item) => (
                        <option key={item} value={item}>{t(`statuses.${item}`)}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-lg bg-sol-bg p-4">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-sol-muted">{t("reason")}</div>
                    <p className="whitespace-pre-wrap text-sm font-bold leading-6 text-sol-text">{report.reason}</p>
                  </div>

                  <div className="space-y-2 rounded-lg bg-sol-bg p-4 text-sm font-bold text-sol-muted">
                    <InfoRow label={t("reportedBy")} value={report.reporter?.username || t("unknownUser")} />
                    <InfoRow label={t("reportedAt")} value={formatDate(report.created_at)} />
                    <InfoRow label={t("studentAnswer")} value={report.snapshot?.student_answer || t("unanswered")} />
                    <InfoRow label={t("templateId")} value={report.template?.id || t("unknownQuestion")} />
                    {report.template?.id && (
                      <button
                        type="button"
                        onClick={() => setEditTemplateId(report.template?.id || null)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sol-accent px-3 py-2.5 text-xs font-black uppercase tracking-widest text-sol-bg transition-colors hover:bg-sol-orange"
                      >
                        <Pencil size={14} />
                        {t("updateTemplate")}
                      </button>
                    )}
                    {report.attempt?.id && report.reporter?.id && (
                      <Link
                        href={`/admin/users/${report.reporter.id}/attempts/${report.attempt.id}`}
                        className="inline-flex pt-2 text-xs font-black uppercase tracking-widest text-sol-accent hover:text-sol-orange"
                      >
                        {t("viewAttempt")}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <CreateTemplateModal
          key={editTemplateId || "report-template-editor"}
          isOpen={!!editTemplateId}
          onClose={handleTemplateModalClose}
          onSuccess={handleTemplateUpdated}
          editTemplateId={editTemplateId}
        />
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-sol-border/10 bg-sol-surface p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sol-accent/10 text-sol-accent">
        {icon}
      </div>
      <div className="text-[10px] font-black uppercase tracking-widest text-sol-muted">{label}</div>
      <div className="text-3xl font-black text-sol-text">{value}</div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const className = status === "resolved"
    ? "bg-green-500/10 text-green-500"
    : status === "dismissed"
      ? "bg-sol-muted/10 text-sol-muted"
      : status === "reviewing"
        ? "bg-sol-orange/10 text-sol-orange"
        : "bg-sol-accent/10 text-sol-accent";

  return (
    <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${className}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sol-muted">{label}</span>
      <span className="max-w-[150px] truncate text-right text-sol-text" title={value}>{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
