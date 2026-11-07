"use client";

import { useState, useTransition } from "react";
import { adminAutoAssign } from "@/app/actions/admin";
import { adminGhostClass } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";

export function AutoAssignButton({ locale, className }: { locale: string; className?: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
      <button
        type="button"
        disabled={pending}
        title="يوزّع الطلبات المقدّمة وقيد المراجعة غير المعيّنة على الموظف الأقل انشغالاً"
        className={cn(adminGhostClass, className)}
        onClick={() =>
          start(async () => {
            const result = await adminAutoAssign(locale);
            setMessage(result.ok ? (result.count ? `وُزّع ${result.count} طلب` : "لا توجد طلبات للتوزيع") : "تعذر التوزيع");
          })
        }
      >
        {pending ? "جارٍ التوزيع…" : "توزيع تلقائي"}
      </button>
    </span>
  );
}
