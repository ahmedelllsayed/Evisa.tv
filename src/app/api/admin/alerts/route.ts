import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAdminAlerts } from "@/lib/data/admin-alerts";
import { processOutbox } from "@/lib/data/outbox";
import { isStaffRole } from "@/lib/rbac-constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return NextResponse.json({ items: [] }, { status: 401 });
  const items = await listAdminAlerts();
  await processOutbox().catch(() => undefined);
  return NextResponse.json({ items });
}
