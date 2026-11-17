import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, AdminPanel, Pill, StatTile, adminGhostClass } from "@/components/admin/chrome";
import { CampaignActions } from "@/components/admin/marketing/campaign-actions";
import { CampaignComposer } from "@/components/admin/marketing/campaign-composer";
import { marketingAccess } from "@/lib/data/marketing/access";
import { getCampaign, listCampaignRecipients } from "@/lib/data/marketing/campaigns";
import { cairoLocal, composerData } from "@/lib/data/marketing/composer";
import { campaignOutcome } from "@/lib/data/marketing/reports";
import { href } from "@/lib/href";
import { campaignStatusLabels, channelLabels, marketingDate, messageStatusLabels, money, skipReasons } from "@/lib/marketing/labels";
import type { Page } from "@/lib/page";

export const metadata = { title: "الحملة" };

export default async function CampaignPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  const access = await marketingAccess(locale);
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const back = <Link href={href("/admin/marketing/campaigns", locale)} className={adminGhostClass}>رجوع</Link>;

  if (campaign.status === "draft" || campaign.status === "scheduled") {
    const data = await composerData();
    return (
      <AdminPage
        title={campaign.name}
        eyebrow={campaign.status === "scheduled" ? `مجدولة · ${marketingDate(campaign.scheduledAt)}` : "مسودة"}
        action={
          <>
            <CampaignActions locale={locale} id={campaign.id} status={campaign.status} failed={0} pending={0} canEdit={access.canEdit} />
            {back}
          </>
        }
      >
        <CampaignComposer
          locale={locale}
          canEdit={access.canEdit}
          {...data}
          initial={{
            id: campaign.id,
            name: campaign.name,
            channel: campaign.channel,
            segmentId: campaign.segmentId,
            filter: campaign.filter,
            excluded: campaign.excluded,
            templateId: campaign.templateId,
            content: campaign.content,
            couponId: campaign.couponId,
            uniqueCodes: campaign.uniqueCodes,
            linkUrl: campaign.linkUrl,
            scheduledLocal: cairoLocal(campaign.scheduledAt),
          }}
        />
      </AdminPage>
    );
  }

  const [recipients, outcome] = await Promise.all([listCampaignRecipients(id), campaignOutcome(id)]);
  return (
    <AdminPage title={campaign.name} eyebrow={`${channelLabels[campaign.channel]} · ${campaignStatusLabels[campaign.status]}`} action={back}>
      <CampaignActions locale={locale} id={campaign.id} status={campaign.status} failed={campaign.failed} pending={campaign.pending} canEdit={access.canEdit} />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile label="أُرسل" value={campaign.sent} note={`من ${campaign.total}`} />
        <StatTile label="بالانتظار" value={campaign.pending} />
        <StatTile label="فشل" value={campaign.failed} tone={campaign.failed ? "danger" : "neutral"} />
        <StatTile label="نقروا الرابط" value={campaign.clickers} note={`${campaign.clicks} نقرة`} />
        <StatTile label="ألغوا الاشتراك" value={outcome?.unsubscribed ?? 0} />
        <StatTile label="استخدموا الكوبون" value={outcome?.couponUses ?? 0} note={outcome?.discount ? `خصم ${money(outcome.discount)}` : undefined} />
      </div>
      <AdminPanel title="الإيراد" hint="من طلبات مدفوعة استخدمت كوبون الحملة، ومن طلبات بدأت بعد النقر على رابطها من غير الكوبون.">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile label="بكوبون الحملة" value={money(outcome?.couponRevenue ?? 0)} />
          <StatTile label="بعد النقر من غير الكوبون" value={money(outcome?.clickRevenue ?? 0)} />
        </div>
      </AdminPanel>
      <AdminPanel title="الرسالة">
        {campaign.channel === "whatsapp" ? (
          <p className="text-sm" dir="ltr">{campaign.content.waName} · {campaign.content.waLanguage} · {campaign.content.waParams.join(" | ")}</p>
        ) : (
          <>
            {campaign.content.subject ? <p className="font-medium">{campaign.content.subject}</p> : null}
            <p className="mt-2 whitespace-pre-wrap text-sm">{campaign.content.body}</p>
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {campaign.segmentName ? `شريحة ${campaign.segmentName}` : "فلتر خاص"}
          {campaign.couponCode ? ` · كوبون ${campaign.couponCode}${campaign.uniqueCodes ? " برموز فردية" : ""}` : ""}
          {` · بدأت ${marketingDate(campaign.startedAt)}`}
          {campaign.finishedAt ? ` · انتهت ${marketingDate(campaign.finishedAt)}` : ""}
        </p>
      </AdminPanel>
      <AdminPanel title="المستلمون" action={<a href={`/api/admin/marketing/export?kind=recipients&id=${campaign.id}`} className={adminGhostClass}>تصدير</a>} flush>
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-start font-medium">المستلم</th>
                <th className="px-4 py-2 text-start font-medium">الحالة</th>
                <th className="px-4 py-2 text-start font-medium">الرمز</th>
                <th className="px-4 py-2 text-start font-medium">نقر</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient) => (
                <tr key={recipient.address} className="border-t">
                  <td className="px-4 py-2">
                    {recipient.name ? <span>{recipient.name} </span> : null}
                    <span className="text-muted-foreground" dir="ltr">{recipient.address}</span>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <Pill tone={recipient.status === "sent" ? "success" : recipient.status === "failed" ? "danger" : "neutral"}>{messageStatusLabels[recipient.status]}</Pill>
                    {recipient.error ? <span className="ms-2 text-muted-foreground">{skipReasons[recipient.error] ?? recipient.error}</span> : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs" dir="ltr">{recipient.couponCode ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{recipient.clicks || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
