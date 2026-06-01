"use client";

import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Settingbar from "@/components/layout/Settingbar";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { usePathname, useSearchParams } from "next/navigation";

export default function MainLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isSharedChallengeRoute = pathname.startsWith("/student/games/challenge/");
  const isSharedPlayRoute = pathname === "/student/games/play";
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token");
  const isGuestPlay = isSharedPlayRoute && (searchParams.get("guest") === "1" || !hasToken);
  const useMinimalGameLayout = isSharedChallengeRoute || isGuestPlay;

  if (useMinimalGameLayout) {
    return (
      <div className="min-h-screen bg-sol-bg">
        <main className="min-w-0 px-3 py-4 sm:px-4 md:px-8 md:py-8">
          {children}
        </main>
        <ScrollToTop />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-sol-bg">
      <Sidebar />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Settingbar />

        <main className="min-w-0 flex-grow p-3 pt-15 pb-20 sm:p-4 sm:pt-4 md:p-8 md:pt-8">
          {children}
        </main>

        <Footer />
        <ScrollToTop />
      </div>
    </div>
  );
}
