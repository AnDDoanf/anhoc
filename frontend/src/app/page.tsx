"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export default function RootPage() {
  const router = useRouter();
  // Add 'isLoading' if your auth slice has it
  const { user, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // 1. Wait for the token to exist. If no token, go to login.
    if (!token) {
      router.push("/login");
      return;
    }

    /**
     * 2. CRITICAL FIX: 
     * If we have a token but 'user' is still null, STOP.
     * Redux is still loading the user object from localStorage/API.
     * If we don't return here, it will default to the student redirect.
     */
    if (!user) return; 

    // 3. Now that we DEFINITELY have the user object, check the role
    console.log("Redirecting based on role:", user.role);

    if (user.role === "admin") {
      router.push("/admin");
    } else {
      router.push("/student");
    }
  }, [token, user, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">Syncing your profile...</p>
    </div>
  );
}