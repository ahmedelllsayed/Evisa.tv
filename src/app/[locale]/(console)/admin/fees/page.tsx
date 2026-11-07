import Link from "next/link";
import { AdminEmpty, AdminPage, AdminPanel, Pill, Segmented, StatTile, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { egp, relativeTime, shortDateTime } from "@/components/admin/format";
import { requireAdmin } from "@/lib/auth";
import { iso, num, sql } from "@/lib/data/db";
import { href, visaHref } from "@/lib/href";
import type { Page } from "@/lib/page";
import { cn } from "@/lib/utils";

export const metadata = { title: "سجل الرسوم" };

type Change = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  option: string | null;
  oldTotal: number;
  newTotal: number;
  reason: string | null;
  actor: string | null;
  changedAt: string;
};

async function listChanges(): Promise<Change[]> {
  const rows = await sql(
    `select f.*, d.slug, d.name as destination_name, d.name_ar as destination_name_ar, o.label_ar as option_label_ar
     from fee_changes f
     join destinations d on d.id = f.destination_id
     left join visa_options o on o.id = f.visa_option_id
     order by f.changed_at desc`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.destination_name),
    nameAr: (r.destination_name_ar as string) ?? null,
    option: (r.option_label_ar as string) || (r.option_label as string) || null,
    oldTotal: num(r.old_total),
    newTotal: num(r.new_total),
    reason: (r.reason as string) ?? null,
    actor: (r.actor_email as string) ?? null,
    changedAt: iso(r.changed_at),
  }));
}

function reasonLabel(reason: string | null) {
  if (!reason) return "—";
  return reason === "Fee updated" ? "تحديث الرسوم" : reason;
}

function Delta({ from, to }: { from: number; to: number }) {
  const delta = to - from;
  const share = from > 0 ? (delta / from) * 100 : null;
  const tone = delta > 0 ? "text-rose-300" : delta < 0 ? "text-emerald-300" : "text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-xs tabular-nums", tone)} dir="ltr">
      <span aria-hidden>{delta > 0 ? "▲" : delta < 0 ? "▼" : "•"}</span>
      {delta > 0 ? "+" : delta < 0 ? "−" : ""}
      {egp(Math.abs(delta))}
      {share != null ? <span className="opacity-75">({delta > 0 ? "+" : delta < 0 ? "−" : ""}{Math.abs(share).toFixed(1)}%)</span> : null}
    </span>
  );
}

