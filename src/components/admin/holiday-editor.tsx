"use client";

import { useMemo, useState } from "react";
import { adminDeleteHoliday, adminSaveHoliday } from "@/app/actions/admin";
import { AdminError, AdminPage, FilterChip, MasterDetail, MasterList, MasterRow, Pill, adminPrimaryClass } from "@/components/admin/chrome";
import { useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, EditorCard, GroupLabel, ListScroll, PreviewFrame, TextField, errorCount, type Issues } from "@/components/admin/content/fields";
import { daysBetween, formatDay, isDay, matches, monthLabel, relativeDays, weekday } from "@/components/admin/content/text";
import { NEW, SaveBar, useMaster } from "@/components/admin/content/use-master";
import type { Holiday } from "@/lib/types";
import { cn } from "@/lib/utils";

type Draft = { name: string; countryCode: string; date: string };
type Filter = "upcoming" | "past" | "all";

const empty: Draft = { name: "", countryCode: "EG", date: "" };
const idOf = (holiday: Holiday) => holiday.id ?? `${holiday.countryCode}-${holiday.date}-${holiday.name}`;

function toDraft(holiday: Holiday | undefined): Draft {
  return holiday ? { name: holiday.name, countryCode: holiday.countryCode, date: holiday.date } : empty;
}

