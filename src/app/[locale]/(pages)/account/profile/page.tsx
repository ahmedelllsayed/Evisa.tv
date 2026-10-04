import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/lib/auth";
import { getProfileVault } from "@/lib/data/profile-vault";
import type { Page } from "@/lib/page";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: Page) {
  const { locale } = await params;
  const user = await requireUser(locale, `/${locale}/account/profile`);
  const vault = await getProfileVault(user.id);
  if (!vault) notFound();
  return <ProfileForm locale={locale} user={user} vault={vault} />;
}
