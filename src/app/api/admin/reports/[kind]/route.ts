import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getInsights, insightDays, insightSheets } from "@/lib/data/insights";
import { isStaffRole } from "@/lib/rbac-constants";
import { buildCsv, buildXlsx } from "@/lib/reports/xlsx";

const kinds = new Set(["all", "revenue", "operations", "staff", "quality"]);

export async function GET(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { kind } = await ctx.params;
  if (!kinds.has(kind)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = new URL(request.url);
  const data = await getInsights(insightDays(url.searchParams.get("days")));
  const names: Record<string, string> = { revenue: "الإيرادات", operations: "التشغيل", staff: "الموظفون", quality: "الجودة" };
  const sheets = kind === "all" ? insightSheets(data) : insightSheets(data).filter((sheet) => sheet.name === names[kind]);
  if (url.searchParams.get("format") === "csv") {
    return new NextResponse(buildCsv(sheets.flatMap((sheet) => sheet.rows)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${kind}.csv"`,
      },
    });
  }
  const bytes = buildXlsx(sheets);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kind}.xlsx"`,
    },
  });
}
