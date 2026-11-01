"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { changeApplicationOption, createApplication, findOpenApplication } from "@/lib/data/applications";
import { getDestinationById } from "@/lib/data/catalog";

export async function startApplicationAction(input: {
  locale: string;
  destinationId: string;
  departureDate: string | null;
  express: boolean;
  visaOptionId?: string | null;
}) {
  const dest = await getDestinationById(input.destinationId);
  if (!dest) redirect(`/${input.locale}`);
  const user = await getCurrentUser();
  if (!user) {
    const type = input.visaOptionId ? `&type=${encodeURIComponent(input.visaOptionId)}` : "";
    const next = `/${input.locale}/visa/${dest.slug}?apply=1${type}`;
    redirect(`/${input.locale}/sign-in?next=${encodeURIComponent(next)}`);
  }
  const existing = await findOpenApplication(user.id, dest.id);
  if (existing) {
    const optionId = input.visaOptionId || null;
    const optionChanged = Boolean(optionId) && existing.visaOptionId !== optionId;
    const expressChanged = existing.express !== Boolean(input.express);
    if (optionChanged || expressChanged) {
      const nextOption = optionId || existing.visaOptionId;
      if (nextOption) await changeApplicationOption(existing.id, nextOption, input.express);
    }
    redirect(`/${input.locale}/apply/${existing.id}`);
  }
  const id = await createApplication({
    userId: user.id,
    destinationId: dest.id,
    departureDate: input.departureDate,
    express: input.express,
    locale: input.locale,
    visaOptionId: input.visaOptionId,
  });
  redirect(`/${input.locale}/apply/${id}`);
}
