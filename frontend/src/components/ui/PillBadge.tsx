import type { ReactNode } from "react";

export interface PillBadgeProps {
  label: string;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

export default function PillBadge({
  label,
  icon,
  compact = false,
  className = "",
}: PillBadgeProps) {
  return (
    <span
      className={`pill-badge inline-flex max-w-full items-center justify-center gap-2 rounded-full border font-black uppercase tracking-[0.28em] transition-colors duration-300 ${
        compact ? "px-3 py-1 text-[10px]" : "px-5 py-2 text-xs"
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
}
