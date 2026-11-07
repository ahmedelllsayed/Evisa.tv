"use client";

import { useState } from "react";
import { adminSetAssignee, adminSetStatus } from "@/app/actions/admin";
import { AdminPanel, adminGhostClass, adminInputClass, adminPrimaryClass, adminTextareaClass, type Tone } from "@/components/admin/chrome";
import { ConfirmButton } from "@/components/admin/chrome-client";
import { statusTone } from "@/components/admin/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { statusLabels } from "@/components/admin/status";
import type { Application, ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { manualTargets } from "./model";
import { FeedbackLine, useRun } from "./use-run";

const suggestedTitle: Partial<Record<ApplicationStatus, string>> = {
  draft: "أُعيد طلبك إلى المسودة",
  payment_pending: "طلبك بانتظار الدفع",
  submitted: "طلبك مقدّم",
  in_review: "طلبك قيد المراجعة",
  filed: "قُدّم طلبك للجهة المختصة",
  approved: "تمت الموافقة على تأشيرتك",
  rejected: "تعذّرت الموافقة على طلبك",
  cancelled: "أُلغي طلبك",
};

const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export function StatusChanger({
  locale,
  application,
  readyToFile,
  target,
  onTarget,
}: {
  locale: string;
  application: Application;
  readyToFile: boolean;
  target: ApplicationStatus | null;
  onTarget: (status: ApplicationStatus | null) => void;
}) {
  const targets = manualTargets(application.status, Boolean(application.paidAt));
  const { pending, run, feedback } = useRun();

  return (
    <AdminPanel
      id="status-panel"
      title="تغيير الحالة"
      hint={targets.length ? `الانتقالات المسموحة من «${statusLabels[application.status]}». يصل العميل إشعار وبريد بالحالة الجديدة.` : undefined}
      action={<StatusBadge status={application.status} />}
    >
      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          حالة نهائية، لا يمكن نقل الطلب منها.
          {application.status === "approved" ? " لإرسال التأشيرة استخدم تبويب «التأشيرة الصادرة»." : ""}
          {application.status === "refunded" ? " الاسترداد تم من تبويب الدفع." : ""}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1.5">
            {targets.map((status) => {
              const blocked = status === "filed" && !readyToFile;
              const active = target === status;
              return (
                <button
                  key={status}
                  type="button"
                  disabled={blocked || pending}
                  title={blocked ? "يتطلب اعتماد كل المستندات المطلوبة" : undefined}
                  onClick={() => onTarget(active ? null : status)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    active ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", dotClass[statusTone[status] ?? "neutral"])} />
                  <span className="truncate">{statusLabels[status]}</span>
                </button>
              );
            })}
          </div>
          {targets.includes("filed") && !readyToFile ? (
            <p className="text-xs text-muted-foreground">«مُرسل للجهة» يُفتح بعد اعتماد كل المستندات المطلوبة.</p>
          ) : null}
          {target ? (
            <StatusForm
              key={target}
              target={target}
              pending={pending}
              onCancel={() => onTarget(null)}
              onSubmit={(title, description) =>
                run(
                  () => adminSetStatus(locale, application.id, target, title.trim() || `تحديث الحالة: ${statusLabels[target]}`, description.trim()),
                  `نُقل الطلب إلى «${statusLabels[target]}» وأُبلغ العميل.`,
                  () => onTarget(null),
                )
              }
            />
          ) : null}
        </div>
      )}
      <FeedbackLine feedback={feedback} className="mt-3" />
    </AdminPanel>
  );
}

function StatusForm({
  target,
  pending,
  onCancel,
  onSubmit,
}: {
  target: ApplicationStatus;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (title: string, description: string) => void;
}) {
  const [title, setTitle] = useState(suggestedTitle[target] ?? "");
  const [description, setDescription] = useState("");
  const destructive = target === "rejected" || target === "cancelled";
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-background/40 p-3">
      <label className="block text-xs text-muted-foreground">
        عنوان التحديث للعميل
        <input value={title} onChange={(event) => setTitle(event.target.value)} className={cn(adminInputClass, "h-9")} />
      </label>
      <label className="block text-xs text-muted-foreground">
        رسالة للعميل
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder={destructive ? "اشرح السبب وما يمكن للعميل فعله الآن." : "اختياري. تصل في البريد مع الحالة."}
          className={adminTextareaClass}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {destructive ? (
          <ConfirmButton disabled={pending} onConfirm={() => onSubmit(title, description)} confirmLabel={`تأكيد «${statusLabels[target]}»`}>
            نقل إلى «{statusLabels[target]}»
          </ConfirmButton>
        ) : (
          <button type="button" disabled={pending} onClick={() => onSubmit(title, description)} className={adminPrimaryClass}>
            {pending ? "جارٍ الحفظ…" : `نقل إلى «${statusLabels[target]}»`}
          </button>
        )}
        <button type="button" onClick={onCancel} className="h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
          إلغاء
        </button>
      </div>
    </div>
  );
}

export function AssignPanel({
  locale,
  application,
  assignees,
  currentUserId,
}: {
  locale: string;
  application: Application;
  assignees: { id: string; label: string }[];
  currentUserId: string;
}) {
  const [value, setValue] = useState(application.assigneeId ?? "");
  const { pending, run, feedback } = useRun();
  const current = application.assigneeId ?? "";
  const canTakeIt = assignees.some((person) => person.id === currentUserId) && current !== currentUserId;
  const save = (next: string) =>
    run(() => adminSetAssignee(locale, application.id, next || null), next ? "حُفظ التعيين." : "أُزيل التعيين.");
  return (
    <AdminPanel id="assign-panel" title="المسؤول" hint={current ? undefined : "لا أحد يتابع هذا الطلب بعد."}>
      <div className="flex gap-2">
        <select value={value} onChange={(event) => setValue(event.target.value)} className={cn(adminInputClass, "mt-0 h-9 min-w-0 flex-1")} aria-label="المسؤول">
          <option value="">بدون تعيين</option>
          {assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
              {person.id === currentUserId ? " (أنت)" : ""}
            </option>
          ))}
        </select>
        <button type="button" disabled={pending || value === current} onClick={() => save(value)} className={adminGhostClass}>
          حفظ
        </button>
      </div>
      {canTakeIt ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue(currentUserId);
            save(currentUserId);
          }}
          className="mt-2 text-xs text-primary hover:underline disabled:opacity-50"
        >
          عيّنه لي
        </button>
      ) : null}
      <FeedbackLine feedback={feedback} className="mt-2" />
    </AdminPanel>
  );
}
