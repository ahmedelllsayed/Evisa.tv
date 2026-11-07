"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useOverlay(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="إغلاق"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-input text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Side drawer anchored to the right edge. Renders nothing while closed. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="إغلاق" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l bg-card text-card-foreground shadow-2xl shadow-black/60 [color-scheme:dark]"
      >
        <header className="flex items-start justify-between gap-4 border-b bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-4">
          <div className="min-w-0">
            {eyebrow ? <p className="text-xs font-medium text-primary/80">{eyebrow}</p> : null}
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{title}</h2>
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
          <CloseButton onClose={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="border-t bg-background/40 px-5 py-3">{footer}</footer> : null}
      </aside>
    </div>
  );
}

/** Centered dialog. Renders nothing while closed. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="إغلاق" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[calc(100svh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-black/60 [color-scheme:dark]",
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
          <CloseButton onClose={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-background/40 px-5 py-3">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** Compact on/off switch button. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-muted")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-[#ffffff] shadow transition-[left]", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className={checked ? "text-emerald-300" : ""}>{label}</span>
    </button>
  );
}
