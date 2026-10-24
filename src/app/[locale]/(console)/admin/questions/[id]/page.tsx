import { notFound } from "next/navigation";
import { QuestionSetEditor } from "@/components/admin/question-set-editor";
import { requireAdmin } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { getQuestionSet } from "@/lib/data/questions";
import { listAllVisaOptions } from "@/lib/data/visa-options";
import type { Page } from "@/lib/page";

export const metadata = { title: "Question set" };

export default async function AdminQuestionSetPage({ params }: Page<{ locale: string; id: string }>) {
  const { locale, id } = await params;
  await requireAdmin(locale);
  const [questionSet, destinations, options] = await Promise.all([
    getQuestionSet(id),
    listDestinations({ includeInactive: true }),
    listAllVisaOptions(),
  ]);
  if (!questionSet) notFound();
  return (
    <QuestionSetEditor
      locale={locale}
      questionSet={questionSet}
      destinations={destinations.map((destination) => ({
        id: destination.id,
        code: destination.code,
        name: destination.name,
        visaType: destination.visaType,
      }))}
      options={options.map((option) => ({
        id: option.id,
        destinationId: option.destinationId,
        label: option.label,
        visaType: option.visaType,
      }))}
    />
  );
}
