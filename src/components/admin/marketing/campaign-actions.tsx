"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCampaignAction } from "@/app/actions/marketing";
import { AdminError, adminDangerClass, adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import { href } from "@/lib/href";

type Action = "continue" | "pause" | "cancel" | "retry" | "delete" | "duplicate";

export function CampaignActions({ locale, id, status, failed, pending: left, canEdit }: { locale: string; id: string; status: string; failed: number; pending: number; canEdit: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  function run(action: Action, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await adminCampaignAction(locale, id, action);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (action === "duplicate" && result.id) {
        router.push(href(`/admin/marketing/campaigns/${result.id}`, locale));
        return;
      }
      if (action === "delete") {
        router.push(href("/admin/marketing/campaigns", locale));
        return;
      }
      const progress = result.progress;
      if (progress) {
        setNotice(
          progress.quiet && progress.sent === 0
            ? "ساعات الهدوء مفعّلة الآن، فالرسائل النصية وواتساب تنتظر."
            : `أُرسل ${progress.sent}. فشل ${progress.failed}. تُرك ${progress.skipped}. تبقّى ${progress.pending}.`,
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(status === "sending" || status === "paused") && left > 0 ? (
          <button type="button" className={adminPrimaryClass} disabled={!canEdit || busy} onClick={() => run("continue")}>
            {status === "paused" ? "استئناف الإرسال" : "أكمل الإرسال"}
          </button>
        ) : null}
        {status === "sending" ? <button type="button" className={adminGhostClass} disabled={!canEdit || busy} onClick={() => run("pause")}>إيقاف مؤقت</button> : null}
        {failed > 0 && status !== "cancelled" ? <button type="button" className={adminGhostClass} disabled={!canEdit || busy} onClick={() => run("retry")}>أعد إرسال ما فشل ({failed})</button> : null}
        <button type="button" className={adminGhostClass} disabled={!canEdit || busy} onClick={() => run("duplicate")}>نسخ كمسودة</button>
        {status === "sending" || status === "paused" || status === "scheduled" ? (
          <button type="button" className={adminDangerClass} disabled={!canEdit || busy} onClick={() => run("cancel", "إلغاء الحملة؟ الرسائل التي لم تُرسل لن تُرسل.")}>إلغاء الحملة</button>
        ) : null}
        {status === "cancelled" || status === "draft" ? (
          <button type="button" className={adminDangerClass} disabled={!canEdit || busy} onClick={() => run("delete", "حذف الحملة وسجلها؟")}>حذف</button>
        ) : null}
      </div>
      {error ? <AdminError>{error}</AdminError> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
    </div>
  );
}
