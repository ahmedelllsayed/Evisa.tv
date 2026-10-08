"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "التشغيل",
    links: [
      { href: "/admin", label: "نظرة عامة" },
      { href: "/admin/queue", label: "الطابور", badge: true },
      { href: "/admin/applications", label: "الطلبات" },
      { href: "/admin/messages", label: "الرسائل" },
    ],
  },
  {
    label: "المحتوى",
    links: [
      { href: "/admin/destinations", label: "الوجهات" },
      { href: "/admin/events", label: "الفعاليات" },
      { href: "/admin/holidays", label: "العطل" },
      { href: "/admin/pages", label: "الصفحات" },
      { href: "/admin/faqs", label: "الأسئلة" },
      { href: "/admin/reviews", label: "التقييمات" },
      { href: "/admin/users", label: "المستخدمون" },
      { href: "/admin/settings", label: "الإعدادات" },
      { href: "/admin/citizenships", label: "الجنسيات" },
      { href: "/admin/fees", label: "سجل الرسوم" },
      { href: "/admin/audit", label: "سجل النشاط" },
    ],
  },
];

export function AdminNav({ locale, attention }: { locale: string; attention: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm lg:hidden"
      >
        <Menu className="size-4" /> القائمة
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100vw,20rem)] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>لوحة التحكم</SheetTitle>
          </SheetHeader>
          <nav className="space-y-5 px-4 pb-8">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-medium text-slate-ink">{group.label}</p>
                <div className="space-y-0.5">
                  {group.links.map((link) => (
                    <NavLink
                      key={link.href}
                      locale={locale}
                      pathname={pathname}
                      href={link.href}
                      label={link.label}
                      count={link.badge ? attention : undefined}
                      onNavigate={() => setOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <aside className="hidden w-56 shrink-0 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
        <p className="mb-4 text-xs font-semibold tracking-wide text-muted-ink uppercase">لوحة التحكم</p>
        <nav className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[11px] font-medium text-slate-ink">{group.label}</p>
              <div className="space-y-0.5">
                {group.links.map((link) => (
                  <NavLink
                    key={link.href}
                    locale={locale}
                    pathname={pathname}
                    href={link.href}
                    label={link.label}
                    count={link.badge ? attention : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({
  locale,
  pathname,
  href: path,
  label,
  count,
  onNavigate,
}: {
  locale: string;
  pathname: string;
  href: string;
  label: string;
  count?: number;
  onNavigate?: () => void;
}) {
  const bare = pathname.replace(/^\/[^/]+/, "") || "/";
  const active = path === "/admin" ? bare === "/admin" : bare === path || bare.startsWith(`${path}/`);
  return (
    <Link
      href={href(path, locale)}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
        active ? "border-brand bg-brand-50 font-medium text-brand" : "border-line text-ink hover:bg-white",
      )}
    >
      <span>{label}</span>
      {count ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-medium text-white">{count}</span> : null}
    </Link>
  );
}
