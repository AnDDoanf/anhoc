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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 text-sol-text/60 mb-8 px-1">
        <List size={20} className="text-sol-accent" />
        <span className="text-sm font-black uppercase tracking-[0.2em]">{t("tableOfContents")}</span>
      </div>

      <nav className="relative flex-1">
        {/* Subtle vertical line for indicators */}
        <div className="absolute left-[3px] top-2 bottom-2 w-[1.5px] bg-sol-border/10" />

        <ul className="space-y-3">
          {toc.map((item) => (
            <li
              key={item.id}
              style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
              className="relative"
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`group flex items-center py-1 text-sm transition-all duration-500 pl-5
                  ${activeId === item.id
                    ? "text-sol-accent font-bold translate-x-1"
                    : "text-sol-muted hover:text-sol-text hover:translate-x-1"}
                `}
              >
                {activeId === item.id && (
                  <div className="absolute left-[1px] w-[3px] h-4 bg-sol-accent rounded-full shadow-[0_0_8px_rgba(38,139,210,0.5)] animate-in fade-in slide-in-from-left-1 duration-500" />
                )}

                <span className="truncate leading-relaxed">{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
