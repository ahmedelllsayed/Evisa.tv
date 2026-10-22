"use client";

import { motion } from "framer-motion";
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
      { href: "/admin/growth", label: "القياس" },
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
        className="mb-4 flex h-10 items-center gap-2 rounded-full bg-[#16182b] px-4 text-sm font-medium text-white lg:hidden"
      >
        <Menu className="size-4" /> القائمة
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100vw,20rem)] overflow-y-auto bg-[#16182b] text-white">
          <SheetHeader>
            <SheetTitle className="text-white">لوحة التحكم</SheetTitle>
          </SheetHeader>
          <nav className="space-y-5 px-4 pb-8">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-medium text-white/45">{group.label}</p>
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
      <aside className="hidden w-60 shrink-0 rounded-[26px] bg-[#16182b] p-4 text-white lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
        <p className="mb-4 px-3 text-sm font-semibold">لوحة التحكم</p>
        <nav className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[11px] font-medium text-white/45">{group.label}</p>
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
        "relative flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm",
        active ? "font-semibold text-[#16182b]" : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      {active && !onNavigate ? <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", stiffness: 420, damping: 36 }} /> : null}
      {active && onNavigate ? <span className="absolute inset-0 rounded-xl bg-white" /> : null}
      <span className="relative">{label}</span>
      {count ? <span className={cn("relative rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-brand text-white" : "bg-[#ffd873] text-black")}>{count}</span> : null}
    </Link>
  );
}
