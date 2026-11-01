"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Play, Plus, Search, Upload } from "lucide-react";
import { adminDeleteDestination, adminSaveDestinationForm } from "@/app/actions/admin";
import { PairedSelect } from "@/components/admin/destination-fields";
import { VisaOptionsEditor } from "@/components/admin/visa-options-editor";
import { DocumentChecklist } from "@/components/admin/document-checklist";
import { AdminError, AdminField, AdminPage, adminDangerClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { DestinationInput } from "@/lib/data/catalog";
import { portOptions, regionOptions, visaTypeOptions, withCurrent } from "@/lib/destination-fields";
import { visaHref } from "@/lib/href";
import type { Destination, VisaOption } from "@/lib/types";

type Tab = "basics" | "options" | "media" | "sources";
type Picked = { url: string; name: string };

const empty: DestinationInput = {
  name: "",
  nameAr: "",
  slug: "",
  code: "",
  region: "",
  visaRequired: true,
  visaType: "e-visa",
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
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  };
}

function fileLabel(url: string | null | undefined) {
  if (!url) return "لا يوجد ملف";
  const clean = url.split("?")[0] ?? url;
  return clean.split("/").pop() || clean;
}

function missingMediaKinds(destination: Destination | undefined, stored: { destination_id: string; kind: string }[]) {
  const missing = new Set<string>();
  if (!destination) return missing;
  const have = new Set(stored.filter((row) => row.destination_id === destination.id).map((row) => row.kind));
  const urls: Record<string, string | null | undefined> = {
    image: destination.image,
    hero: destination.heroImage,
    flag: destination.flag,
    video: destination.videoUrl,
  };
  for (const kind of ["image", "hero", "flag", "video"]) {
    if ((urls[kind] ?? "").startsWith("/destination-media/") && !have.has(kind)) missing.add(kind);
  }
  return missing;
}

