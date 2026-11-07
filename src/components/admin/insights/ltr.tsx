import type { ReactNode } from "react";

/** Keeps an amount or date in reading order when it sits inside an Arabic sentence. */
export function Ltr({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="inline-block whitespace-nowrap">
      {children}
    </span>
  );
}
