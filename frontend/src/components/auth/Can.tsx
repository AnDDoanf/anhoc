"use client";

import React from "react";
import { usePermission } from "@/hooks/usePermission";

interface CanProps {
  I: string;
  a: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Can Component
 * 
 * Declaratively wrap UI elements that require specific permissions.
 * Usage:
 * <Can I="manage" a="lesson">
 *   <button>Edit Lesson</button>
 * </Can>
 */
export default function Can({ I, a, children, fallback = null }: CanProps) {
  const isAllowed = usePermission(I, a);

  if (isAllowed) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