export function DestinationEditor({
  locale,
  destinations,
  storedMedia = [],
  options = [],
  optionCounts = {},
}: {
  locale: string;
  destinations: Destination[];
  storedMedia?: { destination_id: string; kind: string }[];
  options?: VisaOption[];
  optionCounts?: Record<string, number>;
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string>(destinations[0]?.id ?? "new");
  const [tab, setTab] = useState<Tab>(destinations[0] ? "media" : "basics");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"all" | "visible" | "hidden">("all");
  const [picked, setPicked] = useState<Record<string, Picked>>({});
  const [formKey, setFormKey] = useState(0);
  const current = destinations.find((d) => d.id === selected);
  const missing = useMemo(() => missingMediaKinds(current, storedMedia), [current, storedMedia]);
  const initial = current ? fromDestination(current) : empty;
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return destinations.filter((destination) => {
      if (visibility === "visible" && !destination.isActive) return false;
      if (visibility === "hidden" && destination.isActive) return false;
      if (!needle) return true;
      return `${destination.name} ${destination.slug} ${destination.code}`.toLowerCase().includes(needle);
    });
  }, [destinations, query, visibility]);

  const currentOptions = current ? options.filter((option) => option.destinationId === current.id) : [];

  function choose(id: string) {
    setSelected(id);
    setTab(id === "new" ? "basics" : "media");
    setSaved(false);
    setError(null);
    setPicked({});
  }

  return (
    <AdminPage title="الوجهات" description="ابحث عن صفحة تأشيرة، وعدّل بياناتها، واستبدل الصور والفيديو من مساحة واحدة.">
      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-line bg-white p-5 lg:w-80">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-ink" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث بالاسم أو الرابط أو الرمز"
              className="h-10 w-full rounded-lg border border-line-strong bg-white pr-3 pl-9 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(
              [
                ["all", "الكل"],
                ["visible", "الظاهرة"],
                ["hidden", "المخفية"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setVisibility(value)}
                className={`rounded-full border px-3 py-1 text-sm ${visibility === value ? "border-brand bg-brand text-white" : "border-line bg-white text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => choose("new")} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-white">
            <Plus className="size-4" />
            إضافة وجهة
          </button>
          <div className="mt-4 max-h-[32rem] space-y-1.5 overflow-y-auto">
            {shown.map((destination) => {
              const active = destination.id === selected;
              return (
                <button
                  key={destination.id}
                  type="button"
                  onClick={() => choose(destination.id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left ${active ? "bg-brand-50" : "hover:bg-surface"}`}
                >
                  {destination.image ? (
                    <img src={destination.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-lg bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${active ? "text-brand-700" : "text-ink"}`}>{destination.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-ink">
                      {destination.code} · {visaTypeOptions.find((option) => option.value === destination.visaType)?.label ?? destination.visaType}
                    </span>
                  </span>
                  {destination.isActive ? (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      ظاهرة
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-ink">مخفية</span>
                  )}
                </button>
              );
            })}
            {shown.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted-ink">لا توجد وجهات مطابقة.</p>}
          </div>
        </aside>

        <section className="w-full min-w-0 flex-1 rounded-2xl border border-line bg-white p-5">
          <form
            key={`${selected}-${formKey}-${current?.updatedAt ?? "new"}`}
            action={(fd) => {
              setError(null);
              setSaved(false);
              start(async () => {
                const result = await adminSaveDestinationForm(locale, selected === "new" ? null : selected, fd);
                if (!result.ok) setError(result.error);
                else {
                  setSaved(true);
                  setPicked({});
                  setFormKey((value) => value + 1);
                  if (selected === "new") setSelected(result.id);
                }
              });
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{current?.name || "وجهة جديدة"}</h2>
                <p className="mt-0.5 text-xs text-muted-ink">{current?.code || "—"}</p>
              </div>
              {current && (
                <Link href={visaHref(current.slug, locale)} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  فتح صفحة التأشيرة
                  <ExternalLink className="size-4" />
                </Link>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-4">
              {(
                [
                  ["basics", "الأساسيات"],
                  ["options", "أنواع التأشيرة"],
                  ["media", "الوسائط"],
                  ["sources", "المصادر"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-4 py-2 text-sm ${tab === value ? "bg-brand-50 font-medium text-brand-700" : "bg-surface text-muted-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={tab === "basics" ? "mt-4 grid gap-3 sm:grid-cols-2" : "hidden"}>
              <Field name="name" label="الاسم" defaultValue={initial.name} />
              <Field name="nameAr" label="الاسم بالعربية" defaultValue={initial.nameAr ?? ""} />
              <Field name="slug" label="الرابط" defaultValue={initial.slug} />
              <Field name="code" label="رمز الدولة" defaultValue={initial.code} />
              <PairedSelect label="المنطقة" name="region" value={initial.region} options={withCurrent(regionOptions, initial.region)} />
              <PairedSelect label="منافذ الدخول" name="acceptedAt" value={initial.acceptedAt} options={withCurrent(portOptions, initial.acceptedAt)} />
              <Field name="sortOrder" label="ترتيب الظهور" type="number" defaultValue={String(initial.sortOrder)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visaRequired" defaultChecked={initial.visaRequired} /> التأشيرة مطلوبة
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={initial.isActive} /> ظاهرة في الموقع
              </label>
            </div>

            <div className={tab === "options" ? "mt-4" : "hidden"}>
              <VisaOptionsEditor
                key={`${selected}-${formKey}`}
                locale={locale}
                destinationSlug={current?.slug ?? ""}
                options={currentOptions}
                counts={optionCounts}
              />
            </div>

            <div className={tab === "media" ? "mt-4" : "hidden"}>
              {missing.size > 0 && (
                <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  صور هذه الوجهة غير محفوظة في قاعدة البيانات، لذلك البطاقة تظهر فارغة في الموقع. أعد رفع كل ملف عليه تنبيه «غير محفوظ» ثم اضغط حفظ. بعد ذلك تبقى الملفات بعد أي نشر.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <MediaTile
                  title="صورة البطاقة"
                  name="image"
                  fileName="imageFile"
                  accept="image/png,image/jpeg,image/webp"
                  value={initial.image ?? ""}
                  picked={picked.image}
                  missing={missing.has("image")}
                  onPick={(file) => setPicked((current) => ({ ...current, image: { url: URL.createObjectURL(file), name: file.name } }))}
                />
                <MediaTile
                  title="صورة الغلاف"
                  name="heroImage"
                  fileName="heroFile"
                  accept="image/png,image/jpeg,image/webp"
                  value={initial.heroImage ?? ""}
                  picked={picked.hero}
                  missing={missing.has("hero")}
                  onPick={(file) => setPicked((current) => ({ ...current, hero: { url: URL.createObjectURL(file), name: file.name } }))}
                />
                <MediaTile
                  title="العلم"
                  name="flag"
                  fileName="flagFile"
                  accept="image/png,image/jpeg,image/webp"
                  value={initial.flag ?? ""}
                  picked={picked.flag}
                  contain
                  missing={missing.has("flag")}
                  onPick={(file) => setPicked((current) => ({ ...current, flag: { url: URL.createObjectURL(file), name: file.name } }))}
                />
                <MediaTile
                  title="فيديو الوجهة"
                  name="videoUrl"
                  fileName="videoFile"
                  accept="video/mp4,video/webm"
                  value={initial.videoUrl ?? ""}
                  picked={picked.video}
                  video
                  missing={missing.has("video")}
                  actionLabel="رفع فيديو"
                  onPick={(file) => setPicked((current) => ({ ...current, video: { url: URL.createObjectURL(file), name: file.name } }))}
                />
              </div>
              <p className="mt-4 text-sm text-muted-ink">ارفع الصورة أو الفيديو، أو الصق رابطاً. الملف المرفوع يُحفظ في قاعدة البيانات ويبقى بعد النشر.</p>
            </div>

            <div className={tab === "sources" ? "mt-4 grid gap-3" : "hidden"}>
              <fieldset className="text-sm">
                <legend className="font-medium">المستندات المطلوبة</legend>
                <DocumentChecklist name="documents" selected={initial.documents} />
              </fieldset>
              <label className="text-sm">
                المدن (مفصولة بفاصلة)
                <input name="cities" defaultValue={initial.cities.join(", ")} className={adminInputClass} />
              </label>
              <label className="text-sm">
                المصادر الرسمية (سطر: الاسم | الرابط)
                <textarea name="sources" defaultValue={initial.sources.map((source) => `${source.label} | ${source.url}`).join("\n")} className={adminTextareaClass} />
              </label>
              <label className="text-sm">
                أسباب الرفض (سطر: العنوان | التفاصيل | العنوان بالعربية | التفاصيل بالعربية)
                <textarea
                  name="rejectionReasons"
                  defaultValue={initial.rejectionReasons.map((reason) => [reason.title, reason.body, reason.titleAr ?? "", reason.bodyAr ?? ""].filter((part, index) => part || index < 2).join(" | ")).join("\n")}
                  className={adminTextareaClass}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button disabled={pending} className={adminPrimaryClass}>
                حفظ
              </button>
              {selected !== "new" && (
                <button
                  type="button"
                  disabled={pending}
                  className={adminDangerClass}
                  onClick={() =>
                    start(async () => {
                      const result = await adminDeleteDestination(locale, selected);
                      if (!result.ok) setError(result.error);
                      else choose("new");
                    })
                  }
                >
                  حذف
                </button>
              )}
              {saved && <p className="text-sm text-brand">تم حفظ الوجهة.</p>}
            </div>
            {error && (
              <div className="mt-3">
                <AdminError>{error}</AdminError>
              </div>
            )}
          </form>
        </section>
      </div>
    </AdminPage>
  );
}

function Field(props: { name: string; label: string; defaultValue: string; type?: string; required?: boolean }) {
  return <AdminField {...props} />;
}

function MediaTile({
  title,
  name,
  fileName,
  accept,
  value,
  picked,
  onPick,
  video,
  contain,
  missing,
  actionLabel = "استبدال",
}: {
  title: string;
  name: string;
  fileName: string;
  accept: string;
  value: string;
  picked?: Picked;
  onPick: (file: File) => void;
  video?: boolean;
  contain?: boolean;
  missing?: boolean;
  actionLabel?: string;
}) {
  const src = picked?.url || value;
  const label = picked?.name || fileLabel(value);
  return (
    <article className={`rounded-2xl border bg-white p-4 ${missing && !picked ? "border-amber-400" : "border-line"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">
          {title}
          {missing && !picked ? <span className="ms-2 text-xs font-normal text-amber-700">غير محفوظ</span> : null}
        </h3>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink">
          <Upload className="size-3.5" />
          {actionLabel}
          <input
            type="file"
            name={fileName}
            accept={accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onPick(file);
            }}
          />
        </label>
      </div>
      {src && video ? (
        <video src={src} className="mt-3 h-24 w-full rounded-xl bg-surface object-cover" muted playsInline />
      ) : src && contain ? (
        <div className="mt-3 flex h-24 items-center justify-center rounded-xl bg-surface">
          <img src={src} alt="" className="h-12 w-20 rounded-lg object-cover" />
        </div>
      ) : src ? (
        <img src={src} alt="" className="mt-3 h-24 w-full rounded-xl object-cover" />
      ) : (
        <div className="mt-3 flex h-24 items-center justify-center rounded-xl border border-dashed border-line bg-surface text-muted-ink">
          {video ? <Play className="size-5" /> : <Upload className="size-5" /> }
        </div>
      )}
      <p className="mt-2 truncate text-xs text-muted-ink">{label}</p>
      <input name={name} defaultValue={value} aria-label={`رابط ${title}`} className="mt-2 h-9 w-full rounded-lg border border-line-strong bg-white px-3 text-xs outline-none focus:border-brand" />
    </article>
  );
}
