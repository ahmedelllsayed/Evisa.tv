import Link from "next/link";
import { AdminEmpty, AdminPage, Pill, adminPrimaryClass, type Tone } from "@/components/admin/chrome";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listCampaigns } from "@/lib/data/marketing/campaigns";
import { href } from "@/lib/href";
import { campaignStatusLabels, channelLabels, marketingDate } from "@/lib/marketing/labels";
import type { Page } from "@/lib/page";

export const metadata = { title: "الحملات" };

const tones: Record<string, Tone> = { draft: "neutral", scheduled: "info", sending: "warning", paused: "warning", sent: "success", cancelled: "danger" };

export default async function MarketingCampaignsPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  const campaigns = await listCampaigns();
  return (
    <AdminPage
      title="الحملات"
      description="رسالة واحدة لجمهور على البريد أو الرسائل النصية أو واتساب، الآن أو في موعد."
      action={access.canEdit ? <Link href={href("/admin/marketing/campaigns/new", locale)} className={adminPrimaryClass}>حملة جديدة</Link> : null}
    >
      {campaigns.length === 0 ? (
        <AdminEmpty title="لا توجد حملات بعد" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">الحملة</th>
                <th className="px-3 py-2 text-start font-medium">القناة</th>
                <th className="px-3 py-2 text-start font-medium">الحالة</th>
                <th className="px-3 py-2 text-start font-medium">النتيجة</th>
                <th className="px-3 py-2 text-start font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t">
                  <td className="px-3 py-3">
                    <Link href={href(`/admin/marketing/campaigns/${campaign.id}`, locale)} className="font-medium hover:text-primary">{campaign.name}</Link>
                    <p className="text-xs text-muted-foreground">
                      {campaign.segmentName ? `شريحة ${campaign.segmentName}` : "فلتر خاص"}
                      {campaign.couponCode ? ` · ${campaign.couponCode}${campaign.uniqueCodes ? " (رموز فردية)" : ""}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">{channelLabels[campaign.channel]}</td>
                  <td className="px-3 py-3"><Pill tone={tones[campaign.status]} dot>{campaignStatusLabels[campaign.status]}</Pill></td>
                  <td className="px-3 py-3 text-xs">
                    {campaign.total ? (
                      <>
                        أُرسل {campaign.sent} من {campaign.total}
                        {campaign.failed ? ` · فشل ${campaign.failed}` : ""}
                        {campaign.pending ? ` · انتظار ${campaign.pending}` : ""}
                        <br />
                        نقر {campaign.clickers}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">{marketingDate(campaign.status === "scheduled" ? campaign.scheduledAt : campaign.startedAt ?? campaign.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPage>
  );
}
