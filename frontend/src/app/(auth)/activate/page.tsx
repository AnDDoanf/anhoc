"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth";

export default function ActivatePage() {
  const t = useTranslations("Activate");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage(t("missingToken"));
      return;
    }

    const activate = async () => {
      try {
        const response = await authService.activate(token);
        setStatus("success");
        setMessage(response.message || t("success"));
      } catch (error: unknown) {
        const value = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || t("failed");
        setStatus("error");
        setMessage(value);
      }
    };

    void activate();
  }, [searchParams, t]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-sol-border/30 bg-sol-surface p-8 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight text-sol-text">{t("title")}</h1>
        <p className="mt-3 text-sm leading-7 text-sol-muted">
          {status === "loading" ? t("loading") : message}
        </p>

        <div className="mt-6">
          <Link href="/login" className="inline-flex rounded-xl bg-sol-accent px-5 py-3 text-sm font-black uppercase tracking-wider text-sol-bg">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
