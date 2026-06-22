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
    <header className={`group relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border border-sol-border/30 bg-sol-surface p-5 sm:p-8 md:p-12 shadow-xl sm:shadow-2xl ${className}`}>
      {/* Premium Pulsing Gradient Glows aligned with student/games */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sol-accent/15 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sol-orange/5 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />

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
