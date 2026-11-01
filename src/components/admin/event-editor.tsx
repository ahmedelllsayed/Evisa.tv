"use client";

import { useState, useTransition } from "react";
import { adminDeleteTravelEvent, adminSaveTravelEvent } from "@/app/actions/admin";
import { AdminCard, AdminPage, MasterDetail, MasterList, MasterRow, adminDangerClass, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import type { TravelEvent } from "@/lib/types";

type Country = { code: string; name: string };

const empty = { name: "", city: "", countryCode: "", startsOn: "", image: "" };

export function EventEditor({
  locale,
  events,
  destinations,
}: {
  locale: string;
  events: TravelEvent[];
  destinations: Country[];
}) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(events[0]?.id ?? "new");
  const [error, setError] = useState<string | null>(null);
  const current = events.find((event) => event.id === selected);
  const visible = events.filter((event) => `${event.name} ${event.city} ${event.countryCode}`.toLowerCase().includes(query.trim().toLowerCase()));

  const save = (id: string | undefined, fd: FormData) => {
    setError(null);
    start(async () => {
      const result = await adminSaveTravelEvent(locale, {
        id,
        name: String(fd.get("name") ?? ""),
        city: String(fd.get("city") ?? ""),
        countryCode: String(fd.get("countryCode") ?? ""),
        startsOn: String(fd.get("startsOn") ?? ""),
        image: String(fd.get("image") ?? "") || null,
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <AdminPage title="الفعاليات" description="الفعاليات القادمة تظهر في تبويب Events. الفعالية المنتهية تبقى هنا وتختفي من الموقع.">
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="بحث"
            action={
              <button type="button" className="h-9 shrink-0 rounded-lg bg-black px-3 text-xs text-white" onClick={() => setSelected("new")}>
                جديد
              </button>
            }
          >
            {visible.map((event) => (
              <MasterRow key={event.id} active={selected === event.id} title={event.name} meta={`${event.city} · ${event.startsOn}`} onClick={() => setSelected(event.id)} />
            ))}
          </MasterList>
        }
      >
        <AdminCard>
          <EventForm
            key={current?.id ?? "new"}
            pending={pending}
            countries={countriesFor(destinations, current ? [current] : events)}
            values={
              current
                ? { name: current.name, city: current.city, countryCode: current.countryCode, startsOn: current.startsOn, image: current.image ?? "" }
                : empty
            }
            submitLabel={current ? "حفظ" : "إضافة فعالية"}
            onSubmit={(fd) => save(current?.id, fd)}
          />
          {current && (
            <button type="button" className={`${adminDangerClass} mt-3`} disabled={pending} onClick={() => start(() => adminDeleteTravelEvent(locale, current.id))}>
              حذف
            </button>
          )}
        </AdminCard>
      </MasterDetail>
    </AdminPage>
  );
}

function EventForm({
  pending,
  countries,
  values,
  submitLabel,
  onSubmit,
}: {
  pending: boolean;
  countries: Country[];
  values: typeof empty;
  submitLabel: string;
  onSubmit: (fd: FormData) => void;
}) {
  return (
    <form className="grid gap-2 sm:grid-cols-2" action={onSubmit}>
      <input required name="name" defaultValue={values.name} placeholder="اسم الفعالية" className={`${adminInputClass} sm:col-span-2`} />
      <input required name="city" defaultValue={values.city} placeholder="المدينة" className={adminInputClass} />
      <select required name="countryCode" defaultValue={values.countryCode} className={adminInputClass}>
        <option value="">الدولة</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name} ({country.code})
          </option>
        ))}
      </select>
      <input required type="date" name="startsOn" defaultValue={values.startsOn} className={adminInputClass} />
      <input name="image" defaultValue={values.image} placeholder="رابط الصورة (اختياري)" className={adminInputClass} />
      <button disabled={pending} className={`${adminPrimaryClass} sm:col-span-2`}>
        {submitLabel}
      </button>
    </form>
  );
}

function countriesFor(destinations: Country[], events: TravelEvent[]) {
  const byCode = new Map(destinations.map((d) => [d.code, d]));
  for (const event of events) {
    if (event.countryCode && !byCode.has(event.countryCode)) byCode.set(event.countryCode, { code: event.countryCode, name: event.countryCode });
  }
  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}
