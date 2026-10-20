"use client";

import { useEffect } from "react";

export function StatusRefresh({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => window.location.reload(), 8000);
    return () => clearTimeout(timer);
  }, [active]);
  return null;
}
