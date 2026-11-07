import Link from "next/link";
import { ApplicationTable } from "@/components/admin/application-table";
import { AdminPage, AdminPanel, Segmented, adminGhostClass } from "@/components/admin/chrome";
import { sortByUrgency } from "@/components/admin/applications/model";
import { AutoAssignButton } from "@/components/admin/applications/auto-assign";
import { DocLegend } from "@/components/admin/applications/parts";
import { requireAdmin } from "@/lib/auth";
import { applicationSignals, databaseNow } from "@/lib/data/admin-applications";
import { listAllApplications, opsCounts, queueCounts, type QueueFilter } from "@/lib/data/applications";
import { listUsers } from "@/lib/data/users";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

const tabs: { id: QueueFilter; label: string; hint: string; empty: string }[] = [
  {
    id: "attention",
    label: "يحتاج إجراء",
    hint: "كل طلب مفتوح فيه سبب للتدخل: متأخر، غير معيّن، مستندات للمراجعة، دفعة أو استرداد يحتاج قراراً.",
    empty: "لا يوجد طلب يحتاج تدخلاً الآن.",
  },
  { id: "mine", label: "طلباتي", hint: "الطلبات المفتوحة المعيّنة لك.", empty: "لا توجد طلبات مفتوحة معيّنة لك." },
  { id: "unassigned", label: "غير معيّن", hint: "طلبات خرجت من المسودة ولا يتابعها أحد بعد.", empty: "كل الطلبات لها مسؤول." },
  { id: "late", label: "متأخر", hint: "تجاوزت الموعد المضمون للعميل ولم تُغلق بعد.", empty: "لا يوجد طلب متأخر." },
  { id: "documents", label: "مستندات", hint: "فيها مستند بانتظار المراجعة أو مستند مرفوض ينتظر بديلاً من العميل.", empty: "لا توجد مستندات معلّقة." },
  { id: "paid_review", label: "مدفوع بانتظار البدء", hint: "دُفعت وما زالت في حالة «مقدّم». انقلها إلى المراجعة.", empty: "لا يوجد طلب مدفوع ينتظر البدء." },
  { id: "followup", label: "متابعة العميل", hint: "مسودات وطلبات بانتظار الدفع، أو طلبات ينقصها مستند من العميل. الأقدم أولاً.", empty: "لا يوجد عميل يحتاج متابعة." },
];

export const metadata = { title: "الطابور" };

export default async function AdminQueuePage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireAdmin(locale);
  const requested = typeof sp.filter === "string" ? sp.filter : "attention";
  const tab = tabs.find((item) => item.id === requested) ?? tabs[0];
  const [apps, counts, ops, now, users] = await Promise.all([
    listAllApplications({ queue: tab.id, assigneeId: user.id, limit: 100 }),
    queueCounts(user.id),
    opsCounts(),
    databaseNow(),
    listUsers(),
  ]);
  const signals = await applicationSignals(apps.map((app) => app.id));
  const rows = sortByUrgency(apps, signals, now);
  const names = Object.fromEntries(users.map((person) => [person.id, person.fullName || person.email]));
  const countFor: Record<QueueFilter, number> = {
    attention: ops.attention,
    mine: counts.mine,
    unassigned: counts.unassigned,
    late: counts.late,
    documents: counts.documents,
    paid_review: counts.paidReview,
    followup: counts.followup,
  };
  const late = rows.filter((row) => row.sla.state === "late").length;
  const soon = rows.filter((row) => row.sla.state === "soon").length;
  const docsWaiting = apps.reduce((sum, app) => sum + (signals[app.id]?.uploaded ?? 0), 0);
  const total = countFor[tab.id];

  return (
    <AdminPage
      title="الطابور"
      description="ما يحتاج إجراءً الآن، مرتباً حسب الأولوية: المتأخر أولاً، ثم ما يحتاج قراراً، ثم الأقرب موعداً."
      action={
        <>
          <AutoAssignButton locale={locale} />
          <Link href={href("/admin/applications", locale)} className={adminGhostClass}>
            كل الطلبات
          </Link>
        </>
      }
    >
      <Segmented
        items={tabs.map((item) => ({
          href: href(item.id === "attention" ? "/admin/queue" : `/admin/queue?filter=${item.id}`, locale),
          label: item.label,
          active: item.id === tab.id,
          count: countFor[item.id],
        }))}
      />

      <AdminPanel
        flush
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {tab.label}
            <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{total}</span>
          </span>
        }
        hint={tab.hint}
        action={<DocLegend />}
      >
        {rows.length ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b bg-background/40 px-5 py-2.5 text-xs text-muted-foreground">
            <span>
              <span className={late ? "font-mono font-semibold text-rose-300 tabular-nums" : "font-mono tabular-nums"}>{late}</span> متأخر
            </span>
            <span>
              <span className={soon ? "font-mono font-semibold text-amber-200 tabular-nums" : "font-mono tabular-nums"}>{soon}</span> موعده خلال 24 ساعة
            </span>
            <span>
              <span className={docsWaiting ? "font-mono font-semibold text-amber-200 tabular-nums" : "font-mono tabular-nums"}>{docsWaiting}</span> مستند بانتظار المراجعة
            </span>
            {total > rows.length ? <span className="ms-auto">يُعرض أول {rows.length} من {total}</span> : null}
          </div>
        ) : null}
        <ApplicationTable locale={locale} rows={rows} signals={signals} names={names} currentUserId={user.id} empty={tab.empty} />
      </AdminPanel>
    </AdminPage>
  );
}
