"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createApplication, findOpenApplication } from "@/lib/data/applications";
import { getDestinationById } from "@/lib/data/catalog";

export async function startApplicationAction(input: {
  locale: string;
  destinationId: string;
  departureDate: string | null;
  express: boolean;
}) {
  const dest = await getDestinationById(input.destinationId);
  if (!dest) redirect(`/${input.locale}`);
  const user = await getCurrentUser();
  if (!user) {
    const next = `/${input.locale}/visa/${dest.slug}?apply=1`;
    redirect(`/${input.locale}/sign-in?next=${encodeURIComponent(next)}`);
  }
  const existing = await findOpenApplication(user.id, dest.id);
  if (existing) redirect(`/${input.locale}/apply/${existing.id}`);
  const id = await createApplication({
    userId: user.id,
    destinationId: dest.id,
    departureDate: input.departureDate,
    express: input.express,
  });
  redirect(`/${input.locale}/apply/${id}`);
}
