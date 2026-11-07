"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createApplication, findOpenApplication, resumeOpenApplication } from "@/lib/data/applications";
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
    const params = new URLSearchParams({ apply: "1" });
    if (input.visaOptionId) params.set("type", input.visaOptionId);
    if (input.departureDate) params.set("date", input.departureDate);
    if (input.express) params.set("express", "1");
    const next = `/${input.locale}/visa/${dest.slug}?${params.toString()}`;
    redirect(`/${input.locale}/sign-in?next=${encodeURIComponent(next)}`);
  }
  const existing = await findOpenApplication(user.id, dest.id);
  if (existing) {
    await resumeOpenApplication(existing.id, {
      departureDate: input.departureDate,
      express: input.express,
      optionId: input.visaOptionId || existing.visaOptionId,
    });
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