const ascending = (a: Holiday, b: Holiday) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function HolidayEditor({
  locale,
  holidays,
  today,
  canEdit,
  canDelete,
}: {
  locale: string;
  holidays: Holiday[];
  today: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => {
    const upcoming = holidays.filter((holiday) => holiday.date >= today).sort(ascending);
    const past = holidays.filter((holiday) => holiday.date < today).sort((a, b) => ascending(b, a));
    return { upcoming, past, all: [...upcoming, ...past] };
  }, [holidays, today]);
  const [filter, setFilter] = useState<Filter>(sorted.upcoming.length ? "upcoming" : "all");
  const master = useMaster({
    items: sorted.all,
    idOf,
    toDraft,
    isCreated: (holiday, draft) => holiday.date === draft.date && holiday.countryCode === draft.countryCode.trim().toUpperCase(),
  });
  const { values, set, current } = master;

  const issues = useMemo(() => {
    const found: Issues<keyof Draft> = {};
    if (!values.name.trim()) found.name = { level: "error", message: "اسم العطلة مطلوب." };
    if (!/^[A-Z]{2}$/.test(values.countryCode.trim())) found.countryCode = { level: "error", message: "رمز الدولة حرفان لاتينيان، مثل EG." };
    if (!values.date) found.date = { level: "error", message: "التاريخ مطلوب." };
    else if (!isDay(values.date)) found.date = { level: "error", message: "التاريخ بصيغة YYYY-MM-DD." };
    else {
      const clash = holidays.find((holiday) => holiday.date === values.date && holiday.countryCode === values.countryCode.trim() && idOf(holiday) !== master.selected);
      if (clash) found.date = { level: "error", message: `يوجد في هذا التاريخ «${clash.name}» للدولة نفسها.` };
    }
    return found;
  }, [values, holidays, master.selected]);
  const errors = errorCount(issues);

  const save = () => {
    if (!canEdit || master.pending) return;
    if (errors) {
      master.setNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    if (!master.dirty && current) return;
    master.save(
      (draft) => adminSaveHoliday(locale, { id: current?.id, name: draft.name.trim(), countryCode: draft.countryCode.trim().toUpperCase(), date: draft.date }),
      current ? "حُفظت العطلة." : "أُضيفت العطلة.",
    );
  };
  useEditorKeys(save, master.dirty);

  const scope = filter === "upcoming" ? sorted.upcoming : filter === "past" ? sorted.past : sorted.all;
  const visible = scope.filter((holiday) => matches(query, holiday.name, holiday.countryCode, holiday.date, monthLabel(holiday.date)));
  const groups = useMemo(() => {
    const list: { key: string; label: string; past: boolean; rows: Holiday[] }[] = [];
    for (const holiday of visible) {
      const past = holiday.date < today;
      const key = `${past ? "p" : "u"}-${holiday.date.slice(0, 7)}`;
      const last = list[list.length - 1];
      if (last && last.key === key) last.rows.push(holiday);
      else list.push({ key, label: monthLabel(holiday.date), past, rows: [holiday] });
    }
    return list;
  }, [visible, today]);

  const diff = isDay(values.date) ? daysBetween(today, values.date) : null;
  const next = sorted.upcoming[0];

  return (
    <AdminPage
      title="العطل"
      description="عطل مصر تظهر في فلتر «قبل تاريخ» على الصفحة الرئيسية، وتُستخدم لتنبيه المسافر عندما تتأخر الجهات الرسمية."
      action={
        next ? (
          <div className="rounded-xl border bg-card px-4 py-2.5 text-sm">
            <p className="text-xs text-muted-foreground">العطلة القادمة</p>
            <p className="mt-0.5 font-medium">
              {next.name} <span className="text-muted-foreground">· {relativeDays(daysBetween(today, next.date))}</span>
            </p>
          </div>
        ) : null
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث بالاسم أو الشهر"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => master.choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={filter === "upcoming"} onClick={() => setFilter("upcoming")}><ChipCount count={sorted.upcoming.length}>القادمة</ChipCount></FilterChip>
                <FilterChip active={filter === "past"} onClick={() => setFilter("past")}><ChipCount count={sorted.past.length}>الماضية</ChipCount></FilterChip>
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}><ChipCount count={holidays.length}>الكل</ChipCount></FilterChip>
              </>
            }
          >
            <ListScroll>
            {master.isNew ? <MasterRow active title={values.name.trim() || "عطلة جديدة"} meta="لم تُحفظ بعد" onClick={() => undefined} /> : null}
            {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد عطل مطابقة.</p> : null}
            {groups.map((group, index) => (
              <div key={group.key}>
                {filter === "all" && (index === 0 || groups[index - 1]!.past !== group.past) ? (
                  <p className="mx-3 mt-3 border-t pt-2 text-[11px] font-semibold text-primary/80 first:mt-0 first:border-0 first:pt-0">{group.past ? "الماضية" : "القادمة"}</p>
                ) : null}
                <GroupLabel count={group.rows.length}>{group.label}</GroupLabel>
                {group.rows.map((holiday) => {
                  const offset = daysBetween(today, holiday.date) ?? 0;
                  return (
                    <MasterRow
                      key={idOf(holiday)}
                      active={master.selected === idOf(holiday)}
                      title={holiday.name}
                      meta={`${weekday(holiday.date)} ${formatDay(holiday.date)} · ${holiday.countryCode}`}
                      badge={offset >= 0 ? <Pill tone={offset <= 30 ? "success" : "info"}>{relativeDays(offset)}</Pill> : <Pill>مضت</Pill>}
                      onClick={() => master.choose(idOf(holiday))}
                    />
                  );
                })}
              </div>
            ))}
            </ListScroll>
          </MasterList>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <EditorCard
            eyebrow={current ? "تعديل عطلة" : "عطلة جديدة"}
            title={values.name.trim() || "عطلة بدون اسم"}
            meta={isDay(values.date) ? <span>{weekday(values.date)} {formatDay(values.date)}</span> : <span>بدون تاريخ</span>}
            status={diff == null ? null : diff >= 0 ? <Pill tone="success" dot>{relativeDays(diff)}</Pill> : <Pill dot>مضت {relativeDays(diff)}</Pill>}
            aside={
              <PreviewFrame label="في التقويم">
                <div className="flex items-center gap-4">
                  <div className="w-20 shrink-0 overflow-hidden rounded-lg border bg-background text-center">
                    <p className="bg-rose-500/80 py-1 text-[11px] font-medium text-white">{isDay(values.date) ? monthLabel(values.date).split(" ")[0] : "—"}</p>
                    <p className="py-2 font-mono text-3xl font-semibold tabular-nums">{isDay(values.date) ? Number(values.date.slice(8, 10)) : "?"}</p>
                    <p className="pb-1.5 text-[11px] text-muted-foreground">{isDay(values.date) ? weekday(values.date) : ""}</p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{values.name || "اسم العطلة"}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {values.countryCode.trim().toUpperCase() === "EG"
                        ? "عطلة مصرية: تظهر في فلتر «قبل تاريخ» ويُحسب حولها موعد التسليم."
                        : "عطلة لدولة أخرى: تُستخدم في حساب مواعيد هذه الوجهة فقط."}
                    </p>
                  </div>
                </div>
              </PreviewFrame>
            }
          >
            <TextField label="اسم العطلة" value={values.name} onChange={set("name")} issue={issues.name} required span counter={{ max: 60 }} disabled={!canEdit} placeholder="مثال: عيد الفطر" />
            <TextField
              label="التاريخ"
              type="date"
              value={values.date}
              onChange={set("date")}
              issue={issues.date}
              required
              disabled={!canEdit}
              hint={isDay(values.date) ? `${weekday(values.date)} ${formatDay(values.date)} · ${relativeDays(diff)}` : undefined}
            />
            <TextField
              label="رمز الدولة"
              value={values.countryCode}
              onChange={(value) => set("countryCode")(value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))}
              issue={issues.countryCode}
              required
              dir="ltr"
              maxLength={2}
              disabled={!canEdit}
              hint="رمز ISO من حرفين. EG لمصر."
            />
          </EditorCard>
          <SaveBar
            isNew={master.isNew}
            dirty={master.dirty}
            pending={master.pending}
            notice={master.notice}
            errors={errors}
            canSave={canEdit && (master.dirty || master.isNew)}
            saveLabel={current ? "حفظ العطلة" : "إضافة العطلة"}
            onDiscard={master.discard}
            onDelete={current?.id && canDelete ? () => master.run(() => adminDeleteHoliday(locale, current.id!), "حُذفت العطلة.") : undefined}
          />
        </form>
      </MasterDetail>
    </AdminPage>
  );
}
