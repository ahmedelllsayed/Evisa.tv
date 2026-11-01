"use client";

import { useMemo, useState, useTransition } from "react";
import { adminSaveCitizenships } from "@/app/actions/admin";
import { AdminCard, AdminError, AdminPage, adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import { countries, countryName, flagUrl } from "@/lib/countries";

export function CitizenshipEditor({ locale, selected }: { locale: string; selected: string[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);
  const chosen = useMemo(() => new Set(picked), [picked]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((country) => {
      const arabic = countryName(country.code, "ar").toLowerCase();
      return country.name.toLowerCase().includes(q) || arabic.includes(q) || country.code.toLowerCase().includes(q);
    });
  }, [query]);

  const toggle = (code: string) => {
    setSaved(false);
    setPicked((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
  };

  return (
    <AdminPage
      title="جنسيات القائمة"
      description="حدد الدول التي تظهر في مربع الجنسية. إذا لم تحدد شيئاً تبقى كل الدول ظاهرة."
    >
      {error && <AdminError>{error}</AdminError>}
      {saved && <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand">تم حفظ القائمة.</p>}
      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-ink">
            المحدد: {picked.length} من {countries.length}
          </p>
          <div className="flex gap-2">
            <button type="button" className={adminGhostClass} onClick={() => { setSaved(false); setPicked(countries.map((country) => country.code)); }}>
              تحديد الكل
            </button>
            <button type="button" className={adminGhostClass} onClick={() => { setSaved(false); setPicked([]); }}>
              إلغاء التحديد
            </button>
          </div>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث بالعربي أو الإنجليزي"
          className="mt-4 h-11 w-full rounded-full border border-line px-4 text-sm"
        />
        <ul className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto sm:grid-cols-2">
          {list.map((country) => (
            <li key={country.code}>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <input type="checkbox" checked={chosen.has(country.code)} onChange={() => toggle(country.code)} />
                <img src={flagUrl(country.code, 40)} alt="" width={18} height={18} className="size-[18px] rounded-full object-cover" />
                <span className="min-w-0">
                  <span className="block truncate">{countryName(country.code, "ar")}</span>
                  <span className="block truncate text-xs text-muted-ink">{country.name}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={pending}
          className={`${adminPrimaryClass} mt-4`}
          onClick={() =>
            start(async () => {
              setError(null);
              setSaved(false);
              const result = await adminSaveCitizenships(locale, picked);
              if (result && !result.ok) setError("تعذر حفظ القائمة.");
              else setSaved(true);
            })
          }
        >
          {pending ? "جارٍ الحفظ…" : "حفظ الجنسيات الظاهرة"}
        </button>
      </AdminCard>
    </AdminPage>
  );
}
