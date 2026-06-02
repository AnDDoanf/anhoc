"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { authService } from "@/services/auth";

export default function SignupPage() {
  const t = useTranslations("Signup");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email(t("errors.invalid_email")),
    password: z.string().min(6, t("errors.password_too_short")),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await authService.register(values);
      setSuccessMessage(response.message || t("success"));
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || t("fallbackError");
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[440px]">
        <div className="rounded-xl border border-sol-border/30 bg-sol-surface p-10 shadow-sm">
          <div className="mb-4 flex flex-col items-center">
            <div className="mb-2">
              <Image src="/anhoc.svg" alt="Anhoc Logo" width={640} height={320} className="h-40 w-auto" priority />
            </div>
            <h2 className="text-center text-3xl font-black tracking-tight text-sol-text">{t("title")}</h2>
            <p className="mt-2 text-center text-sm text-sol-muted">{t("subtitle")}</p>
          </div>

          {successMessage && (
            <div className="mb-6 rounded-lg border border-sol-green/20 bg-sol-green/10 p-3 text-sm text-sol-green">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-sol-red/20 bg-sol-red/10 p-3 text-sm text-sol-red">
              {errorMessage}
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

            <div className="relative">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-sol-accent py-3 font-bold text-sol-bg transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? t("submitting") : t("submit")}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-sol-muted">
            {t("hasAccount")}{" "}
            <Link href="/login" className="font-bold text-sol-accent hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
