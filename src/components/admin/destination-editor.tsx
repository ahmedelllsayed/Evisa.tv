"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Play, Upload } from "lucide-react";
import { adminDeleteDestination, adminSaveDestinationForm } from "@/app/actions/admin";
import { PairedSelect } from "@/components/admin/destination-fields";
import { VisaOptionsEditor } from "@/components/admin/visa-options-editor";
import { DocumentChecklist } from "@/components/admin/document-checklist";
import { AdminError, AdminNotice, AdminPage, FilterChip, MasterDetail, MasterList, Pill, adminGhostClass, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { ConfirmButton, EditorBar, useEditorKeys } from "@/components/admin/chrome-client";
import { ChipCount, FieldShell, ListScroll, TextField, Toggle, errorCount, type Issue } from "@/components/admin/content/fields";
import { daysBetween, formatDay, isDay, isHttpUrl, isLink, matches, relativeDays } from "@/components/admin/content/text";
import { NoticeText, revealEditor, type Notice } from "@/components/admin/content/use-master";
import type { DestinationInput } from "@/lib/data/catalog";
import { portOptions, regionOptions, visaTypeOptions, withCurrent } from "@/lib/destination-fields";
import { visaHref } from "@/lib/href";
import type { Destination, VisaOption } from "@/lib/types";
import type { QuestionKind } from "@/lib/visa-answers";
import { cn } from "@/lib/utils";

type Tab = "basics" | "options" | "media" | "sources";
type Picked = { url: string; name: string };
type Filter = "all" | "visible" | "hidden" | "attention";
type Gap = { key: string; label: string; tab: Tab };

const STALE_DAYS = 180;
const NEW = "new";

const tabs: { id: Tab; label: string }[] = [
  { id: "basics", label: "الأساسيات" },
  { id: "options", label: "أنواع التأشيرة" },
  { id: "media", label: "الوسائط" },
  { id: "sources", label: "المستندات والمصادر" },
];

const empty: DestinationInput = {
  name: "",
  nameAr: "",
  slug: "",
  code: "",
  region: "",
  visaRequired: true,
  visaType: "e-visa",
  typeLabel: null,
  typeLabelAr: null,
  validity: "",
  validityAr: "",
  stay: "",
  stayAr: "",
  entry: "Single",
  entryAr: "",
  acceptedAt: "All Ports of Entry",
  method: "Paperless",
  methodAr: "",
  govFee: 0,
  serviceFee: 0,
  processingHours: 96,
  expressHours: 48,
  expressFee: 0,
  embassyVisit: false,
  documents: [],
  image: "",
  heroImage: "",
  flag: "",
  videoUrl: "",
  cities: [],
  rejectionReasons: [],
  sources: [],
  sortOrder: 100,
  isActive: true,
};

function fromDestination(d: Destination): DestinationInput {
  return {
    name: d.name,
    nameAr: d.nameAr ?? "",
    slug: d.slug,
    code: d.code,
    region: d.region,
    visaRequired: d.visaRequired,
    visaType: d.visaType,
    typeLabel: d.typeLabel ?? null,
    typeLabelAr: d.typeLabelAr ?? null,
    validity: d.validity,
    validityAr: d.validityAr ?? "",
    stay: d.stay,
    stayAr: d.stayAr ?? "",
    entry: d.entry,
    entryAr: d.entryAr ?? "",
    acceptedAt: d.acceptedAt,
    method: d.method,
    methodAr: d.methodAr ?? "",
    govFee: d.govFee,
    serviceFee: d.serviceFee,
    processingHours: d.processingHours,
    expressHours: d.expressHours,
    expressFee: d.expressFee,
    embassyVisit: d.embassyVisit,
    documents: d.documents,
    image: d.image,
    heroImage: d.heroImage,
    flag: d.flag,
    videoUrl: d.videoUrl,
    cities: d.cities,
    rejectionReasons: d.rejectionReasons,
    sources: d.sources,
    sourceUrl: d.sourceUrl ?? "",
    reviewedOn: d.reviewedAt?.slice(0, 10) ?? "",
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  };
}

function fileLabel(url: string | null | undefined) {
  if (!url) return "لا يوجد ملف";
  const clean = url.split("?")[0] ?? url;
  return clean.split("/").pop() || clean;
}

function missingMediaKinds(destination: Destination | undefined, stored: Set<string>) {
  const missing = new Set<string>();
  if (!destination) return missing;
  const urls: Record<string, string | null | undefined> = {
    image: destination.image,
    hero: destination.heroImage,
    flag: destination.flag,
    video: destination.videoUrl,
  };
  for (const kind of ["image", "hero", "flag", "video"]) {
    if ((urls[kind] ?? "").startsWith("/destination-media/") && !stored.has(`${destination.id}:${kind}`)) missing.add(kind);
  }
  return missing;
}

function gapsOf(destination: Destination, stored: Set<string>, activeOptions: number, today: string): Gap[] {
  const gaps: Gap[] = [];
  const missing = missingMediaKinds(destination, stored);
  if (!destination.nameAr?.trim()) gaps.push({ key: "nameAr", label: "الاسم بالعربية", tab: "basics" });
  if (destination.visaRequired && activeOptions === 0) gaps.push({ key: "options", label: "نوع تأشيرة ظاهر", tab: "options" });
  if (!destination.image || missing.has("image")) gaps.push({ key: "image", label: "صورة البطاقة", tab: "media" });
  if (!destination.heroImage || missing.has("hero")) gaps.push({ key: "hero", label: "صورة الغلاف", tab: "media" });
  if (!destination.flag || missing.has("flag")) gaps.push({ key: "flag", label: "العلم", tab: "media" });
  if (!destination.sourceUrl && destination.sources.length === 0) gaps.push({ key: "source", label: "المصدر الرسمي", tab: "sources" });
  const reviewed = destination.reviewedAt?.slice(0, 10);
  const age = reviewed ? daysBetween(reviewed, today) : null;
  if (age == null) gaps.push({ key: "review", label: "تاريخ مراجعة المتطلبات", tab: "sources" });
  else if (age > STALE_DAYS) gaps.push({ key: "review", label: `مراجعة قديمة (${relativeDays(-age)})`, tab: "sources" });
  return gaps;
}

type Basics = { name: string; nameAr: string; slug: string; code: string; isActive: boolean; visaRequired: boolean };
type Sources = { sourceUrl: string; reviewedOn: string; sources: string; rejectionReasons: string };

function basicsOf(input: DestinationInput): Basics {
  return { name: input.name, nameAr: input.nameAr ?? "", slug: input.slug, code: input.code, isActive: input.isActive, visaRequired: input.visaRequired };
}

function sourcesOf(input: DestinationInput): Sources {
  return {
    sourceUrl: input.sourceUrl ?? "",
    reviewedOn: input.reviewedOn ?? "",
    sources: input.sources.map((source) => `${source.label} | ${source.url}`).join("\n"),
    rejectionReasons: input.rejectionReasons
      .map((reason) => [reason.title, reason.body, reason.titleAr ?? "", reason.bodyAr ?? ""].filter((part, index) => part || index < 2).join(" | "))
      .join("\n"),
  };
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function DestinationEditor({
  locale,
  destinations,
  storedMedia = [],
  options = [],
  optionCounts = {},
  questionsByOption = {},
  today,
  canEdit = true,
  canDelete = true,
}: {
  locale: string;
  destinations: Destination[];
  storedMedia?: { destination_id: string; kind: string }[];
  options?: VisaOption[];
  optionCounts?: Record<string, number>;
  questionsByOption?: Record<string, { id?: string; prompt: string; promptAr: string; kind: QuestionKind; choices: { en: string; ar: string }[]; required: boolean; active: boolean }[]>;
  today: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string>(destinations[0]?.id ?? NEW);
  const [tab, setTab] = useState<Tab>(destinations[0] ? "media" : "basics");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [formKey, setFormKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const current = destinations.find((d) => d.id === selected);

  const stored = useMemo(() => new Set(storedMedia.map((row) => `${row.destination_id}:${row.kind}`)), [storedMedia]);
  const activeByDestination = useMemo(() => {
    const map = new Map<string, number>();
    for (const option of options) if (option.isActive) map.set(option.destinationId, (map.get(option.destinationId) ?? 0) + 1);
    return map;
  }, [options]);
  const gapMap = useMemo(
    () => new Map(destinations.map((d) => [d.id, gapsOf(d, stored, activeByDestination.get(d.id) ?? 0, today)])),
    [destinations, stored, activeByDestination, today],
  );
  const counts = {
    all: destinations.length,
    visible: destinations.filter((d) => d.isActive).length,
    hidden: destinations.filter((d) => !d.isActive).length,
    attention: destinations.filter((d) => (gapMap.get(d.id)?.length ?? 0) > 0).length,
  };
  const shown = destinations.filter((d) => {
    if (filter === "visible" && !d.isActive) return false;
    if (filter === "hidden" && d.isActive) return false;
    if (filter === "attention" && !gapMap.get(d.id)?.length) return false;
    return matches(query, d.name, d.nameAr, d.slug, d.code, d.region);
  });

  function choose(id: string) {
    if (id === selected) return;
    if (dirty && !window.confirm("لديك تغييرات غير محفوظة. تجاهلها والانتقال؟")) return;
    setSelected(id);
    setTab(id === NEW ? "basics" : "media");
    setNotice(null);
    setDirty(false);
    setFormKey((value) => value + 1);
    revealEditor();
  }

  const formId = `${selected}-${formKey}-${current?.updatedAt ?? "new"}`;

  return (
    <AdminPage
      title="الوجهات"
      description="ابحث عن صفحة تأشيرة، وعدّل بياناتها وأنواعها وأسعارها، واستبدل الصور والفيديو من مساحة واحدة."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="success" dot>{counts.visible} ظاهرة</Pill>
          {counts.hidden ? <Pill dot>{counts.hidden} مخفية</Pill> : null}
          {counts.attention ? <Pill tone="warning" dot>{counts.attention} تحتاج إكمال</Pill> : null}
        </div>
      }
    >
      {!canEdit && <AdminError>لديك صلاحية عرض فقط. الحفظ معطّل لهذا الحساب.</AdminError>}
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="ابحث بالاسم أو الرابط أو الرمز"
            action={
              <button type="button" className={cn(adminPrimaryClass, "shrink-0 px-3")} disabled={!canEdit} onClick={() => choose(NEW)}>
                جديد
              </button>
            }
            filters={
              <>
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}><ChipCount count={counts.all}>الكل</ChipCount></FilterChip>
                <FilterChip active={filter === "visible"} onClick={() => setFilter("visible")}><ChipCount count={counts.visible}>ظاهرة</ChipCount></FilterChip>
                <FilterChip active={filter === "hidden"} onClick={() => setFilter("hidden")}><ChipCount count={counts.hidden}>مخفية</ChipCount></FilterChip>
                <FilterChip active={filter === "attention"} onClick={() => setFilter("attention")}><ChipCount count={counts.attention}>تحتاج إكمال</ChipCount></FilterChip>
              </>
            }
            footer={shown.length !== destinations.length ? `${shown.length} من ${destinations.length} وجهة` : `${destinations.length} وجهة`}
          >
            <ListScroll>
            {selected === NEW ? (
              <div className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2 ring-1 ring-primary/30">
                <span className="size-9 shrink-0 rounded-md border border-dashed" />
                <span className="text-sm font-medium">وجهة جديدة</span>
              </div>
            ) : null}
            {shown.length === 0 ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد وجهات مطابقة.</p> : null}
            {shown.map((destination) => (
              <DestinationRow
                key={destination.id}
                destination={destination}
                active={destination.id === selected}
                gaps={gapMap.get(destination.id) ?? []}
                options={options.filter((option) => option.destinationId === destination.id).length}
                onClick={() => choose(destination.id)}
              />
            ))}
            </ListScroll>
          </MasterList>
        }
      >
        <DestinationForm
          key={formId}
          locale={locale}
          current={current}
          isNew={selected === NEW}
          options={current ? options.filter((option) => option.destinationId === current.id) : []}
          optionCounts={optionCounts}
          questionsByOption={questionsByOption}
          missing={missingMediaKinds(current, stored)}
          gaps={current ? gapMap.get(current.id) ?? [] : []}
          today={today}
          tab={tab}
          onTab={setTab}
          pending={pending}
          notice={notice}
          dirty={dirty}
          canEdit={canEdit}
          canDelete={canDelete}
          onDirty={() => {
            setDirty(true);
            setNotice((value) => (value?.tone === "success" ? null : value));
          }}
          onDiscard={() => {
            setDirty(false);
            setNotice(null);
            setFormKey((value) => value + 1);
          }}
          onNotice={setNotice}
          onSubmit={(fd) => {
            setNotice(null);
            start(async () => {
              try {
                const result = await adminSaveDestinationForm(locale, selected === NEW ? null : selected, fd);
                if (!result.ok) {
                  setNotice({ tone: "danger", text: result.error });
                  return;
                }
                setDirty(false);
                setNotice({ tone: "success", text: selected === NEW ? "أُضيفت الوجهة." : "حُفظت الوجهة، والموقع يعرضها الآن." });
                setFormKey((value) => value + 1);
                if (selected === NEW) setSelected(result.id);
              } catch {
                setNotice({ tone: "danger", text: "تعذر الاتصال بالخادم. حاول مرة أخرى." });
              }
            });
          }}
          onDelete={() =>
            start(async () => {
              const result = await adminDeleteDestination(locale, selected);
              if (!result.ok) {
                setNotice({ tone: "danger", text: result.error });
                return;
              }
              const next = destinations.find((d) => d.id !== selected);
              setDirty(false);
              setSelected(next?.id ?? NEW);
              setTab(next ? "media" : "basics");
              setFormKey((value) => value + 1);
              setNotice({ tone: "success", text: "حُذفت الوجهة." });
            })
          }
        />
      </MasterDetail>
    </AdminPage>
  );
}

function DestinationRow({ destination, active, gaps, options, onClick }: { destination: Destination; active: boolean; gaps: Gap[]; options: number; onClick: () => void }) {
  const thumb = destination.image || destination.flag;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start transition-colors",
        active ? "bg-accent ring-1 ring-primary/30" : "hover:bg-accent/60",
        !destination.isActive && !active && "opacity-70",
      )}
    >
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" className="size-9 shrink-0 rounded-md bg-muted object-cover" />
      ) : (
        <span className="size-9 shrink-0 rounded-md bg-muted" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("size-1.5 shrink-0 rounded-full", destination.isActive ? "bg-emerald-400" : "bg-muted-foreground/50")} title={destination.isActive ? "ظاهرة" : "مخفية"} />
          <span className={cn("block truncate text-sm", active && "font-medium")}>{destination.nameAr || destination.name}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {destination.code} · {visaTypeOptions.find((option) => option.value === destination.visaType)?.label ?? destination.visaType}
          {options > 1 ? ` · ${options} أنواع` : ""}
        </span>
      </span>
      {gaps.length ? (
        <Pill tone="warning" className="px-2">{gaps.length} نواقص</Pill>
      ) : (
        <span className="text-xs text-emerald-400" title="مكتملة">✓</span>
      )}
    </button>
  );
}

