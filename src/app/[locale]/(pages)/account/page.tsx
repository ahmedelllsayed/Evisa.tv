import Link from "next/link";
import { ApplicationCard } from "@/components/account/application-tracker";
import { requireUser } from "@/lib/auth";
import { listApplicationsForUser } from "@/lib/data/applications";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "My applications" };

export default async function AccountPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireUser(locale, `/${locale}/account`);
  const apps = await listApplicationsForUser(user.id);
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">My applications</h1>
          <p className="mt-1 text-sm text-muted-ink">{user.email}</p>
          <p className="mt-1 text-sm text-muted-ink">Passport details and files saved on your profile are reused on the next application.</p>
          <p className="mt-1 text-sm text-muted-ink">Passport and documents saved on your profile are reused on new applications.</p>
        </div>
        <Link href={href("/account/profile", locale)} className="text-sm text-brand">
          Profile
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {apps.length === 0 && <p className="text-sm text-muted-ink">No applications yet. Pick a destination to start.</p>}
        {apps.map((app) => (
          <ApplicationCard key={app.id} app={app} locale={locale} />
        ))}
      </div>
    </div>
  );
}
