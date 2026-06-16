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
              <span className="font-semibold text-sol-muted">{t("activation_hint")}</span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-sol-accent py-3 font-bold text-sol-bg transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? t("signing_in") : t("sign_in")}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-sol-muted">
            {t("no_account")}{" "}
            <Link href="/signup" className="font-bold text-sol-accent hover:underline">
              {t("sign_up")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
