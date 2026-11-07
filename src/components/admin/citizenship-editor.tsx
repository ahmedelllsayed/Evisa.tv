"use client";

import { useMemo, useState, useTransition } from "react";
import { adminSaveCitizenships } from "@/app/actions/admin";
import { AdminError, AdminNotice, AdminPage, FilterChip, Pill, adminGhostClass, adminPrimaryClass } from "@/components/admin/chrome";
import { EditorBar, useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount } from "@/components/admin/content/fields";
import { NoticeText, type Notice } from "@/components/admin/content/use-master";
import { cn } from "@/lib/utils";

const flagUrl = (code: string, width: 20 | 40) => `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;

type Country = { code: string; name: string; nameAr: string };
type Filter = "all" | "selected" | "unselected";

function fold(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

const key = (codes: string[]) => [...codes].sort().join(",");

export function CitizenshipEditor({ locale, countries, selected, canEdit }: { locale: string; countries: Country[]; selected: string[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [baseline, setBaseline] = useState(selected);
  const [picked, setPicked] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedFirst, setSelectedFirst] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const chosen = useMemo(() => new Set(picked), [picked]);
  const byCode = useMemo(() => new Map(countries.map((country) => [country.code, country])), [countries]);
  const dirty = key(picked) !== key(baseline);
  const added = picked.filter((code) => !baseline.includes(code)).length;
  const removed = baseline.filter((code) => !chosen.has(code)).length;

  const searched = useMemo(() => {
    const needle = fold(query.trim());
    if (!needle) return countries;
    return countries.filter((country) => fold(country.name).includes(needle) || fold(country.nameAr).includes(needle) || country.code.toLowerCase() === needle);
  }, [countries, query]);
  const list = useMemo(() => {
    const scoped = searched.filter((country) => filter === "all" || (filter === "selected" ? chosen.has(country.code) : !chosen.has(country.code)));
    if (!selectedFirst || filter !== "all") return scoped;
    return [...scoped.filter((country) => chosen.has(country.code)), ...scoped.filter((country) => !chosen.has(country.code))];
  }, [searched, filter, chosen, selectedFirst]);

  const change = (next: string[]) => {
    setNotice(null);
    setPicked(next);
  };
  const toggle = (code: string) => change(chosen.has(code) ? picked.filter((item) => item !== code) : [...picked, code]);
  const selectShown = () => change([...picked, ...list.map((country) => country.code).filter((code) => !chosen.has(code))]);
  const clearShown = () => {
    const shown = new Set(list.map((country) => country.code));
    change(picked.filter((code) => !shown.has(code)));
  };
  const shownSelected = list.filter((country) => chosen.has(country.code)).length;

  const save = () => {
    if (!canEdit || pending || !dirty) return;
    const snapshot = picked;
    start(async () => {
      setNotice(null);
      try {
        const result = await adminSaveCitizenships(locale, snapshot);
        if (result && !result.ok) {
          setNotice({ tone: "danger", text: "تعذر حفظ القائمة." });
          return;
        }
        setBaseline(snapshot);
        setNotice({ tone: "success", text: snapshot.length ? `حُفظت القائمة: ${snapshot.length} جنسية ظاهرة.` : "حُفظت القائمة: كل الدول ظاهرة." });
      } catch {
        setNotice({ tone: "danger", text: "تعذر الاتصال بالخادم. حاول مرة أخرى." });
      }
    });
  };
  useEditorKeys(save, dirty);

  return (
    <AdminPage
      title="جنسيات القائمة"
      description="الدول التي تظهر في مربع اختيار الجنسية في نموذج الطلب. إذا لم تحدد أي دولة تبقى كل الدول ظاهرة."
      action={
        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
          <p className="font-mono text-lg font-semibold tabular-nums leading-none">
            {picked.length}
            <span className="text-sm text-muted-foreground">/{countries.length}</span>
          </p>
          <p className="text-xs text-muted-foreground">{picked.length ? "جنسية ظاهرة" : "كل الدول ظاهرة"}</p>
        </div>
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      {picked.length === 0 ? (
        <AdminNotice tone="info">لا توجد دول محددة، لذلك يرى العميل كل الدول ({countries.length}). حدّد الدول التي تخدمها لتقصير القائمة.</AdminNotice>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card">
        <header className="space-y-3 border-b px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالعربي أو الإنجليزي أو الرمز (EG)"
              className="h-10 min-w-0 flex-1 basis-60 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
            />
            <button type="button" className={adminGhostClass} disabled={!canEdit || shownSelected === list.length || list.length === 0} onClick={selectShown}>
              تحديد المعروضة ({list.length - shownSelected})
            </button>
            <button type="button" className={adminGhostClass} disabled={!canEdit || shownSelected === 0} onClick={clearShown}>
              إلغاء المعروضة ({shownSelected})
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}><ChipCount count={searched.length}>الكل</ChipCount></FilterChip>
              <FilterChip active={filter === "selected"} onClick={() => setFilter("selected")}>
                <ChipCount count={searched.filter((country) => chosen.has(country.code)).length}>المحددة</ChipCount>
              </FilterChip>
              <FilterChip active={filter === "unselected"} onClick={() => setFilter("unselected")}>
                <ChipCount count={searched.filter((country) => !chosen.has(country.code)).length}>غير المحددة</ChipCount>
              </FilterChip>
            </div>
            <label className={cn("flex cursor-pointer items-center gap-2 text-xs text-muted-foreground", filter !== "all" && "opacity-50")}>
              <input type="checkbox" checked={selectedFirst} disabled={filter !== "all"} onChange={(event) => setSelectedFirst(event.target.checked)} className="accent-[#38bdf8]" />
              المحددة أولاً
            </label>
          </div>
          {picked.length ? (
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
              {picked.map((code) => {
                const country = byCode.get(code);
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggle(code)}
                    title="إزالة"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border py-0.5 pe-2 ps-1 text-xs transition-colors hover:border-rose-500/50 hover:text-rose-200",
                      baseline.includes(code) ? "border-primary/30 bg-primary/10" : "border-emerald-500/40 bg-emerald-500/10",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagUrl(code, 20)} alt="" width={16} height={16} className="size-4 rounded-full bg-[#ffffff] object-cover" />
                    {country?.nameAr ?? code}
                    <span aria-hidden className="text-muted-foreground">×</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </header>

        {list.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">لا توجد دول تطابق «{query}».</p>
        ) : (
          <ul className="grid max-h-[34rem] grid-cols-1 gap-1.5 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 2xl:grid-cols-4">
            {list.map((country) => {
              const on = chosen.has(country.code);
              const changed = on !== baseline.includes(country.code);
              return (
                <li key={country.code}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                      on ? "border-primary/40 bg-primary/[0.07]" : "border-border hover:bg-accent/40",
                      !canEdit && "cursor-not-allowed",
                    )}
                  >
                    <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => toggle(country.code)} className="accent-[#38bdf8]" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagUrl(country.code, 40)} alt="" width={20} height={20} loading="lazy" className="size-5 shrink-0 rounded-full bg-[#ffffff] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{country.nameAr}</span>
                      <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                        {country.name}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{country.code}</span>
                    {changed ? <span className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-emerald-400" : "bg-rose-400")} title="تغيير غير محفوظ" /> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <EditorBar
        dirty={dirty}
        pending={pending}
        message={
          notice && (!dirty || notice.tone === "danger") ? (
            <NoticeText notice={notice} />
          ) : dirty ? (
            <span>
              <span className="text-primary">تغييرات غير محفوظة</span>
              <span className="text-muted-foreground">
                {added ? ` · +${added} إضافة` : ""}
                {removed ? ` · −${removed} إزالة` : ""}
              </span>
            </span>
          ) : undefined
        }
      >
        {picked.length ? <Pill tone="info">{picked.length} محددة</Pill> : null}
        <button type="button" className={adminGhostClass} disabled={!dirty || pending} onClick={() => change(baseline)}>
          تجاهل
        </button>
        <button type="button" className={adminPrimaryClass} disabled={!canEdit || !dirty || pending} onClick={save}>
          {pending ? "جارٍ الحفظ…" : "حفظ القائمة"}
        </button>
      </EditorBar>
    </AdminPage>
  );
}
