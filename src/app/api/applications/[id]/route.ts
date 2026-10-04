import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplication, listEvents } from "@/lib/data/applications";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const app = await getApplication(id);
  if (!app || (app.userId !== user.id && user.role !== "admin")) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const events = await listEvents(id);
  return NextResponse.json({ application: app, events });
}
