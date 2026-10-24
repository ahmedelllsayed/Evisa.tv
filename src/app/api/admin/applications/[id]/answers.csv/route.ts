import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getApplication } from "@/lib/data/applications";
import { staffQuestionnaire } from "@/lib/data/questions";
import { answersToCsv } from "@/lib/questions";
import { siteConfig } from "@/config/site.config";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin(siteConfig.defaultLocale);
  const { id } = await ctx.params;
  const app = await getApplication(id);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  const questionnaire = await staffQuestionnaire(app.id);
  const body = answersToCsv(app.reference, questionnaire.questions, questionnaire.answers);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${app.reference}-answers.csv"`,
    },
  });
}
