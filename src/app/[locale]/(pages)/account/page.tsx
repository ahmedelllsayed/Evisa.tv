import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import Link from "next/link";
import { ApplicationCard } from "@/components/account/application-tracker";
import { requireUser } from "@/lib/auth";
import { listApplicationsForUser } from "@/lib/data/applications";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/account", { en: "My applications", ar: "طلباتي" });
}

export default async function AccountPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireUser(locale, `/${locale}/account`);
  const apps = await listApplicationsForUser(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t(locale, "account.title")}</h1>
          <p className="mt-1 text-sm text-muted-ink">{user.email}</p>
          <p className="mt-1 text-sm text-muted-ink">{t(locale, "account.reuse")}</p>
        </div>
        <Link href={href("/account/profile", locale)} className="text-sm text-brand">
          {t(locale, "account.profile")}
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {apps.length === 0 && <p className="text-sm text-muted-ink">{t(locale, "account.empty")}</p>}
        {apps.map((app) => (
          <ApplicationCard key={app.id} app={app} locale={locale} />
        ))}
      </div>
    </div>
  );
}
