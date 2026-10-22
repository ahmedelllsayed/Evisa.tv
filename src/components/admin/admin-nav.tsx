"use client";

import {
  BarChart3,
  CalendarDays,
  CalendarOff,
  CircleHelp,
  ClipboardList,
  FileText,
  Globe2,
  LayoutDashboard,
  Mail,
  Map,
  Menu,
  PanelLeft,
  Receipt,
  ScrollText,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

const groups: { label: string; links: { href: string; label: string; icon: LucideIcon; badge?: boolean }[] }[] = [
  {
    label: "التشغيل",
    links: [
      { href: "/admin", label: "نظرة عامة", icon: LayoutDashboard },
      { href: "/admin/queue", label: "الطابور", icon: ClipboardList, badge: true },
      { href: "/admin/growth", label: "القياس", icon: BarChart3 },
      { href: "/admin/applications", label: "الطلبات", icon: FileText },
      { href: "/admin/messages", label: "الرسائل", icon: Mail },
    ],
  },
  {
    label: "المحتوى",
    links: [
      { href: "/admin/destinations", label: "الوجهات", icon: Map },
      { href: "/admin/events", label: "الفعاليات", icon: CalendarDays },
      { href: "/admin/holidays", label: "العطل", icon: CalendarOff },
      { href: "/admin/pages", label: "الصفحات", icon: FileText },
      { href: "/admin/faqs", label: "الأسئلة", icon: CircleHelp },
      { href: "/admin/reviews", label: "التقييمات", icon: Star },
      { href: "/admin/users", label: "المستخدمون", icon: Users },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
      { href: "/admin/citizenships", label: "الجنسيات", icon: Globe2 },
      { href: "/admin/fees", label: "سجل الرسوم", icon: Receipt },
      { href: "/admin/audit", label: "سجل النشاط", icon: ScrollText },
    ],
  },
];

export function AdminShell({
  locale,
  attention,
  email,
  children,
}: {
  locale: string;
  attention: number;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-svh">
      <aside className={cn("sticky top-0 hidden h-svh shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex", collapsed ? "w-12" : "w-64")}>
        <SidebarBody locale={locale} pathname={pathname} attention={attention} collapsed={collapsed} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="sr-only">
            <SheetTitle>لوحة التحكم</SheetTitle>
          </SheetHeader>
          <SidebarBody locale={locale} pathname={pathname} attention={attention} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-sidebar-border bg-background px-4">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent lg:hidden" aria-label="فتح القائمة">
            <Menu className="size-4" />
          </button>
          <button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden size-8 items-center justify-center rounded-md hover:bg-sidebar-accent lg:inline-flex" aria-label="طي الشريط الجانبي">
            <PanelLeft className="size-4" />
          </button>
          <p className="ms-auto truncate text-sm text-muted-foreground">{email}</p>
        </header>
        <main className="min-h-[calc(100svh-3.5rem)] bg-muted/40 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarBody({
  locale,
  pathname,
  attention,
  collapsed,
  onNavigate,
}: {
  locale: string;
  pathname: string;
  attention: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link href={href("/admin", locale)} onClick={onNavigate} className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border px-3 font-black", collapsed && "justify-center px-0")}>
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">E</span>
        {collapsed ? null : <span>Evisa</span>}
      </Link>
      <nav className="flex-1 space-y-2 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label}>
            {collapsed ? null : <p className="flex h-8 items-center px-2 text-sm text-sidebar-foreground/70">{group.label}</p>}
            <div className="space-y-1">
              {group.links.map((link) => (
                <NavLink
                  key={link.href}
                  locale={locale}
                  pathname={pathname}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  count={link.badge ? attention : undefined}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

function NavLink({
  locale,
  pathname,
  href: path,
  label,
  icon: Icon,
  count,
  collapsed,
  onNavigate,
}: {
  locale: string;
  pathname: string;
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const bare = pathname.replace(/^\/[^/]+/, "") || "/";
  const active = path === "/admin" ? bare === "/admin" : bare === path || bare.startsWith(`${path}/`);
  return (
    <Link
      href={href(path, locale)}
      onClick={onNavigate}
      title={label}
      data-active={active}
      className={cn(
        "flex h-8 items-center gap-2 overflow-hidden rounded-md p-2 text-sm outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
        collapsed && "justify-center",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {collapsed ? null : <span className="truncate">{label}</span>}
      {!collapsed && count ? <span className="ms-auto rounded-md bg-secondary px-1.5 text-xs font-medium text-secondary-foreground">{count}</span> : null}
    </Link>
  );
}
