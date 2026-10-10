import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { requireUser } from "@/lib/auth";
import { accountStats, listApplicationsForUser, listDocumentsForUser, listIssuedVisasForUser, listPaymentsForUser } from "@/lib/data/applications";
import { listRefundsForUser } from "@/lib/data/inbox";
import { listNotifications } from "@/lib/data/notifications";
import { getProfileVault } from "@/lib/data/profile-vault";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/account", { en: "My applications", ar: "طلباتي" });
}

export default async function AccountPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const query = await searchParams;
  const user = await requireUser(locale, `/${locale}/account`);
  const [apps, visas, documents, payments, notifications, stats, vault, refunds] = await Promise.all([
    listApplicationsForUser(user.id),
    listIssuedVisasForUser(user.id),
    listDocumentsForUser(user.id),
    listPaymentsForUser(user.id),
    listNotifications(user.id),
    accountStats(user.id),
    getProfileVault(user.id),
    listRefundsForUser(user.id),
  ]);
  const tab = typeof query.tab === "string" ? query.tab : "overview";
  return (
    <AccountDashboard
      locale={locale}
      email={user.email}
      initialTab={tab}
      apps={apps}
      visas={visas}
      documents={documents}
      profileDocuments={vault?.documents ?? []}
      payments={payments}
      refunds={refunds.map((refund) => ({ applicationId: refund.applicationId, status: refund.status }))}
      notifications={notifications}
      stats={stats}
      profile={{
        firstName: vault?.firstName ?? "",
        lastName: vault?.lastName ?? "",
        phone: vault?.phone ?? user.phone ?? "",
        nationality: vault?.nationality ?? "",
        passportNumber: vault?.passportNumber ?? "",
        passportExpiry: vault?.passportExpiry ?? "",
      }}
    />
  );
}
