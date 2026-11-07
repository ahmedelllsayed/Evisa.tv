"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const RINGS = [
  { color: "bg-white/95", scale: 1 },
  { color: "bg-[#9eecfa]", scale: 0.78 },
  { color: "bg-[#ffadad]", scale: 0.56 },
  { color: "bg-[#ffe375]", scale: 0.34 },
];

/** Decorative rings behind the hero card. They start collapsed so the server and first client render match. */
export function OnTimeCircles({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div aria-hidden className={cn("pointer-events-none relative aspect-square", className)}>
      {RINGS.map((ring, index) => (
        <div
          key={ring.color}
          className={cn("absolute inset-0 rounded-full transition-transform duration-1000 ease-out motion-reduce:transition-none", ring.color)}
          style={{ transform: `scale(${open ? ring.scale : 0})`, transitionDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}
