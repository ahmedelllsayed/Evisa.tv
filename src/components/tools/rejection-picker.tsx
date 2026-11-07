"use client";

import Link from "next/link";
import { useState } from "react";
import { href, visaHref } from "@/lib/href";
import { t } from "@/lib/i18n";
import { say } from "@/lib/say";

/** Shown when no destination has rejection notes yet: sends the traveller to the visa page instead. */
export function RejectionPicker({ locale, destinations }: { locale: string; destinations: { slug: string; name: string }[] }) {
  const [slug, setSlug] = useState(destinations[0]?.slug ?? "");
  return (
    <div className="min-w-0 rounded-[22px] border border-[#e3e5f2] bg-white p-5 md:p-7">
      <p className="font-semibold text-[#16182b]">{say(locale, "No rejection notes are published yet", "لم تُنشر ملاحظات رفض بعد")}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-body">
        {say(
          locale,
          "Each visa page lists the documents and rules that matter most. Pick your destination to check them before you apply.",
          "صفحة كل تأشيرة تعرض المستندات والشروط الأهم. اختر وجهتك وراجعها قبل التقديم.",
        )}
      </p>
      {destinations.length ? (
        <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm font-medium text-[#16182b] sm:max-w-sm">
            {t(locale, "reject.destination")}
            <select
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="mt-1.5 h-11 w-full min-w-0 rounded-full border border-[#e3e5f2] bg-white px-4 text-sm text-[#16182b]"
            >
              {destinations.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <Link
            href={visaHref(slug, locale)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            {say(locale, "Open the visa page", "افتح صفحة التأشيرة")}
          </Link>
        </div>
      ) : (
        <Link href={href("/", locale)} className="mt-5 inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">
          {t(locale, "reject.browse")}
        </Link>
      )}
    </div>
  );
}
