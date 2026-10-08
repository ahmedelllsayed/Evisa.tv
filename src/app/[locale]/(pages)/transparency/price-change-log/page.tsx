import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { PageHero } from "@/components/layout/page-hero";
import { listFeeChanges } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { formatMoney } from "@/lib/visa";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/transparency/price-change-log", { en: "Fee Change Audit", ar: "سجل الرسوم" });
}

export default async function FeeChangePage() {
  const [changes, content] = await Promise.all([listFeeChanges(), requirePageContent("transparency/price-change-log")]);
  return (
    <>
      <PageHero align="left" large title={content.title}>
        <p>{content.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-4xl overflow-x-auto px-4 pb-16">
        <table className="w-full min-w-[40rem] text-start text-sm">
          <thead>
            <tr className="border-b border-line text-muted-ink">
              <th className="py-2 font-medium">Date</th>
              <th className="py-2 font-medium">Destination</th>
              <th className="py-2 font-medium">Was</th>
              <th className="py-2 font-medium">Now</th>
              <th className="py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {changes.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-muted-ink">
                  No fee changes have been recorded yet.
                </td>
              </tr>
            )}
            {changes.map((c) => (
              <tr key={c.id} className="border-b border-line/70">
                <td className="py-3">{new Date(c.changedAt).toLocaleDateString("en-GB")}</td>
                <td>{c.destinationName}</td>
                <td>{formatMoney(c.oldTotal)}</td>
                <td>{formatMoney(c.newTotal)}</td>
                <td>{c.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
