"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useTranslations } from "next-intl";

export default function RootPage() {
  const router = useRouter();
  const t = useTranslations("Common");
  const { user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Wait for auth to be fully hydrated from localStorage/provider
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token && !storedToken) {
      router.replace("/login");
      return;
    }

    if (!user) return;

    if (user.role === "admin") {
      router.replace("/admin/dashboard");
    } else {
      // Redirect to the new student dashboard
      router.replace("/student");
    }
  }, [token, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">{t("syncingProfile")}</p>
    </div>
  );
}
