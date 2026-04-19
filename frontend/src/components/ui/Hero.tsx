import type { ReactNode } from "react";

export interface HeroProps {
  icon?: ReactNode;
  iconPosition?: "top-right" | "bottom-right";
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export default function Hero({
  icon,
  iconPosition = "top-right",
  children,
  className = "",
  containerClassName = "relative z-10 w-full"
}: HeroProps) {
  return (
    <header className={`group relative overflow-hidden rounded-[2rem] border border-sol-border/10 bg-sol-surface/30 p-6 md:p-10 lg:p-12 ${className}`}>
      {icon && (
        <div className={`absolute opacity-10 transition-transform duration-1000 group-hover:scale-110 ${
          iconPosition === "top-right" ? "right-0 top-0 p-4 sm:p-6 md:p-10" : "-bottom-10 -right-8 p-8 rotate-12 group-hover:rotate-0 md:-bottom-20 md:-right-20 md:p-20"
        }`}>
          {icon}
        </div>
      )}
      <div className={containerClassName}>
        {children}
      </div>
    </header>
  );
}
