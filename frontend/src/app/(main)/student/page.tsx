// src/app/(user)/page.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/guard/ProtectedRoute";
import { useTranslations } from "next-intl";

export default function UserHomePage() {
  const { user, logout } = useAuth();
  const sidebarT = useTranslations("Sidebar");
  const commonT = useTranslations("Common");

  return (
    <ProtectedRoute requiredRole="student">
      <div className="w-full bg-white">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">{sidebarT("dashboard")}</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">{user?.email}</span>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {commonT("welcomeBack", { email: user?.email || "" })}
              </h2>
              <p className="text-gray-600">{commonT("dashboardPlaceholder")}</p>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
