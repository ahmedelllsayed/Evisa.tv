import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { requireUser } from "@/lib/auth";
import {
  accountStats,
  listApplicationGapsForUser,
  listApplicationsForUser,
  listDocumentsForUser,
  listIssuedVisasForUser,
  listPaymentsForUser,
} from "@/lib/data/applications";
import { databaseNow } from "@/lib/data/admin-applications";
import { listRefundsForUser } from "@/lib/data/inbox";
import { listNotifications } from "@/lib/data/notifications";
import { ensureReferralCode, referralLink } from "@/lib/data/growth";
import { getProfileVault } from "@/lib/data/profile-vault";
import { listRewardsForUser } from "@/lib/data/marketing/referrals";
import { getMarketingSettings, type MarketingSettings, type RewardRule } from "@/lib/data/marketing/settings";
import { siteConfig } from "@/config/site.config";
import { isArabicLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/visa";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/account", { en: "My applications", ar: "طلباتي" });
}

export default async function AccountPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const query = await searchParams;
  const user = await requireUser(locale, `/${locale}/account`);
  const [apps, visas, documents, payments, notifications, stats, vault, refunds, gaps, now] = await Promise.all([
    listApplicationsForUser(user.id),
    listIssuedVisasForUser(user.id),
    listDocumentsForUser(user.id),
    listPaymentsForUser(user.id),
    listNotifications(user.id),
    accountStats(user.id),
    getProfileVault(user.id),
    listRefundsForUser(user.id),
    listApplicationGapsForUser(user.id),
    databaseNow(),
  ]);
  const [code, marketing, rewards] = await Promise.all([ensureReferralCode(user.id), getMarketingSettings(), listRewardsForUser(user.id)]);
  const referral = referralLink(code);
  const tab = typeof query.tab === "string" ? query.tab : "overview";
  return (
    <AccountDashboard
      locale={locale}
      email={user.email}
      initialTab={tab}
      now={new Date(now).getTime()}
      apps={apps}
      visas={visas}
      documents={documents}
      gaps={gaps}
      profileDocuments={vault?.documents ?? []}
      payments={payments}
      refunds={refunds.map((refund) => ({ applicationId: refund.applicationId, status: refund.status }))}
      notifications={notifications}
      stats={stats}
      profile={{
        firstName: vault?.firstName ?? "",
        lastName: vault?.lastName ?? "",
        dateOfBirth: vault?.dateOfBirth ?? "",
        phone: vault?.phone ?? user.phone ?? "",
        nationality: vault?.nationality ?? "",
        passportNumber: vault?.passportNumber ?? "",
        passportExpiry: vault?.passportExpiry ?? "",
      }}
      referralUrl={referral}
      referralOffer={marketing.referral.enabled ? referralOffer(marketing.referral, locale) : null}
      referralRewards={rewards.map((reward) => ({
        code: reward.code,
        state: reward.cancelled ? "cancelled" : reward.used ? "used" : reward.expiresAt && reward.expiresAt < new Date(now).toISOString() ? "expired" : "open",
        expires: reward.expiresAt ? formatDay(reward.expiresAt, locale) : null,
      }))}
    />
  );
}

function ruleLabel(rule: RewardRule, locale: string) {
  const arabic = isArabicLocale(locale);
  const amount = rule.kind === "percent" ? `${rule.value}%` : formatMoney(rule.value, siteConfig.market.currency, locale);
  if (rule.appliesTo === "service") return arabic ? `${amount} من رسم الخدمة` : `${amount} off the service fee`;
  return arabic ? `${amount} من الإجمالي` : `${amount} off the total`;
}

function referralOffer(referral: MarketingSettings["referral"], locale: string) {
  return isArabicLocale(locale)
    ? `صديقك يحصل على ${ruleLabel(referral.friend, locale)} في أول طلب، وتحصل أنت على رمز ${ruleLabel(referral.reward, locale)} بعد أن يدفع.`
    : `Your friend gets ${ruleLabel(referral.friend, locale)} on a first application, and you get a code for ${ruleLabel(referral.reward, locale)} once they pay.`;
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(isArabicLocale(locale) ? "ar-EG" : "en-GB", { dateStyle: "medium", timeZone: siteConfig.market.timeZone }).format(new Date(value));
}
