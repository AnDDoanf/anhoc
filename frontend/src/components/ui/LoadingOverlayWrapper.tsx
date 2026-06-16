"use client";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ReactNode } from "react";

interface LoadingOverlayWrapperProps {
  isLoading: boolean;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
}

export default function LoadingOverlayWrapper({
  isLoading,
  title = "Loading...",
  description,
  children,
  className = "",
  overlayClassName = "",
}: LoadingOverlayWrapperProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-busy={isLoading}
        className={isLoading ? "pointer-events-none select-none blur-[1px]" : ""}
      >
        {children}
      </div>

      {isLoading && (
        <div className={`absolute inset-0 z-30 flex items-center justify-center bg-sol-surface/82 backdrop-blur-md ${overlayClassName}`}>
          <div className="mx-4 flex w-full max-w-xs flex-col items-center rounded-[1.75rem] border border-sol-border/20 bg-sol-bg/85 px-6 py-7 text-center shadow-2xl">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sol-accent/12 text-sol-accent">
              <LoadingSpinner size={28} />
            </div>
            <p className="text-base font-black tracking-tight text-sol-text">{title}</p>
            {description ? (
              <p className="mt-2 text-sm font-medium leading-relaxed text-sol-muted">{description}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
