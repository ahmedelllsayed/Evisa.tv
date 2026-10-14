"use client";

import { Reveal } from "@/components/motion/frame";

export function PageHero({
  kicker,
  title,
  children,
  align = "center",
  large = false,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
  align?: "center" | "left";
  large?: boolean;
}) {
  return (
    <Reveal>
      <header className={`mx-auto px-4 pt-12 pb-8 ${large ? "max-w-5xl" : "max-w-3xl"} ${align === "left" ? "text-left" : "text-center"}`}>
        {kicker && <p className="text-sm font-medium text-brand">{kicker}</p>}
        <h1 className={`mt-2 leading-tight tracking-tight text-[#16182b] ${large ? "max-w-2xl text-3xl font-semibold md:text-5xl" : "text-3xl font-semibold md:text-4xl"}`}>{title}</h1>
        <span className={`mt-3 block h-[3px] w-10 rounded-full bg-brand ${align === "center" ? "mx-auto" : ""}`} />
        {children && <div className="mt-4 text-base leading-relaxed text-body">{children}</div>}
      </header>
    </Reveal>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 pb-16 text-body [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#16182b] [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:ps-5 [&_li]:mt-1">{children}</div>;
}
