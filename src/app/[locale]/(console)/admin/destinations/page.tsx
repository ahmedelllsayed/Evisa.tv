import { DestinationEditor } from "@/components/admin/destination-editor";
import { cairoToday, contentAccess } from "@/components/admin/content/access";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { listAllVisaQuestions } from "@/lib/data/questions";
import type { QuestionKind } from "@/lib/visa-answers";
import { listAllVisaOptions, visaOptionStats } from "@/lib/data/visa-options";
import { listStoredDestinationMedia } from "@/lib/destination-media";
import type { Page } from "@/lib/page";

export const metadata = { title: "Destinations" };

export default async function AdminDestinationsPage({ params }: Page) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const destinations = await listDestinations({ includeInactive: true });
  const [storedMedia, options, stats, access, questions] = await Promise.all([
    listStoredDestinationMedia(destinations.map((destination) => destination.id)),
    listAllVisaOptions(),
    visaOptionStats(),
    contentAccess(user.role),
    listAllVisaQuestions(),
  ]);
  const optionCounts = Object.fromEntries(stats.map((row) => [row.id, row.total]));
  const questionsByOption: Record<string, { id: string; prompt: string; promptAr: string; kind: QuestionKind; choices: { en: string; ar: string }[]; required: boolean; active: boolean }[]> = {};
  for (const question of questions) {
    (questionsByOption[question.visaOptionId] ??= []).push({
      id: question.id,
      prompt: question.prompt,
      promptAr: question.promptAr ?? "",
      kind: question.kind,
      choices: question.choices,
      required: question.required,
      active: question.active,
    });
  }
  return (
    <DestinationEditor
      locale={locale}
      destinations={destinations}
      storedMedia={storedMedia}
      options={options}
      optionCounts={optionCounts}
      questionsByOption={questionsByOption}
      today={cairoToday()}
      canEdit={access.canEdit}
      canDelete={access.canDelete}
    />
  );
}
