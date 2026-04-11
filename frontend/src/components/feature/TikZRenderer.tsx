// src/components/feature/TikZRenderer.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface TikZRendererProps {
  children: React.ReactNode;
}

declare global {
  interface Window {
    tikzjax?: {
      process: (element?: HTMLElement) => void;
    };
  }
}

export default function TikZRenderer({ children }: TikZRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const triggerTikZ = () => {
      if (window.tikzjax && containerRef.current) {
        console.log("Targeted TikZJax processing for:", pathname);
        window.tikzjax.process(containerRef.current);
      }
    };

    triggerTikZ();

    const pollInterval = setInterval(() => {
      const scripts = containerRef.current?.querySelectorAll('script[type="text/tikz"]');
      const processed = containerRef.current?.querySelectorAll('svg');

      if (scripts?.length && !processed?.length) {
        triggerTikZ();
      } else if (processed?.length) {
        clearInterval(pollInterval);
      }
    }, 500);

    const safetyTimer = setTimeout(() => clearInterval(pollInterval), 5000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(safetyTimer);
    };
  }, [pathname, children]);

  return <div ref={containerRef} className="tikz-wrapper">{children}</div>;
}
