"use client";

import { Home, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ locale }: { locale: string }) {
  const path = usePathname();
  const home = path === href("/", locale);
  const profile = path.includes("/account") || path.includes("/sign-in");
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 flex w-[min(92vw,380px)] -translate-x-1/2 items-center rounded-full bg-white p-1.5 shadow-[0_12px_40px_rgba(17,24,39,0.16)] lg:hidden">
      <Link
        href={href("/", locale)}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium",
          home ? "bg-black text-white" : "text-muted-ink",
        )}
      >
        <Home className="size-4" /> Home
      </Link>
      <Link
        href={href("/account", locale)}
        className={cn(
          "flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium",
          profile ? "bg-black text-white" : "text-muted-ink",
        )}
      >
        <User className="size-4" /> My Profile
      </Link>
    </nav>
  );
}
