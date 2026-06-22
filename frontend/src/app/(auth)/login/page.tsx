"use client";

import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Logo from "@/components/ui/Logo";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import LanguageToggle from "@/components/ui/LanguageToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LoadingOverlayWrapper from "@/components/ui/LoadingOverlayWrapper";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { API_BASE_URL } from "@/services/api";

export default function LoginPage() {
  const t = useTranslations("Login");
  const { login, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLearnUnit, setShowLearnUnit] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t("errors.invalid_email")),
    password: z.string().min(6, t("errors.password_too_short")),
    learn_unit_code: z.string().optional(),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await login({
        email: data.email,
        password: data.password,
        learn_unit_code: showLearnUnit ? data.learn_unit_code : undefined,
      });
      window.location.href = response.user.requires_subject_selection ? "/onboarding/subject" : "/";
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-8 relative min-h-screen">
      {/* Floating Toggles */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-40 bg-sol-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-sol-border/30 shadow-lg">
        <LanguageToggle />
        <span className="text-sol-border/20 select-none">|</span>
        <div className="px-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="w-full max-w-[440px]">
        <LoadingOverlayWrapper
          isLoading={isLoading}
          title={t("signing_in")}
          className="rounded-xl"
        >
        <div className="rounded-xl border border-sol-border/30 bg-sol-surface p-10 shadow-sm">
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-2">
              <Logo className="h-48 w-auto" />
            </div>
            <h2 className="text-center text-3xl font-black tracking-tight text-sol-text">{t("title")}</h2>
          </div>

          {authError && (
            <div className="mb-6 rounded-lg border border-sol-red/20 bg-sol-red/10 p-3 text-sm text-sol-red">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <input
                {...register("email")}
                type="email"
                placeholder={t("email_placeholder")}
                className="w-full rounded-lg border border-sol-border/50 bg-sol-bg px-4 py-3 text-sol-text placeholder-sol-muted/60 transition-all focus:border-sol-accent focus:outline-none focus:ring-2 focus:ring-sol-accent/50"
              />
              {errors.email && <p className="mt-1 text-xs text-sol-orange">{errors.email.message}</p>}
            </div>

            <div className="group/pass relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("password_placeholder")}
                className="w-full rounded-lg border border-sol-border/50 bg-sol-bg px-4 py-3 pr-12 text-sol-text placeholder-sol-muted/60 transition-all focus:border-sol-accent focus:outline-none focus:ring-2 focus:ring-sol-accent/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-sol-muted transition-colors duration-200 hover:text-sol-accent"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && <p className="mt-1 text-xs text-sol-orange">{errors.password.message}</p>}
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowLearnUnit((current) => !current)}
                className="text-xs font-semibold text-sol-accent hover:underline"
              >
                {showLearnUnit ? t("hide_learn_unit_code") : t("use_learn_unit_code")}
              </button>
            </div>

            {showLearnUnit && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <input
                  {...register("learn_unit_code")}
                  type="text"
                  placeholder={t("learn_unit_code_placeholder")}
                  className="w-full rounded-lg border border-sol-border/50 bg-sol-bg px-4 py-3 text-sol-text placeholder-sol-muted/60 transition-all focus:border-sol-accent focus:outline-none focus:ring-2 focus:ring-sol-accent/50"
                />
                <p className="mt-1 text-xs text-sol-muted">{t("learn_unit_code_hint")}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-sol-text">
                <input type="checkbox" className="rounded border-sol-border bg-sol-bg text-sol-accent focus:ring-sol-accent" />
                <span>{t("remember_me")}</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-sol-accent py-3 font-bold text-sol-bg transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size={16} />
                  <span>{t("signing_in")}</span>
                </span>
              ) : t("sign_in")}
            </button>
          </form>

          {/* Social Logins */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-sol-border/30"></div>
            </div>
            <span className="relative bg-sol-surface px-4 text-xs font-semibold text-sol-muted uppercase tracking-wider">
              {t("or_continue_with") || "Or continue with"}
            </span>
          </div>

          <div className="space-y-3">
            {/* Google Button */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `${API_BASE_URL}/auth/google`;
              }}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-sol-border/50 bg-sol-bg px-4 py-3 text-sm font-semibold text-sol-text transition-all hover:bg-sol-surface hover:border-sol-accent active:scale-[0.99] hover:cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{t("google_sign_in")}</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/auth/facebook`;
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-sol-border/50 bg-sol-bg px-3 py-3 text-xs font-semibold text-sol-text transition-all hover:bg-sol-surface hover:border-sol-accent active:scale-[0.99] hover:cursor-pointer"
              >
                <svg className="h-4.5 w-4.5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>{t("facebook") || "Facebook"}</span>
              </button>

              {/* Microsoft Button */}
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${API_BASE_URL}/auth/microsoft`;
                }}
                className="flex items-center justify-center gap-2 rounded-lg border border-sol-border/50 bg-sol-bg px-3 py-3 text-xs font-semibold text-sol-text transition-all hover:bg-sol-surface hover:border-sol-accent active:scale-[0.99] hover:cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" width="23" height="23" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                  <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                  <rect x="0" y="12" width="11" height="11" fill="#00A1F1"/>
                  <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                </svg>
                <span className="truncate">{t("outlook") || "Outlook"}</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-sol-muted">
            {t("no_account")}{" "}
            <Link href="/signup" className="font-bold text-sol-accent hover:underline">
              {t("sign_up")}
            </Link>
          </p>
        </div>
        </LoadingOverlayWrapper>
      </div>
    </div>
  );
}
