"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { authService } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ActivatePage() {
  const t = useTranslations("Activate");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { persistSession } = useAuth();
  
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
        // Persist session locally and in redux
        persistSession(response);
        
        setStatus("success");
        setMessage(response.message || t("success"));
        
        // Auto redirect to homepage after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (error: unknown) {
        const value = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || t("failed");
        setStatus("error");
        setMessage(value);
      }
    };

    void activate();
  }, [searchParams, t, persistSession, router]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10 relative">
      {/* Background decorations */}
      <div className="absolute top-[20%] left-[10%] h-44 w-44 rounded-full bg-sol-accent/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] h-44 w-44 rounded-full bg-sol-orange/5 blur-3xl pointer-events-none" />

      <div className="w-full rounded-[2rem] border border-sol-border/30 bg-sol-surface/90 backdrop-blur-md p-8 sm:p-10 shadow-2xl relative z-10 text-center animate-in fade-in duration-300">
        {status === "loading" && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <Loader2 className="animate-spin text-sol-accent" size={48} />
            <h1 className="text-2xl font-black tracking-tight text-sol-text">{t("title")}</h1>
            <p className="text-sm font-semibold text-sol-muted leading-relaxed">
              {t("loading")}
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <CheckCircle2 className="text-[#10b981] animate-bounce" size={48} />
            <h1 className="text-2xl font-black tracking-tight text-sol-text">
              {status === "success" ? (searchParams.get("locale") === "vi" ? "Xác Thực Thành Công" : "Verification Successful") : t("title")}
            </h1>
            <p className="text-sm font-bold text-sol-text leading-relaxed">
              {message}
            </p>
            <p className="text-xs font-semibold text-sol-muted leading-relaxed">
              {searchParams.get("locale") === "vi"
                ? "Đang đăng nhập và chuyển hướng bạn về trang chủ..."
                : "Logging you in and redirecting to the homepage..."}
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-6 space-y-4">
            <XCircle className="text-[#dc322f]" size={48} />
            <h1 className="text-2xl font-black tracking-tight text-sol-text">{t("title")}</h1>
            <p className="text-sm font-bold text-sol-red leading-relaxed">
              {message}
            </p>
            <div className="mt-6 w-full">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-sol-accent px-5 py-4 text-sm font-black uppercase tracking-wider text-sol-bg transition hover:opacity-95 transform hover:scale-[1.01] active:scale-95 shadow-md shadow-sol-accent/15"
              >
                {t("backToLogin")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
