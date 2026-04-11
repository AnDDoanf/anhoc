// src/components/feature/TableOfContents.tsx
"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";
import { useTranslations } from "next-intl";

type TOCItem = {
  id: string;
  text: string;
  level: number;
};

interface TableOfContentsProps {
  toc: TOCItem[];
}

export default function TableOfContents({ toc }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px" }
    );

    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for fixed header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      history.pushState(null, "", `#${id}`);
    }
  };

  if (toc.length === 0) return null;

  const t = useTranslations("Common");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sol-muted mb-6">
        <List size={18} className="text-sol-accent" />
        <span className="text-xs font-bold uppercase tracking-widest">{t("tableOfContents")}</span>
      </div>

      <nav className="relative">
        <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-sol-border/20" />

        <ul className="space-y-1">
          {toc.map((item) => (
            <li
              key={item.id}
              style={{ paddingLeft: `${(item.level - 2) * 16}px` }}
              className="relative"
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`group flex items-center py-1.5 text-sm transition-all duration-300 pl-4
                  ${activeId === item.id
                    ? "text-sol-accent font-medium translate-x-1"
                    : "text-sol-muted hover:text-sol-text hover:translate-x-1"}
                `}
              >
                {activeId === item.id && (
                  <div className="absolute left-[1px] w-1 h-4 bg-sol-accent rounded-full animate-in fade-in slide-in-from-left-1 duration-300" />
                )}

                <span className="truncate">{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
