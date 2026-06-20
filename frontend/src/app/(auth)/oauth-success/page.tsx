"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/auth";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

function OAuthSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { persistSession } = useAuth();
  const t = useTranslations("Common");
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");

    if (!token || !refreshToken) {
      setError("Authentication tokens are missing");
      setTimeout(() => {
        router.push("/login?error=oauth_missing_tokens");
      }, 2000);
      return;
    }

    processedRef.current = true;

    const processSession = async () => {
      try {
        // 1. Set headers & storage temporarily
        authService.setAuthHeader(token);
        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", refreshToken);
        document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        // 2. Fetch user profile
        const profile = await authService.getProfile();

        // 3. Persist session (saves user info and sets Redux credentials)
        persistSession({
          user: profile,
          token,
          refreshToken,
        });

        // 4. Redirect based on subject selection requirements
        if (profile.requires_subject_selection) {
          router.push("/onboarding/subject");
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("OAuth processing failed:", err);
        setError("Failed to fetch user profile");
        setTimeout(() => {
          router.push("/login?error=oauth_profile_failed");
        }, 2000);
      }
    };

    void processSession();
  }, [searchParams, router, persistSession]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-sol-bg px-4 text-center">
        <div className="rounded-2xl border border-sol-red/20 bg-sol-red/10 p-6 shadow-xl max-w-sm">
          <p className="text-sm font-bold text-sol-red mb-2">Error</p>
          <p className="text-sol-text text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sol-bg px-4 text-center">
      <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-sol-border/20 bg-sol-surface/60 backdrop-blur-lg shadow-2xl max-w-md w-full">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-sol-accent/10 blur-xl animate-pulse" />
          <div className="relative bg-sol-bg border border-sol-border/30 p-4 rounded-2xl">
            <LoadingSpinner size={36} className="text-sol-accent" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-sol-text mb-2">
          {t("syncingProfile") || "Syncing your profile..."}
        </h2>
        <p className="text-sm text-sol-muted font-medium">
          {t("syncingProfileDesc") || "Please wait while we set up your secure session."}
        </p>
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-sol-bg">
        <LoadingSpinner size={32} className="text-sol-accent" />
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  );
}
