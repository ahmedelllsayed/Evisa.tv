"use client";

import { adminGhostClass } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";

export function PrintButton({ className, children = "طباعة / PDF" }: { className?: string; children?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={cn(adminGhostClass, className)}>
      {children}
    </button>
  );
}
