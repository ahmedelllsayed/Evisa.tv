"use client";

import { useState, useTransition } from "react";
import { adminDeleteHoliday, adminSaveHoliday } from "@/app/actions/admin";
import { AdminCard, AdminEmpty, AdminError, AdminPage, MasterDetail, MasterList, MasterRow, adminDangerClass, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import type { Holiday } from "@/lib/types";

const empty = { name: "", countryCode: "EG", date: "" };

export function HolidayEditor({ locale, holidays }: { locale: string; holidays: Holiday[] }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(holidays[0]?.id ?? "new");
  const [error, setError] = useState<string | null>(null);
  const current = holidays.find((holiday) => holiday.id === selected);
  const visible = holidays.filter((holiday) => `${holiday.name} ${holiday.countryCode} ${holiday.date}`.toLowerCase().includes(query.trim().toLowerCase()));

  const save = (id: string | undefined, fd: FormData) => {
    setError(null);
    start(async () => {
      const result = await adminSaveHoliday(locale, {
        id,
        name: String(fd.get("name") ?? ""),
        countryCode: String(fd.get("countryCode") ?? ""),
        date: String(fd.get("date") ?? ""),
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <AdminPage title="العطل" description="عطل مصر تظهر في فلتر «قبل تاريخ» على الصفحة الرئيسية. التاريخ الفارغ لا يُحفظ.">
      {error && <AdminError>{error}</AdminError>}
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
            {visible.length === 0 ? (
              <AdminEmpty>لا توجد عطل مسجلة.</AdminEmpty>
            ) : (
              visible.map((holiday) => (
                <MasterRow
                  key={holiday.id ?? `${holiday.date}-${holiday.name}`}
                  active={selected === holiday.id}
                  title={holiday.name}
                  meta={`${holiday.countryCode} · ${holiday.date}`}
                  onClick={() => holiday.id && setSelected(holiday.id)}
                />
              ))
            )}
          </MasterList>
        }
      >
        <AdminCard>
          <form key={current?.id ?? "new"} className="grid gap-2" action={(fd) => save(current?.id, fd)}>
            <input required name="name" defaultValue={current?.name ?? empty.name} placeholder="اسم العطلة" className={adminInputClass} />
            <input required name="countryCode" defaultValue={current?.countryCode ?? empty.countryCode} maxLength={2} placeholder="رمز الدولة" className={adminInputClass} />
            <input required type="date" name="date" defaultValue={current?.date ?? empty.date} className={adminInputClass} />
            <button disabled={pending} className={adminPrimaryClass}>
              {current ? "حفظ" : "إضافة عطلة"}
            </button>
          </form>
          {current?.id && (
            <button type="button" disabled={pending} className={`${adminDangerClass} mt-3`} onClick={() => start(() => adminDeleteHoliday(locale, current.id!))}>
              حذف
            </button>
          )}
        </AdminCard>
      </MasterDetail>
    </AdminPage>
  );
}
