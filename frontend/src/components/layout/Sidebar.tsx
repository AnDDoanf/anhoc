"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { 
  BookOpen, 
  PencilLine, 
  FlaskConical, 
  GraduationCap, 
  ChevronRight,
} from "lucide-react";

import lessonStructure from "@/content/lessonStruture";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const locale = useLocale();

  return (
    <aside className="w-64 h-screen sticky top-0 border-r border-sol-border/30 bg-sol-surface flex flex-col">
      
      <Link href="/" className="block p-6 pb-2 group">
        <h1 className="text-xl font-bold text-sol-text flex items-center gap-2 transition-colors group-hover:text-sol-accent">
          <GraduationCap className="text-sol-accent" size={24} />
          <span>Anhoc</span>
        </h1>
      </Link>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        
        <div className="space-y-1">
          <NavItem 
            href="/student/learning" 
            label={t("learning")} 
            icon={<BookOpen size={18} />} 
            pathname={pathname} 
          />
          <NavItem 
            href="/student/practice" 
            label={t("practice")} 
            icon={<PencilLine size={18} />} 
            pathname={pathname} 
          />
          <NavItem 
            href="/student/test" 
            label={t("test")} 
            icon={<FlaskConical size={18} />} 
            pathname={pathname} 
          />
        </div>

        <div className="space-y-6">
          {lessonStructure.map((group) => (
            <div key={group.grade}>
              <div className="text-[10px] font-bold text-sol-muted mb-2 px-3 uppercase tracking-[0.15em]">
                {t(group.labelKey)}
              </div>

              <div className="space-y-1">
                {group.lessons.map((lesson) => {
                  const href = `/student/learning/${group.grade}/${lesson.id}`;
                  const isActive = pathname === href;
                  
                  // Dynamically select title based on current locale
                  const displayTitle = locale === "vi" ? lesson.title_vi : lesson.title_en;

                  return (
                    <Link
                      key={`${group.grade}-${lesson.id}`}
                      href={href}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all
                        ${
                          isActive
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
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  pathname: string;
}) {
  const isActive = pathname === href || (href !== "/student/learning" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
        ${
          isActive
            ? "bg-sol-bg border border-sol-border/30 text-sol-accent font-semibold"
            : "text-sol-text hover:bg-sol-bg hover:text-sol-accent"
        }
      `}
    >
      <span className={isActive ? "text-sol-accent" : "text-sol-muted"}>
        {icon}
      </span>
      {label}
    </Link>
  );
}