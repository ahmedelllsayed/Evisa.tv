"use client";

import { usePathname } from "next/navigation";

export function FooterGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.includes("/sign-in")) return null;
  return children;
}
