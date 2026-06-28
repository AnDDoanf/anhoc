// src/app/(main)/admin/page.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminHomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to the admin dashboard page directly
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-sol-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </ProtectedRoute>
  );
}
