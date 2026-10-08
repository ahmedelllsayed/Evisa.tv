import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listAllApplications } from "@/lib/data/applications";
import { siteConfig } from "@/config/site.config";

function cell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET(request: Request) {
  await requireAdmin(siteConfig.defaultLocale);
  const url = new URL(request.url);
  const apps = await listAllApplications({
    status: url.searchParams.get("status") || undefined,
    q: url.searchParams.get("q") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    destination: url.searchParams.get("destination") || undefined,
    limit: 100,
  });
  const lines = [["reference", "status", "destination", "email", "total", "currency", "created"].join(",")];
  for (const app of apps) {
    lines.push([app.reference, app.status, app.destinationName, app.userEmail ?? "", app.totalAmount, app.currency, app.createdAt].map(cell).join(","));
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=applications.csv",
    },
  });
}