function DestinationForm({
  locale,
  current,
  isNew,
  options,
  optionCounts,
  questionsByOption,
  missing,
  gaps,
  today,
  tab,
  onTab,
  pending,
  notice,
  dirty,
  canEdit,
  canDelete,
  onDirty,
  onDiscard,
  onNotice,
  onSubmit,
  onDelete,
}: {
  locale: string;
  current: Destination | undefined;
  isNew: boolean;
  options: VisaOption[];
  optionCounts: Record<string, number>;
  questionsByOption: Record<string, { id?: string; prompt: string; promptAr: string; kind: QuestionKind; choices: { en: string; ar: string }[]; required: boolean; active: boolean }[]>;
  missing: Set<string>;
  gaps: Gap[];
  today: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  pending: boolean;
  notice: Notice | null;
  dirty: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onDirty: () => void;
  onDiscard: () => void;
  onNotice: (notice: Notice | null) => void;
  onSubmit: (fd: FormData) => void;
  onDelete: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = current ? fromDestination(current) : empty;
  const [basics, setBasics] = useState(() => basicsOf(initial));
  const [sources, setSources] = useState(() => sourcesOf(initial));
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const setB = <K extends keyof Basics>(key: K) => (value: Basics[K]) => {
    onDirty();
    setBasics((state) => ({ ...state, [key]: value }));
  };
  const setS = <K extends keyof Sources>(key: K) => (value: Sources[K]) => {
    onDirty();
    setSources((state) => ({ ...state, [key]: value }));
  };

  const issues = useMemo(() => {
    const found: Record<string, Issue & { tab: Tab }> = {};
    const slug = basics.slug.trim();
    if (!basics.name.trim()) found.name = { level: "error", message: "الاسم بالإنجليزية مطلوب.", tab: "basics" };
    if (!basics.nameAr.trim()) found.nameAr = { level: "warn", message: "بدون اسم عربي، تظهر الوجهة بالإنجليزية في الموقع العربي.", tab: "basics" };
    if (!slug) found.slug = { level: "error", message: "الرابط مطلوب.", tab: "basics" };
    else if (!slugPattern.test(slug)) found.slug = { level: "error", message: "حروف إنجليزية صغيرة وأرقام وشرطة فقط، مثل united-arab-emirates.", tab: "basics" };
    else if (current && slug !== current.slug) found.slug = { level: "warn", message: "تغيير الرابط يكسر الروابط القديمة المشاركة لهذه الصفحة.", tab: "basics" };
    if (!/^[A-Za-z]{2}$/.test(basics.code.trim())) found.code = { level: "error", message: "رمز ISO من حرفين، مثل AE.", tab: "basics" };
    if (!basics.isActive && current?.isActive) found.isActive = { level: "warn", message: "عند الحفظ تختفي الوجهة من الموقع وتعرض صفحتها 404.", tab: "basics" };
    if (sources.sourceUrl.trim() && !isHttpUrl(sources.sourceUrl.trim())) found.sourceUrl = { level: "error", message: "الرابط يبدأ بـ https://", tab: "sources" };
    if (sources.reviewedOn && !isDay(sources.reviewedOn)) found.reviewedOn = { level: "error", message: "التاريخ بصيغة YYYY-MM-DD.", tab: "sources" };
    else if (sources.reviewedOn) {
      const age = daysBetween(sources.reviewedOn, today) ?? 0;
      if (age < 0) found.reviewedOn = { level: "error", message: "تاريخ المراجعة في المستقبل.", tab: "sources" };
      else if (age > STALE_DAYS) found.reviewedOn = { level: "warn", message: `آخر مراجعة ${relativeDays(-age)}. راجع المتطلبات وحدّث التاريخ.`, tab: "sources" };
    }
    const badLine = sources.sources
      .split("\n")
      .map((line, index) => ({ line: line.trim(), index }))
      .find(({ line }) => {
        if (!line) return false;
        const [label, ...rest] = line.split("|");
        return !label?.trim() || !/^https?:\/\//.test(rest.join("|").trim());
      });
    if (badLine) found.sources = { level: "error", message: `السطر ${badLine.index + 1}: اكتب الاسم ثم | ثم رابطاً يبدأ بـ https://`, tab: "sources" };
    return found;
  }, [basics, sources, current, today]);
  const errors = errorCount(issues);
  const tabIssues = (id: Tab) => Object.values(issues).filter((issue) => issue.tab === id);
  const tabGaps = (id: Tab) => gaps.filter((gap) => gap.tab === id).length;

  const submit = () => {
    if (!canEdit || pending || !formRef.current) return;
    if (errors) {
      const first = Object.values(issues).find((issue) => issue.level === "error");
      if (first) onTab(first.tab);
      onNotice({ tone: "danger", text: "صحّح الحقول المعلّمة بالأحمر قبل الحفظ." });
      return;
    }
    onSubmit(new FormData(formRef.current));
  };
  useEditorKeys(submit, dirty);

  const pick = (kind: string) => (file: File) => {
    onDirty();
    setPicked((state) => ({ ...state, [kind]: { url: URL.createObjectURL(file), name: file.name } }));
  };

  const reviewAge = isDay(sources.reviewedOn) ? daysBetween(sources.reviewedOn, today) : null;
  const headerImage = current?.flag || current?.image;

  return (
    <form
      ref={formRef}
      onChange={onDirty}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <section id="content-editor" className="scroll-mt-4 overflow-hidden rounded-xl border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b bg-gradient-to-b from-white/[0.02] to-transparent px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headerImage} alt="" className="h-10 w-14 shrink-0 rounded-md bg-muted object-cover" />
            ) : null}
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.2em] text-primary/80">{isNew ? "وجهة جديدة" : basics.code.toUpperCase() || "—"}</p>
              <h2 data-editor-title className="mt-0.5 truncate text-lg font-semibold tracking-tight">
                {basics.nameAr || basics.name || "وجهة بدون اسم"}
                {basics.nameAr && basics.name ? <span className="ms-2 text-sm font-normal text-muted-foreground">{basics.name}</span> : null}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {current ? (current.isActive ? <Pill tone="success" dot>ظاهرة</Pill> : <Pill dot>مخفية</Pill>) : null}
            {current ? (
              <Link href={visaHref(current.slug, locale)} target="_blank" className={cn(adminGhostClass, "h-8 px-3 text-xs")}>
                فتح صفحة التأشيرة
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </header>

        {gaps.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b bg-amber-400/[0.04] px-5 py-3 text-xs sm:px-6">
            <span className="text-amber-200">ينقص هذه الوجهة:</span>
            {gaps.map((gap) => (
              <button key={gap.key} type="button" onClick={() => onTab(gap.tab)} className="rounded-full border border-amber-400/40 px-2.5 py-0.5 text-amber-100 transition-colors hover:bg-amber-400/10">
                {gap.label}
              </button>
            ))}
          </div>
        ) : current ? (
          <div className="border-b px-5 py-2.5 text-xs text-emerald-300 sm:px-6">الوجهة مكتملة: الاسمان والصور والمصدر وتاريخ مراجعة حديث.</div>
        ) : null}

        <nav className="flex gap-1 overflow-x-auto border-b px-3 py-2 sm:px-4" aria-label="أقسام الوجهة">
          {tabs.map((item) => {
            const list = tabIssues(item.id);
            const hasError = list.some((issue) => issue.level === "error");
            const marks = list.length + tabGaps(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTab(item.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === item.id ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
                {item.id === "options" && options.length ? <span className="font-mono text-[11px] opacity-70">{options.length}</span> : null}
                {marks ? <span className={cn("size-1.5 rounded-full", hasError ? "bg-rose-500" : "bg-amber-400")} /> : null}
              </button>
            );
          })}
        </nav>

        <div className="p-4 sm:p-6">
          <div className={tab === "basics" ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "hidden"}>
            <TextField name="name" label="اسم الوجهة" badge="EN" dir="ltr" value={basics.name} onChange={setB("name")} issue={issues.name} required disabled={!canEdit} placeholder="United Arab Emirates" />
            <TextField name="nameAr" label="اسم الوجهة" badge="AR" dir="rtl" value={basics.nameAr} onChange={setB("nameAr")} issue={issues.nameAr} disabled={!canEdit} placeholder="الإمارات" />
            <TextField
              name="slug"
              label="الرابط"
              dir="ltr"
              value={basics.slug}
              onChange={(value) => setB("slug")(value.toLowerCase().replace(/\s+/g, "-"))}
              issue={issues.slug}
              required
              disabled={!canEdit}
              hint={<span dir="ltr">evisa.tv/{locale}/visa/{basics.slug.trim() || "…"}</span>}
            />
            <TextField
              name="code"
              label="رمز الدولة"
              dir="ltr"
              value={basics.code}
              onChange={(value) => setB("code")(value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))}
              issue={issues.code}
              required
              maxLength={2}
              disabled={!canEdit}
              hint="رمز ISO من حرفين. يربط الفعاليات والأعلام بالوجهة."
            />
            <PairedSelect label="المنطقة" name="region" value={initial.region} options={withCurrent(regionOptions, initial.region)} />
            <PairedSelect label="منافذ الدخول" name="acceptedAt" value={initial.acceptedAt} options={withCurrent(portOptions, initial.acceptedAt)} />
            <FieldShell label="ترتيب الظهور" hint="الأصغر يظهر أولاً في الصفحة الرئيسية.">
              <input name="sortOrder" type="number" dir="ltr" defaultValue={String(initial.sortOrder)} disabled={!canEdit} className={adminInputClass} />
            </FieldShell>
            <div className="hidden sm:block" />
            <Toggle
              name="isActive"
              label="ظاهرة في الموقع"
              description="عند الإيقاف تختفي الوجهة من البحث والرئيسية وتعرض صفحتها 404."
              checked={basics.isActive}
              onChange={setB("isActive")}
              tone="success"
              disabled={!canEdit}
            />
            <Toggle
              name="visaRequired"
              label="التأشيرة مطلوبة"
              description="أوقفه للدول التي يدخلها حامل الجواز المصري بدون تأشيرة."
              checked={basics.visaRequired}
              onChange={setB("visaRequired")}
              disabled={!canEdit}
            />
            {issues.isActive ? <p className="text-xs text-amber-300 sm:col-span-2">{issues.isActive.message}</p> : null}
          </div>

          <div className={tab === "options" ? "" : "hidden"}>
            <VisaOptionsEditor locale={locale} destinationSlug={current?.slug ?? ""} options={options} counts={optionCounts} questionsByOption={questionsByOption} onDirty={onDirty} />
          </div>

          <div className={tab === "media" ? "" : "hidden"}>
            {missing.size > 0 && (
              <div className="mb-4">
                <AdminNotice tone="warning">
                  صور هذه الوجهة غير محفوظة في قاعدة البيانات، لذلك تظهر البطاقة فارغة في الموقع. أعد رفع كل ملف عليه تنبيه «غير محفوظ» ثم احفظ، وبعدها تبقى الملفات بعد أي نشر.
                </AdminNotice>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaTile title="صورة البطاقة" hint="تظهر في شبكة الرئيسية. 4:3 تقريباً." name="image" fileName="imageFile" accept="image/png,image/jpeg,image/webp" value={initial.image ?? ""} picked={picked.image} missing={missing.has("image")} disabled={!canEdit} onPick={pick("image")} />
              <MediaTile title="صورة الغلاف" hint="أعلى صفحة التأشيرة. عريضة 16:9." name="heroImage" fileName="heroFile" accept="image/png,image/jpeg,image/webp" value={initial.heroImage ?? ""} picked={picked.hero} missing={missing.has("hero")} disabled={!canEdit} onPick={pick("hero")} />
              <MediaTile title="العلم" hint="يظهر بجوار اسم الدولة." name="flag" fileName="flagFile" accept="image/png,image/jpeg,image/webp" value={initial.flag ?? ""} picked={picked.flag} contain missing={missing.has("flag")} disabled={!canEdit} onPick={pick("flag")} />
              <MediaTile title="فيديو الوجهة" hint="اختياري. MP4 أو WebM قصير بدون صوت." name="videoUrl" fileName="videoFile" accept="video/mp4,video/webm" value={initial.videoUrl ?? ""} picked={picked.video} video missing={missing.has("video")} actionLabel="رفع فيديو" disabled={!canEdit} onPick={pick("video")} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">ارفع ملفاً أو الصق رابطاً. الملف المرفوع يُحفظ في قاعدة البيانات عند الحفظ ويبقى بعد النشر.</p>
          </div>

          <div className={tab === "sources" ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "hidden"}>
            <FieldShell label="المستندات المطلوبة" span hint="القائمة الافتراضية لكل أنواع التأشيرة، ما لم يحدد النوع مستنداته الخاصة.">
              <DocumentChecklist name="documents" selected={initial.documents} />
            </FieldShell>
            <TextField name="sourceUrl" label="رابط المصدر الرسمي" dir="ltr" value={sources.sourceUrl} onChange={setS("sourceUrl")} issue={issues.sourceUrl} placeholder="https://" disabled={!canEdit} hint="موقع الحكومة أو السفارة الذي راجعنا منه المتطلبات." />
            <FieldShell
              label="تاريخ مراجعة المتطلبات"
              issue={issues.reviewedOn}
              hint={reviewAge != null ? `${formatDay(sources.reviewedOn)} · ${relativeDays(-reviewAge)}` : "لم تُسجَّل مراجعة بعد."}
            >
              <div className="flex gap-2">
                <input
                  name="reviewedOn"
                  type="date"
                  value={sources.reviewedOn}
                  onChange={(event) => setS("reviewedOn")(event.target.value)}
                  disabled={!canEdit}
                  className={cn(adminInputClass, issues.reviewedOn?.level === "error" ? "border-rose-500/70" : issues.reviewedOn ? "border-amber-400/60" : "")}
                />
                <button type="button" disabled={!canEdit || sources.reviewedOn === today} onClick={() => setS("reviewedOn")(today)} className={cn(adminGhostClass, "mt-1.5 h-10 shrink-0 px-3 text-xs")}>
                  راجعتها اليوم
                </button>
              </div>
            </FieldShell>
            <FieldShell label="المدن" span hint="مفصولة بفاصلة. تُستخدم في البحث وأوصاف الصفحة.">
              <input name="cities" defaultValue={initial.cities.join(", ")} disabled={!canEdit} className={adminInputClass} placeholder="Dubai, Abu Dhabi" />
            </FieldShell>
            <TextField
              name="sources"
              label="المصادر الرسمية"
              dir="ltr"
              multiline
              rows={4}
              span
              value={sources.sources}
              onChange={setS("sources")}
              issue={issues.sources}
              disabled={!canEdit}
              placeholder="ICP | https://icp.gov.ae"
              hint="سطر لكل مصدر: الاسم | الرابط"
            />
            <TextField
              name="rejectionReasons"
              label="أسباب الرفض الشائعة"
              multiline
              rows={5}
              span
              value={sources.rejectionReasons}
              onChange={setS("rejectionReasons")}
              disabled={!canEdit}
              hint="سطر لكل سبب: العنوان | التفاصيل | العنوان بالعربية | التفاصيل بالعربية"
            />
          </div>
        </div>
      </section>

      <EditorBar
        dirty={dirty}
        pending={pending}
        message={
          notice && (!dirty || notice.tone === "danger") ? (
            <NoticeText notice={notice} />
          ) : dirty && errors ? (
            <span>
              <span className="text-primary">تغييرات غير محفوظة</span>
              <span className="text-rose-300"> · {errors} حقل يحتاج تصحيح</span>
            </span>
          ) : isNew && !dirty ? (
            <span className="text-muted-foreground">وجهة جديدة. أدخل الاسم والرابط والرمز ثم احفظ.</span>
          ) : undefined
        }
      >
        {current && canDelete ? (
          <ConfirmButton onConfirm={onDelete} disabled={pending}>
            حذف الوجهة
          </ConfirmButton>
        ) : null}
        <button type="button" disabled={!dirty || pending} onClick={onDiscard} className={adminGhostClass}>
          تجاهل
        </button>
        <button type="submit" disabled={!canEdit || pending || errors > 0 || (!dirty && !isNew)} className={adminPrimaryClass}>
          {pending ? "جارٍ الحفظ…" : isNew ? "إضافة الوجهة" : "حفظ الوجهة"}
        </button>
      </EditorBar>
    </form>
  );
}

function MediaTile({
  title,
  hint,
  name,
  fileName,
  accept,
  value,
  picked,
  onPick,
  video,
  contain,
  missing,
  disabled,
  actionLabel = "استبدال",
}: {
  title: string;
  hint: string;
  name: string;
  fileName: string;
  accept: string;
  value: string;
  picked?: Picked;
  onPick: (file: File) => void;
  video?: boolean;
  contain?: boolean;
  missing?: boolean;
  disabled?: boolean;
  actionLabel?: string;
}) {
  const [url, setUrl] = useState(value);
  const src = picked?.url || url;
  const label = picked?.name || fileLabel(url);
  const warn = missing && !picked;
  const badUrl = url.trim() && !isLink(url.trim());
  return (
    <article className={cn("rounded-xl border bg-background/40 p-4", warn ? "border-amber-400/60" : picked ? "border-primary/40" : "")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            {title}
            {warn ? <Pill tone="warning" className="px-2 py-0 text-[10px]">غير محفوظ</Pill> : null}
            {picked ? <Pill tone="info" className="px-2 py-0 text-[10px]">يُرفع عند الحفظ</Pill> : null}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
        <label className={cn(adminGhostClass, "h-8 shrink-0 cursor-pointer px-3 text-xs", disabled && "pointer-events-none opacity-50")}>
          <Upload className="size-3.5" />
          {src ? actionLabel : "رفع"}
          <input
            type="file"
            name={fileName}
            accept={accept}
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(file);
            }}
          />
        </label>
      </div>
      {src && video ? (
        <video src={src} className="mt-3 h-28 w-full rounded-lg bg-muted object-cover" muted playsInline />
      ) : src && contain ? (
        <div className="mt-3 flex h-28 items-center justify-center rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-14 w-24 rounded-md object-cover shadow" />
        </div>
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="mt-3 h-28 w-full rounded-lg bg-muted object-cover" />
      ) : (
        <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
          {video ? <Play className="size-5" /> : <Upload className="size-5" />}
        </div>
      )}
      <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground" dir="ltr">{label}</p>
      <input
        name={name}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        dir="ltr"
        disabled={disabled}
        aria-label={`رابط ${title}`}
        placeholder="https://… أو /images/…"
        className={cn(
          "mt-2 h-9 w-full rounded-lg border bg-background px-3 text-xs outline-none focus-visible:border-primary",
          badUrl ? "border-rose-500/70" : "border-input",
        )}
      />
      {badUrl ? <p className="mt-1 text-[11px] text-rose-400">رابط غير صالح.</p> : null}
    </article>
  );
}
