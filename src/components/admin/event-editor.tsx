"use client";

import { useMemo, useState } from "react";
import { adminDeleteTravelEvent, adminSaveTravelEvent } from "@/app/actions/admin";
import { AdminError, AdminPage, FilterChip, MasterDetail, MasterList, MasterRow, Pill, adminPrimaryClass } from "@/components/admin/chrome";
import { useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, EditorCard, FieldShell, GroupLabel, ListScroll, PreviewFrame, SelectField, TextField, errorCount, type Issues } from "@/components/admin/content/fields";
import { daysBetween, formatDay, isDay, isLink, matches, relativeDays, weekday } from "@/components/admin/content/text";
import { NEW, SaveBar, useMaster } from "@/components/admin/content/use-master";
import type { TravelEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

export type EventCountry = { code: string; name: string; nameAr: string | null; image: string | null };
type Draft = { name: string; city: string; countryCode: string; startsOn: string; image: string };
type Filter = "all" | "upcoming" | "past";

const empty: Draft = { name: "", city: "", countryCode: "", startsOn: "", image: "" };

function toDraft(event: TravelEvent | undefined): Draft {
  if (!event) return empty;
  return { name: event.name, city: event.city, countryCode: event.countryCode, startsOn: event.startsOn, image: event.image ?? "" };
}

function collectIssues(values: Draft, today: string): Issues<keyof Draft> {
  const issues: Issues<keyof Draft> = {};
  if (!values.name.trim()) issues.name = { level: "error", message: "اسم الفعالية مطلوب." };
  if (!values.city.trim()) issues.city = { level: "error", message: "المدينة مطلوبة." };
  if (!values.countryCode) issues.countryCode = { level: "error", message: "اختر الدولة." };
  if (!values.startsOn) issues.startsOn = { level: "error", message: "تاريخ البداية مطلوب." };
  else if (!isDay(values.startsOn)) issues.startsOn = { level: "error", message: "التاريخ بصيغة YYYY-MM-DD." };
  else if ((daysBetween(today, values.startsOn) ?? 0) < 0) issues.startsOn = { level: "warn", message: "التاريخ مضى. الفعالية لن تظهر في الموقع." };
  if (values.image.trim() && !isLink(values.image.trim())) issues.image = { level: "error", message: "استخدم رابطاً يبدأ بـ https:// أو مساراً يبدأ بـ /" };
  return issues;
}

export function EventEditor({
  locale,
  events,
  countries,
  today,
  canEdit,
  canDelete,
}: {
  locale: string;
  events: TravelEvent[];
  countries: EventCountry[];
  today: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const sorted = useMemo(() => {
    const upcoming = events.filter((event) => event.startsOn >= today).sort((a, b) => (a.startsOn < b.startsOn ? -1 : a.startsOn > b.startsOn ? 1 : 0));
    const past = events.filter((event) => event.startsOn < today).sort((a, b) => (a.startsOn < b.startsOn ? 1 : a.startsOn > b.startsOn ? -1 : 0));
    return { upcoming, past, all: [...upcoming, ...past] };
  }, [events, today]);
  const master = useMaster({
    items: sorted.all,
    idOf: (event) => event.id,
    toDraft,
    isCreated: (event, draft) => event.name === draft.name.trim() && event.startsOn === draft.startsOn && event.countryCode === draft.countryCode,
  });
  const { values, set, current } = master;
  const issues = useMemo(() => collectIssues(values, today), [values, today]);
  const errors = errorCount(issues);
  const byCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries]);
  const options = useMemo(() => {
    const list = countries.map((country) => ({ value: country.code, label: `${country.nameAr || country.name} · ${country.code}` }));
    if (values.countryCode && !byCode.has(values.countryCode)) list.push({ value: values.countryCode, label: values.countryCode });
    return list;
  }, [countries, byCode, values.countryCode]);

  const save = () => {
    if (!canEdit || master.pending) return;
    if (errors) {
      master.setNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    if (!master.dirty && current) return;
    master.save(
      (draft) =>
        adminSaveTravelEvent(locale, {
          id: current?.id,
          name: draft.name.trim(),
          city: draft.city.trim(),
          countryCode: draft.countryCode,
          startsOn: draft.startsOn,
          image: draft.image.trim() || null,
        }),
      current ? "حُفظت الفعالية." : "أُضيفت الفعالية.",
    );
  };
  useEditorKeys(save, master.dirty);

  const scope = filter === "upcoming" ? sorted.upcoming : filter === "past" ? sorted.past : sorted.all;
  const visible = scope.filter((event) => matches(query, event.name, event.city, event.countryCode, byCode.get(event.countryCode)?.nameAr));
  const groups = filter === "all" ? [
    { label: "القادمة", rows: visible.filter((event) => event.startsOn >= today) },
    { label: "المنتهية", rows: visible.filter((event) => event.startsOn < today) },
  ] : [{ label: null, rows: visible }];

  const diff = isDay(values.startsOn) ? daysBetween(today, values.startsOn) : null;
  const country = byCode.get(values.countryCode);
  const previewImage = values.image.trim() || country?.image || "";

  return (
    <AdminPage
      title="الفعاليات"
      description="الفعاليات القادمة تظهر في تبويب Events على الصفحة الرئيسية. الفعالية المنتهية تبقى هنا وتختفي من الموقع تلقائياً."
      action={
        <div className="flex items-center gap-2">
          <Pill tone="success" dot>{sorted.upcoming.length} قادمة</Pill>
          <Pill>{sorted.past.length} منتهية</Pill>
        </div>
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث بالاسم أو المدينة أو الدولة"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => master.choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}><ChipCount count={events.length}>الكل</ChipCount></FilterChip>
                <FilterChip active={filter === "upcoming"} onClick={() => setFilter("upcoming")}><ChipCount count={sorted.upcoming.length}>القادمة</ChipCount></FilterChip>
                <FilterChip active={filter === "past"} onClick={() => setFilter("past")}><ChipCount count={sorted.past.length}>المنتهية</ChipCount></FilterChip>
              </>
            }
            footer={visible.length !== scope.length ? `${visible.length} من ${scope.length}` : undefined}
          >
            <ListScroll>
            {master.isNew ? <MasterRow active title={values.name.trim() || "فعالية جديدة"} meta="لم تُحفظ بعد" onClick={() => undefined} /> : null}
            {visible.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد فعاليات مطابقة.</p> : null}
            {groups.map((group) =>
              group.rows.length ? (
                <div key={group.label ?? "rows"}>
                  {group.label ? <GroupLabel count={group.rows.length}>{group.label}</GroupLabel> : null}
                  {group.rows.map((event) => {
                    const offset = daysBetween(today, event.startsOn) ?? 0;
                    return (
                      <MasterRow
                        key={event.id}
                        active={master.selected === event.id}
                        title={event.name}
                        meta={`${event.city} · ${formatDay(event.startsOn)}`}
                        badge={offset >= 0 ? <Pill tone={offset <= 14 ? "success" : "info"}>{relativeDays(offset)}</Pill> : <Pill>منتهية</Pill>}
                        onClick={() => master.choose(event.id)}
                      />
                    );
                  })}
                </div>
              ) : null,
            )}
            </ListScroll>
          </MasterList>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="pb-2"
        >
          <EditorCard
            eyebrow={current ? "تعديل فعالية" : "فعالية جديدة"}
            title={values.name.trim() || "فعالية بدون اسم"}
            meta={
              <>
                <span>{values.city || "—"}</span>
                <span aria-hidden>·</span>
                <span>{country ? country.nameAr || country.name : values.countryCode || "—"}</span>
              </>
            }
            status={diff == null ? null : diff >= 0 ? <Pill tone="success" dot>قادمة · {relativeDays(diff)}</Pill> : <Pill dot>منتهية</Pill>}
            aside={
              <PreviewFrame label="معاينة البطاقة">
                <div className="overflow-hidden rounded-lg border bg-background">
                  <div className="relative aspect-[16/10] bg-muted">
                    {previewImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={previewImage} src={previewImage} alt="" className="size-full object-cover" onError={(event) => (event.currentTarget.style.visibility = "hidden")} />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs text-muted-foreground">بدون صورة</span>
                    )}
                    {isDay(values.startsOn) ? (
                      <span className="absolute start-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[11px] text-white">{formatDay(values.startsOn)}</span>
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{values.name || "اسم الفعالية"}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {values.city || "المدينة"} · {country?.name ?? values.countryCode}
                    </p>
                  </div>
                </div>
                {!values.image.trim() && country?.image ? <p className="mt-2 text-xs text-muted-foreground">بدون رابط صورة، تُستخدم صورة الوجهة تلقائياً.</p> : null}
              </PreviewFrame>
            }
          >
            <TextField label="اسم الفعالية" value={values.name} onChange={set("name")} issue={issues.name} required span counter={{ max: 80 }} disabled={!canEdit} placeholder="مثال: Oktoberfest" />
            <TextField label="المدينة" value={values.city} onChange={set("city")} issue={issues.city} required disabled={!canEdit} placeholder="Munich" />
            <SelectField label="الدولة" value={values.countryCode} onChange={set("countryCode")} options={options} issue={issues.countryCode} required disabled={!canEdit} placeholder="اختر الدولة" hint="ترتبط الفعالية بصفحة تأشيرة هذه الدولة." />
            <TextField
              label="تاريخ البداية"
              type="date"
              value={values.startsOn}
              onChange={set("startsOn")}
              issue={issues.startsOn}
              required
              disabled={!canEdit}
              hint={isDay(values.startsOn) ? `${weekday(values.startsOn)} ${formatDay(values.startsOn)} · ${relativeDays(diff)}` : undefined}
            />
            <TextField
              label="رابط الصورة"
              value={values.image}
              onChange={set("image")}
              issue={issues.image}
              dir="ltr"
              placeholder="/images/event.jpg أو https://…"
              hint="اختياري. فارغ يعني استخدام صورة الوجهة."
              disabled={!canEdit}
            />
            {current ? (
              <FieldShell label="الظهور في الموقع" span>
                <p className={cn("mt-1.5 rounded-lg border px-3 py-2 text-xs", (diff ?? -1) >= 0 ? "border-emerald-500/30 text-emerald-300" : "border-border text-muted-foreground")}>
                  {(diff ?? -1) >= 0 ? "تظهر في تبويب الفعاليات حتى يوم بدايتها." : "مخفية من الموقع لأن تاريخها مضى. غيّر التاريخ لإعادتها."}
                </p>
              </FieldShell>
            ) : null}
          </EditorCard>
          <SaveBar
            isNew={master.isNew}
            dirty={master.dirty}
            pending={master.pending}
            notice={master.notice}
            errors={errors}
            canSave={canEdit && (master.dirty || master.isNew)}
            saveLabel={current ? "حفظ الفعالية" : "إضافة الفعالية"}
            onDiscard={master.discard}
            onDelete={current && canDelete ? () => master.run(() => adminDeleteTravelEvent(locale, current.id), "حُذفت الفعالية.") : undefined}
          />
        </form>
      </MasterDetail>
    </AdminPage>
  );
}
