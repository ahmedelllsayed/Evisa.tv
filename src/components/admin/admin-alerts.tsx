"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { href } from "@/lib/href";

type Alert = { id: string; title: string; body: string; href: string; at: string };

export function AdminAlerts({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Alert[]>([]);

  useEffect(() => {
    let stop = false;
    async function load() {
      const response = await fetch("/api/admin/alerts");
      if (!response.ok) return;
      const data = (await response.json()) as { items?: Alert[] };
      if (!stop) setItems(data.items ?? []);
    }
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative inline-flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent" aria-label="التنبيهات">
        <Bell className="size-4" />
        {items.length > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-sky-400" />}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          {items.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">لا توجد تنبيهات جديدة.</p>}
          <ul className="max-h-96 overflow-auto">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={href(item.href, locale)} onClick={() => setOpen(false)} className="block rounded-md px-2 py-2 hover:bg-accent">
                  <span className="block text-sm">{item.title}</span>
                  <span className="block text-xs text-muted-foreground">{item.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
