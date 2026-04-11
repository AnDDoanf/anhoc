"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  BookOpen,
  PencilLine,
  FlaskConical,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import lessonStructure from "@/content/lessonStruture";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Default to collapsed on mobile
      if (mobile) {
        setIsCollapsed(true);
      } else {
        // Load preference on desktop
        const saved = localStorage.getItem("sidebar-collapsed");
        setIsCollapsed(saved === "true");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (!isMobile) {
      localStorage.setItem("sidebar-collapsed", String(newState));
    }
  };

  // Prevent hydration mismatch by showing a skeleton or nothing until mounted
  if (!isMounted) return <aside className="w-64 h-screen border-r border-sol-border/30 bg-sol-surface" />;

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-sol-border/30 bg-sol-surface flex flex-col transition-all duration-500 ease-in-out z-40
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center p-6 pb-2 transition-all duration-500 ${isCollapsed ? "justify-center px-0" : "justify-between"}`}>
        {!isCollapsed && (
          <Link href="/" className="group flex items-center gap-2">
            <GraduationCap className="text-sol-accent" size={24} />
            <span className="text-xl font-bold text-sol-text group-hover:text-sol-accent transition-colors">
              Anhoc
            </span>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/" className="group">
            <GraduationCap className="text-sol-accent" size={28} />
          </Link>
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

      <div className={`flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide`}>

        {/* Main Navigation */}
        <div className="space-y-1">
          <NavItem
            href="/student/learning"
            label={t("learning")}
            icon={<BookOpen size={18} />}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/student/practice"
            label={t("practice")}
            icon={<PencilLine size={18} />}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
          <NavItem
            href="/student/test"
            label={t("test")}
            icon={<FlaskConical size={18} />}
            pathname={pathname}
            isCollapsed={isCollapsed}
          />
        </div>

        {/* Lesson Groups (Hidden when collapsed) */}
        {!isCollapsed && (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-500">
            {lessonStructure.map((group) => (
              <div key={group.grade}>
                <div className="text-[10px] font-bold text-sol-muted mb-2 px-3 uppercase tracking-[0.15em]">
                  {t(group.labelKey)}
                </div>

                <div className="space-y-1">
                  {group.lessons.map((lesson) => {
                    const href = `/student/learning/${group.grade}/${lesson.id}`;
                    const isActive = pathname === href;
                    const displayTitle = locale === "vi" ? lesson.title_vi : lesson.title_en;

                    return (
                      <Link
                        key={`${group.grade}-${lesson.id}`}
                        href={href}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                          ${isActive
                            ? "bg-sol-accent text-sol-bg font-bold shadow-sm"
                            : "text-sol-text hover:bg-sol-bg hover:text-sol-accent"
                          }
                        `}
                      >
                        <span className="truncate">{displayTitle}</span>
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50 group-hover:translate-x-1"}`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
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
  const isActive = pathname === href || (href !== "/student/learning" && pathname.startsWith(href));

  return (
    <Link
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
