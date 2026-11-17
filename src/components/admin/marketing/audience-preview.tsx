"use client";

import type { AudiencePerson } from "@/lib/marketing/audience";

const sexLabel: Record<string, string> = { male: "ذكر", female: "أنثى", other: "آخر" };

export type AudiencePreviewData = { total: number; unreachable: number; suppressed: number; sample: (AudiencePerson & { address?: string })[] };

export function AudiencePreview({
  preview,
  excluded,
  onToggle,
}: {
  preview: AudiencePreviewData;
  excluded?: string[];
  onToggle?: (id: string, include: boolean) => void;
}) {
  return (
    <div className="mt-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        {preview.total} شخص يمكن الوصول إليه
        {excluded?.length ? ` · مستبعد ${excluded.length}` : ""}
      </p>
      {preview.unreachable || preview.suppressed ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {preview.unreachable ? `بلا عنوان على هذه القناة ${preview.unreachable}` : ""}
          {preview.unreachable && preview.suppressed ? " · " : ""}
          {preview.suppressed ? `ألغوا الاشتراك ${preview.suppressed}` : ""}
        </p>
      ) : null}
      {preview.total > preview.sample.length ? <p className="mt-0.5 text-xs text-muted-foreground">العينة أول {preview.sample.length}.</p> : null}
      <ul className="mt-2 max-h-72 divide-y overflow-y-auto text-sm">
        {preview.sample.map((person) => {
          const out = excluded?.includes(person.id) ?? false;
          return (
            <li key={`${person.kind}-${person.id}`} className="flex items-center gap-3 py-2">
              {onToggle ? <input type="checkbox" checked={!out} onChange={(event) => onToggle(person.id, event.target.checked)} aria-label={`إرسال إلى ${person.name}`} /> : null}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{person.name}</span>
                <span className="ms-2 text-muted-foreground" dir="ltr">{person.address ?? person.email ?? person.phone}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {person.kind === "imported" ? "مستورد" : `${person.sex ? sexLabel[person.sex] : "بلا جنس"} · ${person.purchases} شراء`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
