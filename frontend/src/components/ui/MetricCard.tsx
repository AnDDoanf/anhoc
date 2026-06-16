import React, { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendBg?: string;
  trendColor?: string;
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
}

export default function MetricCard({
  label,
  value,
  icon,
  trend,
  trendBg,
  trendColor,
  iconBg = "bg-sol-accent/10",
  iconColor = "text-sol-accent",
  onClick,
}: MetricCardProps) {
  const CardWrapper = onClick ? "button" : "div";

  return (
    <CardWrapper
      onClick={onClick}
      className={`group w-full flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-sol-surface border border-sol-border/10 hover:border-sol-accent/30 transition-all duration-300 shadow-sm hover:shadow-lg text-left ${
        onClick ? "cursor-pointer active:scale-[0.98]" : ""
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-105`}>
        {React.isValidElement(icon) ? (
          React.cloneElement(icon as React.ReactElement<any>, {
            className: `${(icon as React.ReactElement<any>).props.className || ""} h-5 w-5 sm:h-6 sm:w-6`,
          })
        ) : (
          icon
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-sol-muted sm:text-[10px]">
            {label}
          </span>
          {trend && (
            <span className={`shrink-0 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full sm:text-[9px] ${trendBg || "bg-sol-bg"} ${trendColor || "text-sol-muted"}`}>
              {trend}
            </span>
          )}
        </div>
        <div className="text-lg font-black tracking-tight text-sol-text sm:text-2xl group-hover:text-sol-accent transition-colors truncate">
          {value}
        </div>
      </div>
    </CardWrapper>
  );
}
