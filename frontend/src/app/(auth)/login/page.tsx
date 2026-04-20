"use client";

import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("Login");
  const { login, error: authError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Define schema inside to use the 't' function for validation messages
  const loginSchema = z.object({
    email: z.string().email(t("errors.invalid_email")),
    password: z.string().min(6, t("errors.password_too_short")),
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
      await login(data);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[440px]">
        <div className="bg-sol-surface border border-sol-border/30 rounded-xl p-10 shadow-sm">

          <div className="mb-4 flex flex-col items-center">
            <div className="mb-2">
              <Image src="/anhoc.svg" alt="Anhoc Logo" width={640} height={320} className="w-auto h-48" priority />
            </div>
            <h2 className="text-3xl font-black text-sol-text tracking-tight text-center">
              {t("title")}
            </h2>
          </div>

          {authError && (
            <div className="mb-6 rounded-lg bg-sol-red/10 border border-sol-red/20 p-3 text-sm text-sol-red">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <input
                {...register("email")}
                type="email"
                placeholder={t("email_placeholder")}
                className="w-full px-4 py-3 rounded-lg border border-sol-border/50 bg-sol-bg text-sol-text placeholder-sol-muted/60 focus:outline-none focus:ring-2 focus:ring-sol-accent/50 focus:border-sol-accent transition-all"
              />
              {errors.email && (
                <p className="text-xs text-sol-orange mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="relative group/pass">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder={t("password_placeholder")}
                className="w-full px-4 py-3 rounded-lg border border-sol-border/50 bg-sol-bg text-sol-text placeholder-sol-muted/60 focus:outline-none focus:ring-2 focus:ring-sol-accent/50 focus:border-sol-accent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-sol-muted hover:text-sol-accent transition-colors duration-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && (
                <p className="text-xs text-sol-orange mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Options */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-sol-text cursor-pointer">
                <input type="checkbox" className="rounded border-sol-border text-sol-accent focus:ring-sol-accent bg-sol-bg" />
                <span>{t("remember_me")}</span>
              </label>
              <a href="#" className="font-semibold text-sol-accent hover:underline">
                {t("forgot_password")}
              </a>
            </div>

            {/* Main Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-bold bg-sol-accent text-sol-bg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isLoading ? t("signing_in") : t("sign_in")}
            </button>
          </form>

          {/* Footer Link */}
          <p className="mt-8 text-center text-sm text-sol-muted">
            {t("no_account")}{" "}
            <a href="#" className="font-bold text-sol-accent hover:underline">
              {t("sign_up")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}