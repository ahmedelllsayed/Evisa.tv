"use client";

import { useEffect, useRef } from "react";

const COLORS = ["bg-white", "bg-[#9eecfa]", "bg-[#ffadad]", "bg-[#ffe375]"];
const KEYS = [
  [0, 0, 0.03, 0.51],
  [0, 0.47, 1, 0.5],
  [0.63, 1.5, 0.86, 0.34],
  [2.01, 0.98, 0.41, 0.16],
  [0.02, 0.01, 0, 0],
];

export function OnTimeCircles() {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(() => {
    const update = () => {
      const bands = [...document.querySelectorAll<HTMLElement>("[data-ontime-band]")];
      if (bands.length < 2) return;
      const mid = window.innerHeight / 2;
      const center = (el: HTMLElement) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 - mid;
      const start = center(bands[0]);
      const end = center(bands[bands.length - 1]);
      const t = Math.min(Math.max((0 - start) / (end - start || 1), 0), 1) * (KEYS.length - 1);
      const i = Math.min(Math.floor(t), KEYS.length - 2);
      const f = t - i;
      const scales = KEYS[0].map((_, k) => KEYS[i][k] + (KEYS[i + 1][k] - KEYS[i][k]) * f);
      refs.current.forEach((node, k) => {
        if (node) node.style.transform = `scale(${scales[k]})`;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 top-20 z-0 flex items-center justify-center">
      <div className="relative aspect-square h-1/2 lg:h-full">
        {COLORS.map((color, i) => (
          <div
            key={color}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`absolute inset-0 rounded-full ${color}`}
            style={{ transform: "scale(0)" }}
          />
        ))}
      </div>
    </div>
  );
}
