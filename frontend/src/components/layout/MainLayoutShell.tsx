"use client";

import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Settingbar from "@/components/layout/Settingbar";
import ScrollToTop from "@/components/ui/ScrollToTop";
import BottomNav from "@/components/layout/BottomNav";
import ChatbotWidget from "@/components/feature/ChatbotWidget";
import DailyLoginCalendarModal from "@/components/feature/DailyLoginCalendarModal";
import { economyService } from "@/services/economyService";
import { RootState } from "@/redux/store";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized);

  const [isMounted, setIsMounted] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isStreakOpen, setIsStreakOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setHasToken(!!localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    const handleOpenStreak = () => setIsStreakOpen(true);
    window.addEventListener("open-streak-modal", handleOpenStreak);
    return () => window.removeEventListener("open-streak-modal", handleOpenStreak);
  }, []);

  useEffect(() => {
    if (!isMounted || !authUser) return;

    const sessionChecked = sessionStorage.getItem("streak_checked");
    if (sessionChecked) return;

    const checkStreak = async () => {
      try {
        const status = await economyService.getStreakStatus();
        if (status.canClaimToday || status.needsRecovery) {
          setIsStreakOpen(true);
        }
        sessionStorage.setItem("streak_checked", "true");
      } catch (err) {
        console.error("Error checking streak status:", err);
      }
    };

    // Delay checking slightly to let main layout settle
    const timer = setTimeout(checkStreak, 1000);
    return () => clearTimeout(timer);
  }, [isMounted, authUser]);

  const isSharedChallengeRoute = pathname.startsWith("/student/games/challenge/");
  const isSharedPlayRoute = pathname === "/student/games/play";
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isGuestPlay = isSharedPlayRoute && (searchParams.get("guest") === "1" || (isMounted ? !hasToken : true));
  
  // During SSR/initial mount, use minimal layout for shared routes to match server rendering.
  // After mount, use minimal layout only if user is NOT logged in.
  const useMinimalGameLayout = isMounted 
    ? (!hasToken && (isSharedChallengeRoute || isGuestPlay))
    : (isSharedChallengeRoute || isSharedPlayRoute);

  useEffect(() => {
    if (!isInitialized || !authUser) return;
    if (authUser.requires_subject_selection && !isOnboardingRoute) {
      router.replace("/onboarding/subject");
      return;
    }
    if (!authUser.requires_subject_selection && isOnboardingRoute) {
      router.replace("/student");
    }
  }, [authUser, isInitialized, isOnboardingRoute, router]);

  if (useMinimalGameLayout || isOnboardingRoute) {
    return (
      <div className="min-h-screen bg-sol-bg">
        <main className="min-w-0 px-3 py-4 sm:px-4 md:px-8 md:py-8">
          {children}
        </main>
        <ScrollToTop className="bottom-24 right-6" />
        <ChatbotWidget />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden md:overflow-x-visible bg-sol-bg">
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-x-visible">
        <Settingbar />

        <main className="min-w-0 flex-grow p-3 pt-20 pb-32 sm:p-4 sm:pt-4 sm:pb-36 md:p-8 md:pt-8 md:pb-8">
          {children}
        </main>

        <Footer />
        <ScrollToTop className="bottom-24 right-6" />
        <ChatbotWidget />
        <BottomNav />
        <DailyLoginCalendarModal isOpen={isStreakOpen} onClose={() => setIsStreakOpen(false)} />
      </div>
    </div>
  );
}
