"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useId } from "react";
import { formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

export const easeOut = [0.22, 1, 0.36, 1] as const;

export function AnimatedMoney({ value, currency, locale, className }: { value: number; currency: string; locale: string; className?: string }) {
  const reduce = useReducedMotion();
  const amount = useMotionValue(value);
  const text = useTransform(amount, (current) => formatMoney(current, currency, locale));
  useEffect(() => {
    const controls = animate(amount, value, reduce ? { duration: 0 } : { duration: 0.7, ease: easeOut });
    return () => controls.stop();
  }, [amount, value, reduce]);
  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}

export function FlipText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("relative inline-grid overflow-hidden [perspective:400px]", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="col-start-1 row-start-1 inline-block [backface-visibility:hidden]"
          initial={{ rotateX: -80, opacity: 0, y: "-35%" }}
          animate={{ rotateX: 0, opacity: 1, y: "0%" }}
          exit={{ rotateX: 80, opacity: 0, y: "35%" }}
          transition={{ duration: 0.38, ease: easeOut }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function FlapTiles({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("inline-flex gap-1", className)} dir="ltr">
      {[...text].map((char, index) => (
        <span
          key={index}
          className="relative inline-flex h-12 w-9 items-center justify-center overflow-hidden rounded-lg bg-[#16182b] text-[26px] font-semibold text-white [perspective:300px]"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={char}
              className="inline-block tabular-nums [backface-visibility:hidden]"
              initial={{ rotateX: -90, y: "-30%" }}
              animate={{ rotateX: 0, y: "0%" }}
              exit={{ rotateX: 90, y: "30%" }}
              transition={{ duration: 0.32, delay: index * 0.06, ease: easeOut }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
          <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/50" />
        </span>
      ))}
    </span>
  );
}

export function InkStamp({ ring, center, stampKey, className }: { ring: string; center: string; stampKey: string; className?: string }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const text = `${ring} • ${ring} • `;
  return (
    <motion.div
      key={stampKey}
      aria-hidden
      className={cn("pointer-events-none select-none text-brand-600", className)}
      initial={reduce ? { opacity: 0.85, rotate: -12 } : { opacity: 0, scale: 1.9, rotate: -32 }}
      animate={{ opacity: 0.85, scale: 1, rotate: -12 }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 20, mass: 0.9, delay: 0.55 }}
    >
      <svg viewBox="0 0 120 120" className="size-full">
        <defs>
          <filter id={`ink-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
          <path id={`ring-${id}`} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
        </defs>
        <g filter={`url(#ink-${id})`} fill="none" stroke="currentColor">
          <circle cx="60" cy="60" r="56" strokeWidth="3" />
          <circle cx="60" cy="60" r="34" strokeWidth="1.5" />
          <text fill="currentColor" stroke="none" fontSize="10.5" fontWeight="700" letterSpacing="1.6">
            <textPath href={`#ring-${id}`}>{text}</textPath>
          </text>
          <text
            x="60"
            y={center.length <= 3 ? 69 : 65}
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontSize={center.length <= 3 ? 26 : 13}
            fontWeight="800"
            letterSpacing="1"
          >
            {center}
          </text>
        </g>
      </svg>
    </motion.div>
  );
}

export function MrzLines({ lines }: { lines: string[] }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden dir="ltr" className="overflow-hidden font-mono text-[11px] leading-[1.45] tracking-[0.18em] text-[#8e93ad] select-none">
      {lines.map((line, row) => (
        <p key={`${row}-${line}`} className="whitespace-nowrap">
          {[...line].map((char, index) => (
            <motion.span
              key={index}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.01, delay: reduce ? 0 : 0.2 + row * 0.25 + index * 0.012 }}
            >
              {char}
            </motion.span>
          ))}
        </p>
      ))}
    </div>
  );
}

export function Guilloche({ className }: { className?: string }) {
  const paths = Array.from({ length: 9 }, (_, line) => {
    const points: string[] = [];
    for (let x = 0; x <= 400; x += 8) {
      const y = 60 + line * 9 + Math.sin(x / 26 + line * 0.7) * 14 + Math.sin(x / 9 + line) * 2.5;
      points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
    }
    return points.join(" ");
  });
  return (
    <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-0 size-full", className)}>
      {paths.map((d, index) => (
        <path key={index} d={d} fill="none" stroke="currentColor" strokeWidth="0.6" />
      ))}
    </svg>
  );
}
