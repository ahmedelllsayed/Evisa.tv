import { redirect } from "next/navigation";
import { CampaignDesk } from "@/components/admin/campaign-desk";
import { AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { getCampaign, listAudienceNationalities, listCampaigns, listMarketingContacts } from "@/lib/data/campaigns";
import { listDestinations } from "@/lib/data/catalog";
import { listCoupons } from "@/lib/data/coupons";
import type { Page } from "@/lib/page";
import { currentUserHasPermission } from "@/lib/rbac";
import { isFullAdmin } from "@/lib/rbac-constants";

export const metadata = { title: "البريد" };

function when(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value));
}

export default async function AdminCampaignsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireAdmin(locale);
  const campaignId = typeof sp.campaign === "string" ? sp.campaign : null;
  const [canView, canEdit, destinations, coupons, contacts, nationalities, campaigns, selected] = await Promise.all([
    currentUserHasPermission("settings", "view"),
    currentUserHasPermission("settings", "edit"),
    listDestinations({ includeInactive: true }),
    listCoupons(),
    listMarketingContacts(),
    listAudienceNationalities(),
    listCampaigns(),
    campaignId ? getCampaign(campaignId) : Promise.resolve(null),
  ]);
  if (!canView && !isFullAdmin(user.role)) redirect(`/${locale}/admin`);
  return (
    <AdminPage title="البريد" description="رسائل وعروض للعملاء بعد الفلترة، أو لجهات تلصقها من خارج الموقع. كل رسالة فيها رابط إلغاء الاشتراك.">
      <CampaignDesk
        locale={locale}
        canEdit={canEdit || isFullAdmin(user.role)}
        mailReady={Boolean(process.env.RESEND_API_KEY)}
        destinations={destinations.map((destination) => ({ id: destination.id, name: destination.nameAr || destination.name }))}
        nationalities={nationalities.map((code) => ({ code, name: countryName(code, "ar") }))}
        coupons={coupons.map((coupon) => ({ id: coupon.id, code: coupon.code, active: coupon.active }))}
        contacts={contacts.contacts}
        contactTotal={contacts.total}
        campaigns={campaigns.map((campaign) => ({
          id: campaign.id,
          subject: campaign.subject,
          couponCode: campaign.couponCode,
          status: campaign.status,
          when: when(campaign.createdAt),
          sent: campaign.sent,
          failed: campaign.failed,
          skipped: campaign.skipped,
          pending: campaign.pending,
        }))}
        selected={
          selected
            ? {
                id: selected.id,
                subject: selected.subject,
                body: selected.body,
                couponCode: selected.couponCode,
                status: selected.status,
                when: when(selected.createdAt),
                sent: selected.sent,
                failed: selected.failed,
                skipped: selected.skipped,
                pending: selected.pending,
                recipients: selected.recipients,
              }
            : null
        }
      />
    </AdminPage>
  );
}