export default async function AdminFeesPage({ params, searchParams }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const query = await searchParams;
  const filter = typeof query.destination === "string" ? query.destination : "";
  const all = await listChanges();
  const now = new Date();
  const changes = filter ? all.filter((change) => change.slug === filter) : all;
  const destinations = [...new Map(all.map((change) => [change.slug, change])).values()];
  const focus = filter ? destinations.find((change) => change.slug === filter) : undefined;
  const ups = changes.filter((change) => change.newTotal > change.oldTotal).length;
  const downs = changes.filter((change) => change.newTotal < change.oldTotal).length;
  const net = changes.reduce((sum, change) => sum + (change.newTotal - change.oldTotal), 0);
  const base = href("/admin/fees", locale);
  const title = (change: Change) => change.nameAr || change.name;

  return (
    <AdminPage
      title="سجل الرسوم"
      description="يُكتب السجل تلقائياً عند حفظ رسوم وجهة بقيمة مختلفة. لا يُعدَّل من هنا حتى يبقى مطابقاً لما دفعه العملاء في كل فترة."
      action={
        <Link href={href("/admin/destinations", locale)} className="text-sm text-primary hover:underline">
          تعديل رسوم وجهة ←
        </Link>
      }
    >
      {all.length === 0 ? (
        <AdminEmpty title="لا توجد تغييرات على الرسوم بعد">احفظ وجهة برسوم مختلفة ليظهر السطر هنا.</AdminEmpty>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="التغييرات" value={changes.length} note={focus ? `لوجهة ${title(focus)}` : `على ${destinations.length} وجهة`} />
            <StatTile label="زيادات" value={ups} tone={ups ? "danger" : "neutral"} note="العميل يدفع أكثر" />
            <StatTile
              label="صافي التغيير"
              value={<span dir="ltr">{net > 0 ? "+" : net < 0 ? "−" : ""}{egp(Math.abs(net))}</span>}
              tone={net > 0 ? "danger" : net < 0 ? "success" : "neutral"}
              note={`${downs} تخفيض`}
            />
          </div>

          {destinations.length > 1 ? (
            <Segmented
              items={[
                { href: base, label: "كل الوجهات", active: !filter, count: all.length },
                ...destinations.map((change) => ({
                  href: `${base}?destination=${encodeURIComponent(change.slug)}`,
                  label: title(change),
                  active: filter === change.slug,
                  count: all.filter((item) => item.slug === change.slug).length,
                })),
              ]}
            />
          ) : null}

          <AdminPanel
            title="التغييرات"
            hint="الأحدث أولاً. الأحمر زيادة على العميل والأخضر تخفيض."
            flush
            action={filter ? <Link href={base} className="text-xs text-primary hover:underline">إزالة الفلتر</Link> : null}
          >
            {changes.length === 0 ? (
              <div className="p-5">
                <AdminEmpty title="لا تغييرات لهذه الوجهة">
                  <Link href={base} className="text-primary hover:underline">عرض كل الوجهات</Link>
                </AdminEmpty>
              </div>
            ) : (
              <>
                <ol className="divide-y md:hidden">
                  {changes.map((change) => (
                    <li key={change.id} className="px-4 py-3.5 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`${base}?destination=${encodeURIComponent(change.slug)}`} className="font-medium hover:text-primary">
                            {title(change)}
                          </Link>
                          {change.option ? <p className="mt-0.5 text-xs text-muted-foreground">{change.option}</p> : null}
                        </div>
                        <Delta from={change.oldTotal} to={change.newTotal} />
                      </div>
                      <p className="mt-2 font-mono text-xs tabular-nums" dir="ltr">
                        <span className="text-muted-foreground line-through decoration-muted-foreground/50">{egp(change.oldTotal)}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span>{egp(change.newTotal)}</span>
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {reasonLabel(change.reason)} · <span dir="ltr">{shortDateTime(change.changedAt)}</span>
                        {change.actor ? <> · <span dir="ltr">{change.actor}</span></> : null}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className={adminThClass}>الوجهة</th>
                        <th className={adminThClass}>الإجمالي</th>
                        <th className={adminThClass}>الفرق</th>
                        <th className={adminThClass}>السبب</th>
                        <th className={adminThClass}>بواسطة</th>
                        <th className={adminThClass}>الوقت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((change) => (
                        <tr key={change.id} className={adminTrClass}>
                          <td className={adminTdClass}>
                            <Link href={`${base}?destination=${encodeURIComponent(change.slug)}`} className="font-medium hover:text-primary">
                              {title(change)}
                            </Link>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {change.option ?? "السعر الأساسي"}
                              {" · "}
                              <Link href={visaHref(change.slug, locale)} target="_blank" className="hover:text-primary">
                                الصفحة ↗
                              </Link>
                            </span>
                          </td>
                          <td className={cn(adminTdClass, "whitespace-nowrap font-mono text-xs tabular-nums")} dir="ltr">
                            <span className="text-muted-foreground line-through decoration-muted-foreground/50">{egp(change.oldTotal)}</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className="text-foreground">{egp(change.newTotal)}</span>
                          </td>
                          <td className={cn(adminTdClass, "whitespace-nowrap")}>
                            <Delta from={change.oldTotal} to={change.newTotal} />
                          </td>
                          <td className={adminTdClass}>
                            {change.reason ? <Pill>{reasonLabel(change.reason)}</Pill> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className={cn(adminTdClass, "max-w-[14rem] truncate text-xs")} dir="ltr">
                            {change.actor ?? <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className={cn(adminTdClass, "whitespace-nowrap text-xs")}>
                            <span dir="ltr">{shortDateTime(change.changedAt)}</span>
                            <span className="mt-0.5 block text-muted-foreground">{relativeTime(change.changedAt, now)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </AdminPanel>
        </>
      )}
    </AdminPage>
  );
}
