"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flag,
  PencilLine,
  Database,
  LayoutDashboard,
  Trophy,
  Users,
  Menu,
  X,
  ChartArea,
  Gamepad2,
  CreditCard,
  ShoppingBag,
  Zap
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import Can from "@/components/auth/Can";
import { usePermission } from "@/hooks/usePermission";
import Logo from "@/components/ui/Logo";
import { authService } from "@/services/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const user = useSelector((state: RootState) => state.auth.user);
  const isSupervisorOrAdmin = user?.role === "supervisor" || user?.role === "admin";
  const canManageLesson = usePermission("manage", "lesson");
  const canManageUser = usePermission("manage", "user");
  const hasAdminAccess = isSupervisorOrAdmin || canManageLesson || canManageUser;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userLevel, setUserLevel] = useState<number | null>(null);

  useEffect(() => {
    // Close mobile sidebar on route change
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isMobileOpen]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const profile = await authService.getProfile();
        setUserLevel(profile.student_stats?.level || 1);
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };
    fetchUserData();

    const handleStudentStatsUpdated = () => {
      fetchUserData();
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (mobile) {
        setIsCollapsed(false);
      } else {
        const saved = localStorage.getItem("sidebar-collapsed");
        setIsCollapsed(saved === "true");
        setIsMobileOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("student-stats-updated", handleStudentStatsUpdated);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("student-stats-updated", handleStudentStatsUpdated);
    };
  }, []);

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (!isMobile) {
      localStorage.setItem("sidebar-collapsed", String(newState));
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`fixed top-4 left-4 z-[60] w-10 h-10 bg-sol-surface/80 backdrop-blur-md border border-sol-border/30 rounded-xl flex items-center justify-center text-sol-text shadow-lg active:scale-95 transition-all duration-300
            ${isVisible || isMobileOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}
          `}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}

      {/* Backdrop for Mobile */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-sol-bg/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={`transition-all duration-500 ease-in-out w-0 ${isCollapsed ? "md:w-20" : "md:w-64"}`}>
        <aside
          className={`h-screen border-r border-sol-border/30 bg-sol-surface flex flex-col transition-all duration-500 ease-in-out z-50
          ${isMobile
            ? `fixed inset-y-0 left-0 w-72 shadow-2xl ${isMobileOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`
            : `sticky top-0 w-full`}
        `}
        >
          {/* Sidebar Header */}
          <div className={`flex items-center p-6 pb-2 transition-all duration-500 overflow-hidden ${isMobile ? "pt-16" : ""} ${isCollapsed ? "justify-center px-0" : "justify-between"}`}>
            <Link href="/" className="group flex items-center gap-2 whitespace-nowrap" prefetch={false}>
              <div className="flex-shrink-0">
                <Logo className="w-16 h-8" />
              </div>
              <span className={`text-xl font-bold text-sol-text group-hover:text-sol-accent transition-all duration-500 overflow-hidden
              ${isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100 ml-1"}
            `}>
                Anhoc
              </span>
            </Link>

            {/* Level Badge */}
            {userLevel !== null && (
              <div className={`flex items-center transition-all duration-500
              ${isCollapsed ? "absolute top-[50px] mr-1 opacity-100 scale-75" : "opacity-100 scale-100"}
            `}>
                <div className="flex items-center gap-1 bg-sol-bg/50 border border-sol-accent/30 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="text-[10px] font-black text-sol-muted uppercase tracking-tighter">LV</span>
                  <span className="text-xs font-black text-sol-accent leading-none">{userLevel}</span>
                </div>
              </div>
            )}
          </div>

          {/* Floating Toggle Button (Desktop Only) */}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="absolute top-1/2 right-[-14px] -translate-y-1/2 w-7 h-7 bg-sol-surface border border-sol-border/30 rounded-full flex items-center justify-center text-sol-muted hover:text-sol-accent shadow-md z-50 transition-all hover:scale-110 active:scale-95 group/toggle"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="group-hover/toggle:translate-x-0.5 transition-transform" />
              ) : (
                <ChevronLeft size={14} className="group-hover/toggle:-translate-x-0.5 transition-transform" />
              )}
            </button>
          )}

          <div className={`flex-1 overflow-y-auto p-2 md:p-4 pb-24 md:pb-10 space-y-8 scrollbar-hide`}>
            <div className="space-y-6">
              {hasAdminAccess && (
                <section className="space-y-1">
                  <SidebarSectionHeading label={t("administrator")} isCollapsed={isCollapsed} />
                  <Can I="manage" a="lesson">
                    <NavItem
                      href="/admin/dashboard"
                      label={t("systemDashboard")}
                      icon={<ChartArea size={18} />}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                    />
                  </Can>
                  {user?.role !== "supervisor" && (
                    <Can I="manage" a="user">
                      <NavItem
                        href="/admin/users"
                        label={t("users")}
                        icon={<Users size={18} />}
                        pathname={pathname}
                        isCollapsed={isCollapsed}
                      />
                    </Can>
                  )}
                  {user?.role === "supervisor" && (
                    <NavItem
                      href="/admin/subscription"
                      label={t("pricing")}
                      icon={<CreditCard size={18} />}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                    />
                  )}
                  <Can I="manage" a="lesson">
                    {user?.role !== "supervisor" && (
                      <NavItem
                        href="/admin/reports"
                        label={t("reports")}
                        icon={<Flag size={18} />}
                        pathname={pathname}
                        isCollapsed={isCollapsed}
                      />
                    )}
                    <NavItem
                      href="/admin/questions"
                      label={t("questions")}
                      icon={<Database size={18} />}
                      pathname={pathname}
                      isCollapsed={isCollapsed}
                    />
                  </Can>
                </section>
              )}

              <section className="space-y-1">
                <SidebarSectionHeading label={t("learningMaterial")} isCollapsed={isCollapsed} />
                <NavItem
                  href="/student"
                  label={t("dashboard")}
                  icon={<LayoutDashboard size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/student/learning"
                  label={t("learning")}
                  icon={<BookOpen size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
                {user?.role !== "admin" && !user?.learn_unit_id && (
                  <NavItem
                    href="/subscription"
                    label={t("pricing")}
                    icon={<CreditCard size={18} />}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                  />
                )}

                <NavItem
                  href="/student/games"
                  label={t("games")}
                  icon={<Gamepad2 size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/student/shop"
                  label={t("shop")}
                  icon={<ShoppingBag size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/student/upgrade"
                  label={t("upgrade")}
                  icon={<Zap size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
                <NavItem
                  href="/student/achievements"
                  label={t("achievements")}
                  icon={<Trophy size={18} />}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                />
              </section>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function SidebarSectionHeading({
  label,
  isCollapsed,
}: {
  label: string;
  isCollapsed: boolean;
}) {
  return (
    <div
      className={`px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.2em] text-sol-muted/80 transition-all duration-300 ${
        isCollapsed ? "h-0 overflow-hidden p-0 opacity-0" : "opacity-100"
      }`}
    >
      {label}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  pathname,
  isCollapsed,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
  isCollapsed: boolean;
}) {
  const isActive = pathname === href || (href !== "/" && href !== "/student" && pathname.startsWith(href));

  return (
    <Link
      prefetch={false}
      href={href}
      title={isCollapsed ? label : ""}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative group
        ${isCollapsed ? "justify-center" : ""}
        ${isActive
          ? "bg-sol-bg border border-sol-border/30 text-sol-accent font-semibold"
          : "text-sol-text hover:bg-sol-bg hover:text-sol-accent"
        }
      `}
    >
      <span className={`transition-colors duration-300 ${isActive ? "text-sol-accent" : "text-sol-muted group-hover:text-sol-accent"}`}>
        {icon}
      </span>

      <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap
        ${isCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-auto opacity-100"}
      `}>
        {label}
      </span>

      {/* Active Indicator for collapsed view */}
      {isCollapsed && isActive && (
        <div className="absolute left-0 w-1 h-6 bg-sol-accent rounded-r-full" />
      )}
    </Link>
  );
}
