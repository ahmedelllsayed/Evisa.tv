"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { isArabicLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const easeOut = [0.22, 1, 0.36, 1] as const;

export function surfaceClass(locale: string) {
  return isArabicLocale(locale) ? "surface-ar" : "";
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Swap({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: easeOut }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function Heading({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div>
      {eyebrow ? <p className="text-sm text-muted-ink">{eyebrow}</p> : null}
      <h1 className="text-3xl font-semibold tracking-tight text-[#16182b]">{title}</h1>
      <span className="mt-3 block h-[3px] w-10 rounded-full bg-brand" />
      {children}
    </div>
  );
}

export function ResultPane({ title, body, action, tone = "plain" }: { title: string; body: string; action?: ReactNode; tone?: "plain" | "paid" | "failed" }) {
  return (
    <Reveal className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-[26px] border border-[#e3e5f2] bg-white px-6 py-8 text-center">
        <span
          className={cn(
            "mx-auto flex size-12 items-center justify-center rounded-full text-lg font-semibold",
            tone === "paid" && "bg-[#e9f9ef] text-[#14713a]",
            tone === "failed" && "bg-[#fdecee] text-[#d4475a]",
            tone === "plain" && "bg-brand-50 text-brand-700",
          )}
        >
          {tone === "failed" ? "!" : tone === "paid" ? "✓" : "·"}
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#16182b]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-body">{body}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </Reveal>
  );
}
