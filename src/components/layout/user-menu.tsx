"use client";

import { Bell, LayoutDashboard, LogOut, Plane, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/session";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileGlyph({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden className={className}>
      <path d="M7 7c1.93 0 3.5-1.57 3.5-3.5S8.93 0 7 0 3.5 1.57 3.5 3.5 5.07 7 7 7Zm0 1.75c-2.34 0-7 1.17-7 3.5V14h14v-1.75c0-2.33-4.66-3.5-7-3.5Z" />
    </svg>
  );
}

export function UserMenu({ user, locale, className, unread = 0 }: { user: User | null; locale: string; className?: string; unread?: number }) {
  const trigger = cn(
    "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-black",
    className,
  );
  if (!user) {
    return (
      <Link href={href("/sign-in", locale)} aria-label={t(locale, "menu.signIn")} className={trigger}>
        <ProfileGlyph />
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={t(locale, "menu.account")} className={cn(trigger, "bg-brand-50 text-brand-600")}>
        <span className="text-sm font-semibold">{(user.fullName || user.email || "?").trim().charAt(0).toUpperCase() || "?"}</span>
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
        <DropdownMenuLabel className="truncate text-xs text-muted-ink">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={href("/account?tab=overview", locale)} />}>
          <Bell /> {t(locale, "account.notifications")}{unread > 0 ? ` (${unread})` : ""}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={href("/account", locale)} />}>
          <Plane /> {t(locale, "menu.applications")}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={href("/account/profile", locale)} />}>
          <UserIcon /> {t(locale, "menu.profile")}
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem render={<Link href={href("/admin/queue", locale)} />}>
            <LayoutDashboard /> {t(locale, "menu.admin")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOut /> {t(locale, "menu.signOut")}
        </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
