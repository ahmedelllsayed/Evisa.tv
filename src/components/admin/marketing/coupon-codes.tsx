"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminGenerateCodes } from "@/app/actions/marketing";
import { AdminError, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";

export function CouponCodeBatch({ locale, couponId, canEdit }: { locale: string; couponId: string; canEdit: boolean }) {
  const [count, setCount] = useState(50);
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setNotice(null);
        start(async () => {
          const result = await adminGenerateCodes(locale, couponId, count, prefix);
          if (!result.ok) setError(result.error);
          else {
            setNotice(`وُلّد ${result.count} رمزاً.`);
            router.refresh();
          }
        });
      }}
    >
      <label className="block text-sm">
        العدد
        <input type="number" min={1} max={1000} dir="ltr" value={count} disabled={!canEdit} onChange={(event) => setCount(Number(event.target.value))} className={cn(adminInputClass, "w-28")} />
      </label>
      <label className="block text-sm">
        بادئة اختيارية
        <input dir="ltr" value={prefix} maxLength={10} disabled={!canEdit} onChange={(event) => setPrefix(event.target.value.toUpperCase())} className={cn(adminInputClass, "w-36")} placeholder="VIP" />
      </label>
      <button type="submit" className={adminPrimaryClass} disabled={!canEdit || pending}>{pending ? "جارٍ التوليد…" : "ولّد الرموز"}</button>
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
    </form>
  );
}
