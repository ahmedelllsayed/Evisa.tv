"use client";

import { useState, useTransition } from "react";
import { adminSaveUserNotes } from "@/app/actions/admin";
import { adminGhostClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import { Counter } from "@/components/admin/chrome-client";
import { cn } from "@/lib/utils";

const MAX_NOTES = 2000;

export function UserNotes({ locale, userId, initial, canEdit }: { locale: string; userId: string; initial: string; canEdit: boolean }) {
  const [baseline, setBaseline] = useState(initial);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const dirty = value.trim() !== baseline.trim();

  const save = () => {
    if (!dirty || pending || !canEdit) return;
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("notes", value);
        await adminSaveUserNotes(locale, userId, fd);
        setBaseline(value);
        setState("saved");
      } catch {
        setState("error");
      }
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="user-notes" className="text-xs text-muted-foreground">
          للموظفين فقط، لا تظهر للعميل.
        </label>
        <Counter length={value.length} max={MAX_NOTES} />
      </div>
      <textarea
        id="user-notes"
        value={value}
        dir="auto"
        rows={5}
        disabled={!canEdit || pending}
        onChange={(event) => {
          setValue(event.target.value);
          setState("idle");
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && (event.key === "Enter" || event.key.toLowerCase() === "s")) {
            event.preventDefault();
            save();
          }
        }}
        placeholder={canEdit ? "مثال: يفضّل التواصل عبر واتساب. طلب سابق رُفض بسبب صورة الجواز." : "لا توجد ملاحظات."}
        className={cn(adminTextareaClass, "min-h-28")}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs">
          {pending ? (
            <span className="text-muted-foreground">جارٍ الحفظ…</span>
          ) : state === "error" ? (
            <span className="text-rose-300">تعذر حفظ الملاحظة.</span>
          ) : dirty ? (
            <span className="text-primary">ملاحظة غير محفوظة</span>
          ) : state === "saved" ? (
            <span className="text-emerald-300">حُفظت الملاحظة.</span>
          ) : null}
        </p>
        <div className="flex gap-2">
          {dirty ? (
            <button type="button" onClick={() => setValue(baseline)} disabled={pending} className={cn(adminGhostClass, "h-8 text-xs text-muted-foreground")}>
              تجاهل
            </button>
          ) : null}
          <button disabled={!canEdit || !dirty || pending || value.length > MAX_NOTES} className={cn(adminPrimaryClass, "h-8 text-xs")}>
            حفظ الملاحظة
          </button>
        </div>
      </div>
    </form>
  );
}
