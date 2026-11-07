"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ConfirmButton, EditorBar } from "@/components/admin/chrome-client";
import { adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";

export const NEW = "new";

export type Notice = { tone: "success" | "danger"; text: string };
type Result = { ok: true } | { ok: false; error: string } | void | undefined | { ok: boolean; error?: string };

const leaveMessage = "لديك تغييرات غير محفوظة. تجاهلها والانتقال؟";

/** On narrow screens the editor sits under the list; bring it into view after picking a row. */
export function revealEditor() {
  if (!window.matchMedia("(max-width: 1023px)").matches) return;
  requestAnimationFrame(() => document.getElementById("content-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function same<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Selection + draft state for a master–detail editor. Keeps the draft in sync with fresh server props,
 * selects a newly created row once it appears, and falls back to the first row after a delete.
 */
export function useMaster<I, D>({
  items,
  idOf,
  toDraft,
  isCreated,
}: {
  items: I[];
  idOf: (item: I) => string;
  toDraft: (item: I | undefined) => D;
  isCreated: (item: I, draft: D) => boolean;
}) {
  const [selected, setSelected] = useState(() => (items[0] ? idOf(items[0]) : NEW));
  const [baseline, setBaseline] = useState<D>(() => toDraft(items[0]));
  const [values, setValues] = useState<D>(baseline);
  const [seen, setSeen] = useState(items);
  const [created, setCreated] = useState<D | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, start] = useTransition();
  const dirty = !same(values, baseline);

  const load = (id: string, item: I | undefined) => {
    const draft = toDraft(item);
    setSelected(id);
    setBaseline(draft);
    setValues(draft);
  };

  if (items !== seen) {
    setSeen(items);
    const hit = created ? items.find((item) => isCreated(item, created)) : undefined;
    const still = items.find((item) => idOf(item) === selected);
    if (hit) {
      setCreated(null);
      load(idOf(hit), hit);
    } else if (selected !== NEW && !still) {
      load(items[0] ? idOf(items[0]) : NEW, items[0]);
    } else if (still && !dirty) {
      const fresh = toDraft(still);
      if (!same(fresh, baseline)) {
        setBaseline(fresh);
        setValues(fresh);
      }
    }
  }

  const current = selected === NEW ? undefined : items.find((item) => idOf(item) === selected);

  const choose = (id: string) => {
    if (id === selected) return;
    if (dirty && !window.confirm(leaveMessage)) return;
    setNotice(null);
    setCreated(null);
    load(id, id === NEW ? undefined : items.find((item) => idOf(item) === id));
    revealEditor();
  };

  const set =
    <K extends keyof D>(key: K) =>
    (value: D[K]) =>
      setValues((draft) => ({ ...draft, [key]: value }));

  const run = (task: () => Promise<Result>, success: string, after?: (ok: boolean) => void) => {
    start(async () => {
      setNotice(null);
      try {
        const result = await task();
        if (result && "ok" in result && !result.ok) {
          setNotice({ tone: "danger", text: result.error || "تعذر الحفظ." });
          after?.(false);
          return;
        }
        setNotice({ tone: "success", text: success });
        after?.(true);
      } catch {
        setNotice({ tone: "danger", text: "تعذر الاتصال بالخادم. حاول مرة أخرى." });
        after?.(false);
      }
    });
  };

  const save = (task: (draft: D) => Promise<Result>, success: string) => {
    const snapshot = values;
    if (!current) setCreated(snapshot);
    run(() => task(snapshot), success, (ok) => {
      if (ok) setBaseline(snapshot);
      else setCreated(null);
    });
  };

  const discard = () => {
    setValues(baseline);
    setNotice(null);
  };

  return { selected, current, isNew: !current, values, setValues, set, dirty, pending, notice, setNotice, choose, save, run, discard };
}

export function NoticeText({ notice }: { notice: Notice | null }) {
  if (!notice) return null;
  return <span className={notice.tone === "success" ? "text-emerald-300" : "text-rose-300"}>{notice.text}</span>;
}

/** Sticky save bar: unsaved state, discard, optional delete (two-step) and save. */
export function SaveBar({
  dirty,
  pending,
  notice,
  errors = 0,
  canSave,
  saveLabel,
  onDiscard,
  onDelete,
  deleteLabel = "حذف",
  extra,
  isNew,
}: {
  isNew?: boolean;
  dirty: boolean;
  pending: boolean;
  notice: Notice | null;
  errors?: number;
  canSave: boolean;
  saveLabel: string;
  onDiscard: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  extra?: ReactNode;
}) {
  const message =
    notice && (!dirty || notice.tone === "danger") ? (
      <NoticeText notice={notice} />
    ) : dirty && errors ? (
      <span>
        <span className="text-primary">تغييرات غير محفوظة</span>
        <span className="text-rose-300"> · {errors} حقل يحتاج تصحيح</span>
      </span>
    ) : isNew && !dirty ? (
      <span className="text-muted-foreground">عنصر جديد. املأ الحقول المطلوبة ثم احفظ.</span>
    ) : undefined;
  return (
    <EditorBar dirty={dirty} pending={pending} message={message}>
      {extra}
      {onDelete ? (
        <ConfirmButton onConfirm={onDelete} disabled={pending}>
          {deleteLabel}
        </ConfirmButton>
      ) : null}
      <button type="button" disabled={!dirty || pending} onClick={onDiscard} className={adminGhostClass}>
        تجاهل
      </button>
      <button type="submit" disabled={!canSave || pending || errors > 0} className={adminPrimaryClass}>
        {pending ? "جارٍ الحفظ…" : saveLabel}
      </button>
      <span className="hidden font-mono text-[10px] text-muted-foreground xl:inline">Ctrl+S</span>
    </EditorBar>
  );
}
