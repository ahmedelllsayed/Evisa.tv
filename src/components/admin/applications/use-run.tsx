"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export type Feedback = { tone: "ok" | "error"; text: string } | null;

function failure(result: unknown) {
  if (result && typeof result === "object" && "ok" in result && (result as { ok: unknown }).ok === false) {
    const error = (result as { error?: unknown }).error;
    return typeof error === "string" && error ? error : "تعذر تنفيذ الإجراء.";
  }
  return null;
}

/** Runs a server action in a transition and keeps its outcome as a short message. */
export function useRun() {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = <T,>(task: () => Promise<T>, success?: string | ((result: T) => string), onDone?: () => void) =>
    start(async () => {
      setFeedback(null);
      try {
        const result = await task();
        const error = failure(result);
        if (error) setFeedback({ tone: "error", text: error });
        else {
          const text = typeof success === "function" ? success(result) : success;
          if (text) setFeedback({ tone: "ok", text });
          onDone?.();
        }
      } catch {
        setFeedback({ tone: "error", text: "تعذر الاتصال بالخادم. أعد المحاولة." });
      }
    });
  return { pending, run, feedback, setFeedback };
}

export function FeedbackLine({ feedback, className }: { feedback: Feedback; className?: string }) {
  if (!feedback) return null;
  return (
    <p role="status" className={cn("text-xs", feedback.tone === "error" ? "text-rose-300" : "text-emerald-300", className)}>
      {feedback.text}
    </p>
  );
}
