"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { adminGhostClass } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label = "نسخ", className }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={cn(adminGhostClass, "h-8 px-3 text-xs", className)}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "تم النسخ" : label}
    </button>
  );
}
