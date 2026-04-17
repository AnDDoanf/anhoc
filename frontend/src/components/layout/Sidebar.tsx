"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Flag,
  PencilLine,
  Database,
  LayoutDashboard,
  Trophy,
  Users,
  ShieldCheck
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Can from "@/components/auth/Can";
import Image from 'next/image';
import logo from '../../../public/anhoc.svg';
import { Lesson, lessonService } from "@/services/lessonService";
import { authService } from "@/services/auth";

type SidebarLessonGroup = {
  grade: string;
  label: string;
  lessons: Lesson[];
};

type SidebarSubjectGroup = {
  subject: string;
  label: string;
  grades: SidebarLessonGroup[];
};

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lessonGroups, setLessonGroups] = useState<SidebarSubjectGroup[]>([]);
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [userLevel, setUserLevel] = useState<number | null>(null);

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
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem("sidebar-collapsed");
        setIsCollapsed(saved === "true");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("student-stats-updated", handleStudentStatsUpdated);
    const fetchLessons = async () => {
      try {
        const lessons = await lessonService.list();
        const groups = lessons.reduce<Record<string, Omit<SidebarSubjectGroup, "grades"> & { grades: Record<string, SidebarLessonGroup> }>>((acc, lesson) => {
          const subjectKey = String(lesson.subject?.id || "other");
          const subjectLabel = locale === "vi" ? lesson.subject?.title_vi : lesson.subject?.title_en;
          const gradeSlug = lesson.grade?.slug || "other";
          const gradeLabel = locale === "vi" ? lesson.grade?.title_vi : lesson.grade?.title_en;
          if (!acc[subjectKey]) {
            acc[subjectKey] = {
              subject: subjectKey,
              label: subjectLabel || lesson.subject?.slug || "Other",
              grades: {},
            };
          }
          if (!acc[subjectKey].grades[gradeSlug]) {
            acc[subjectKey].grades[gradeSlug] = { grade: gradeSlug, label: gradeLabel || gradeSlug, lessons: [] };
          }
          acc[subjectKey].grades[gradeSlug].lessons.push(lesson);
          return acc;
        }, {});
        const getGradeNumber = (grade: string) => {
          const match = grade.match(/\d+/);
          return match ? parseInt(match[0], 10) : 999;
        };
        const sortedGroups = Object.values(groups).map((subject) => {
          return {
            ...subject,
            grades: Object.values(subject.grades).sort((a, b) => getGradeNumber(a.grade) - getGradeNumber(b.grade)),
          };
        }).sort((a, b) => a.label.localeCompare(b.label));

        setLessonGroups(sortedGroups);
      } catch (err) {
        console.error("Failed to load sidebar lessons:", err);
      }
    };
    fetchLessons();
    const handleLessonMetaUpdated = () => {
      fetchLessons();
    };
    window.addEventListener("lesson-meta-updated", handleLessonMetaUpdated);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("student-stats-updated", handleStudentStatsUpdated);
      window.removeEventListener("lesson-meta-updated", handleLessonMetaUpdated);
    };
  }, [locale]);

  const getGradeKey = (subject: string, grade: string) => `${subject}:${grade}`;

  const toggleGrade = (subject: string, grade: string) => {
    const gradeKey = getGradeKey(subject, grade);
    setExpandedGrades((current) => ({ ...current, [gradeKey]: !current[gradeKey] }));
  };

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (!isMobile) {
      localStorage.setItem("sidebar-collapsed", String(newState));
    }
  };

  return (
    <aside
      className={`h-screen sticky top-0 border-r border-sol-border/30 bg-sol-surface flex flex-col transition-all duration-500 ease-in-out z-40
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center p-6 pb-2 transition-all duration-500 overflow-hidden ${isCollapsed ? "justify-center px-0" : "justify-between"}`}>
        <Link href="/" className="group flex items-center gap-2 whitespace-nowrap" prefetch={false}>
          <div className="flex-shrink-0">
            <Image src={logo} alt="Logo" className="w-16 h-8 object-contain" />
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

      <div className={`flex-1 overflow-y-auto p-2 md:p-4 space-y-8 scrollbar-hide`}>

        {/* Main Navigation */}
        <div className="space-y-1">
          <Can I="manage" a="lesson">
            <NavItem
              href="/admin/dashboard"
              label={t("dashboard")}
              icon={<LayoutDashboard size={18} />}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          </Can>
          <Can I="manage" a="user">
            <NavItem
              href="/admin/users"
              label={t("users")}
              icon={<Users size={18} />}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          </Can>
          <Can I="manage" a="user">
            <NavItem
              href="/admin/roles"
              label={t("roles")}
              icon={<ShieldCheck size={18} />}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          </Can>
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
            href="/student/achievements"
            label={t("achievements")}
            icon={<Trophy size={18} />}
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
          <Can I="manage" a="lesson">
            <NavItem
              href="/student/questions"
              label={t("questions")}
              icon={<Database size={18} />}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          </Can>
          <Can I="manage" a="lesson">
            <NavItem
              href="/admin/reports"
              label={t("reports")}
              icon={<Flag size={18} />}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          </Can>
        </div>

        {/* Lesson Groups (Animate visibility instead of conditional rendering) */}
        <div className={`space-y-6 transition-all duration-500 overflow-hidden ${isCollapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100 w-auto"}`}>
          {lessonGroups.map((subject) => (
            <div key={subject.subject} className="space-y-2">
              <div className="px-3 text-[10px] font-bold text-sol-muted uppercase tracking-[0.15em] whitespace-nowrap">
                <span className="truncate">{subject.label}</span>
              </div>

              <div className="space-y-4">
                {subject.grades.map((group) => (
                  <div key={`${subject.subject}-${group.grade}`} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGrade(subject.subject, group.grade)}
                      aria-expanded={Boolean(expandedGrades[getGradeKey(subject.subject, group.grade)])}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-black text-sol-text hover:bg-sol-bg hover:text-sol-accent transition-colors"
                    >
                      <span className="truncate">{group.label}</span>
                      <ChevronRight
                        size={13}
                        className={`shrink-0 transition-transform ${expandedGrades[getGradeKey(subject.subject, group.grade)] ? "rotate-90" : ""}`}
                      />
                    </button>

                    {expandedGrades[getGradeKey(subject.subject, group.grade)] && (
                      <div className="space-y-1 pl-2">
                        <Link
                          prefetch={false}
                          href={`/student/learning/${group.grade}`}
                          className="block truncate px-3 py-1 text-[11px] font-bold text-sol-muted hover:text-sol-accent"
                        >
                          {t("learning")}
                        </Link>

                        {group.lessons.map((lesson) => {
                          const href = `/student/learning/${group.grade}/${lesson.id}`;
                          const isActive = pathname === href;
                          const displayTitle = locale === "vi" ? lesson.title_vi : lesson.title_en;

                          return (
                            <Link
                              prefetch={false}
                              key={`${group.grade}-${lesson.id}`}
                              href={href}
                              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap
                                ${isActive
                                  ? "bg-sol-accent text-sol-bg font-bold shadow-sm"
                                  : "text-sol-text hover:bg-sol-bg hover:text-sol-accent"
                                }
                              `}
                            >
                              <span className="truncate">{displayTitle}</span>
                              <ChevronRight
                                size={14}
                                className={`transition-transform flex-shrink-0 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50 group-hover:translate-x-1"}`}
                              />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
