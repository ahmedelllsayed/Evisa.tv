"use client";

import { usePathname } from "next/navigation";

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.includes("/admin")) return null;
  return children;
}
