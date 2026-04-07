"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  // 1. Standard hydration fix
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Separate logic for Redirection & BFCache
  useEffect(() => {
    if (!mounted) return;

    const storedToken = localStorage.getItem("token");
    if (!token && !storedToken) {
      router.replace("/login");
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [mounted, token, router]);

  // 3. Prevent SSR mismatch
  if (!mounted) return null;

  // 4. Check for token existence (Client-side)
  const hasToken = token || (typeof window !== "undefined" && !!localStorage.getItem("token"));

  if (!hasToken) {
    return null; 
  }

  // 5. Wait for User object to be populated in Redux
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // 6. Role Validation
  const userRole = user?.role?.toLowerCase();
  const targetRole = requiredRole?.toLowerCase();

  if (targetRole && userRole !== targetRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-gray-900">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-2 text-gray-600">Required: {requiredRole} | Found: {user.role}</p>
        <button 
          onClick={() => router.push("/")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return <>{children}</>;
}