"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { lessonService, Subject } from "@/services/lessonService";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";

export default function SubjectOnboardingPage() {
  const t = useTranslations("Onboarding");
  const locale = useLocale();
  const router = useRouter();
  const { updateSession } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const items = await lessonService.getSubjects();
        setSubjects(items);
        setSelectedSubjectId(items[0]?.id ?? null);
      } catch (loadError) {
        console.error(loadError);
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [t]);

  const submit = async () => {
    if (!selectedSubjectId) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await authService.setSubjectPreference(selectedSubjectId);
      updateSession(response);
      router.replace("/student");
    } catch (submitError) {
      console.error(submitError);
      setError(t("saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[2rem] border border-sol-border/25 bg-sol-surface p-8 shadow-xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sol-accent">{t("badge")}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-sol-text">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-sol-muted md:text-base">{t("subtitle")}</p>

        {error && (
          <div className="mt-6 rounded-xl border border-sol-red/20 bg-sol-red/10 px-4 py-3 text-sm text-sol-red">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {loading ? (
            <div className="rounded-2xl border border-sol-border/20 bg-sol-bg/70 p-5 text-sm text-sol-muted">
              {t("loading")}
            </div>
          ) : (
            subjects.map((subject) => {
              const label = locale === "vi" ? subject.title_vi : subject.title_en;
              const isActive = selectedSubjectId === subject.id;

              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={`rounded-[1.6rem] border p-5 text-left transition ${
                    isActive
                      ? "border-sol-accent bg-sol-accent/10 shadow-lg shadow-sol-accent/10"
                      : "border-sol-border/20 bg-sol-bg/70 hover:border-sol-accent/40"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sol-muted">{subject.slug}</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-sol-text">{label}</p>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!selectedSubjectId || loading || submitting}
            className="rounded-2xl bg-sol-accent px-6 py-4 text-sm font-black uppercase tracking-wider text-sol-bg disabled:opacity-50"
          >
            {submitting ? t("saving") : t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
