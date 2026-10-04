"use client";

import Image from "next/image";
import Link from "next/link";
import type { Destination } from "@/lib/types";
import { visaHref } from "@/lib/href";
import { cn } from "@/lib/utils";

export function MapView({ destinations, locale }: { destinations: Destination[]; locale: string }) {
  return (
    <div className="relative mx-auto h-[70vh] min-h-[500px] w-full max-w-site overflow-hidden rounded-3xl bg-[#cde4f7]">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 40%, #8fbc8f 0 18%, transparent 19%), radial-gradient(circle at 55% 45%, #8fbc8f 0 22%, transparent 23%), radial-gradient(circle at 78% 38%, #8fbc8f 0 12%, transparent 13%), radial-gradient(circle at 48% 70%, #d2b48c 0 8%, transparent 9%)",
        }}
      />
      {destinations.map((d) => {
        if (d.lat == null || d.lng == null) return null;
        const left = ((d.lng + 180) / 360) * 100;
        const top = ((90 - d.lat) / 180) * 100;
        return (
          <Link
            key={d.id}
            href={visaHref(d.slug, locale)}
            title={d.name}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span className={cn("block size-2.5 rounded-full ring-2 ring-white", d.visaRequired ? "bg-brand" : "bg-success")} />
            <span className="pointer-events-none absolute top-4 left-1/2 z-10 hidden w-36 -translate-x-1/2 rounded-xl bg-white p-2 text-xs shadow-float group-hover:block">
              <span className="flex items-center gap-1.5 font-medium">
                {d.flag && <Image src={d.flag} alt="" width={14} height={14} className="rounded-full" />}
                {d.name}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
