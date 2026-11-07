"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Two-step destructive button: the first click arms it, the second runs `onConfirm`. Disarms after 4 seconds. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "اضغط مرة أخرى للتأكيد",
  disabled,
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 4000);
      }}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors disabled:opacity-40",
        armed ? "border-rose-500 bg-rose-500 text-white" : "border-rose-500/40 bg-background text-rose-300 hover:bg-rose-500/10",
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

/** Sticky bottom bar for editors: shows the unsaved state and holds the actions. */
export function EditorBar({
  dirty,
  pending,
  message,
  children,
}: {
  dirty: boolean;
  pending: boolean;
  message?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur transition-colors",
        dirty ? "border-primary/40 bg-card/95" : "bg-card/80",
      )}
    >
      <p className="text-sm">
        {pending ? (
          <span className="text-muted-foreground">جارٍ الحفظ…</span>
        ) : message ? (
          message
        ) : dirty ? (
          <span className="text-primary">تغييرات غير محفوظة</span>
        ) : (
          <span className="text-muted-foreground">لا توجد تغييرات.</span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Ctrl/Cmd+S runs `onSave`, and the tab warns before closing while `dirty` is true. */
export function useEditorKeys(onSave: () => void, dirty: boolean) {
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

export function Counter({ length, max, min }: { length: number; max: number; min?: number }) {
  const over = length > max;
  const under = min != null && length > 0 && length < min;
  return (
    <span className={cn("font-mono text-[11px] tabular-nums", over ? "text-rose-400" : under ? "text-amber-300" : length ? "text-emerald-400" : "text-muted-foreground")}>
      {length}/{max}
    </span>
  );
}
