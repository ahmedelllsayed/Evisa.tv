import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPage, adminGhostClass } from "@/components/admin/chrome";
import { CampaignComposer } from "@/components/admin/marketing/campaign-composer";
import { marketingAccess } from "@/lib/data/marketing/access";
import { composerData } from "@/lib/data/marketing/composer";
import { href } from "@/lib/href";
import { emptyFilter } from "@/lib/marketing/audience";
import { emptyContent } from "@/lib/marketing/render";
import type { Page } from "@/lib/page";

export const metadata = { title: "حملة جديدة" };

export default async function NewCampaignPage({ params }: Page) {
  const { locale } = await params;
  const access = await marketingAccess(locale);
  if (!access.canEdit) redirect(`/${locale}/admin/marketing/campaigns`);
  const data = await composerData();
  return (
    <AdminPage title="حملة جديدة" eyebrow="الحملات" action={<Link href={href("/admin/marketing/campaigns", locale)} className={adminGhostClass}>رجوع</Link>}>
      <CampaignComposer
        locale={locale}
        canEdit={access.canEdit}
        {...data}
        initial={{
          id: null,
          name: "",
          channel: "email",
          segmentId: null,
          filter: emptyFilter,
          excluded: [],
          templateId: null,
          content: emptyContent,
          couponId: null,
          uniqueCodes: false,
          linkUrl: null,
          scheduledLocal: null,
        }}
      />
    </AdminPage>
  );
}
