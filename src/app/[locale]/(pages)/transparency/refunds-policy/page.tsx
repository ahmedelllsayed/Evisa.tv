import { PageHero } from "@/components/layout/page-hero";
import { linesOf } from "@/lib/cms/registry";
import { listFaqs, listReviews } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { initials } from "@/lib/visa";

export const metadata = { title: "Refunds Policy" };

export default async function RefundsPage() {
  const [faqs, reviews, content] = await Promise.all([listFaqs("refunds"), listReviews("refunds"), requirePageContent("transparency/refunds-policy")]);
  const rows = linesOf(content.rows).map((parts) => [parts[0] ?? "", parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""]);
  return (
    <>
      <PageHero align="left" large title={content.title}>
        <p>{content.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-4xl overflow-x-auto px-4 pb-10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted-ink uppercase">
              <th className="py-2 font-medium">Application stage</th>
              <th className="py-2 font-medium">What is happening</th>
              <th className="py-2 font-medium">Refund</th>
              <th className="py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-line/70">
                {r.map((cell) => (
                  <td key={cell} className="py-3 pr-4">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!faqs.length && (
        <div className="mx-auto max-w-3xl px-4 pb-8">
          <h2 className="font-display text-2xl font-semibold">Questions</h2>
          <ul className="mt-3 space-y-3">
            {faqs.map((f) => (
              <li key={f.id}>
                <p className="font-medium">{f.question}</p>
                <p className="text-sm text-body">{f.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mx-auto grid max-w-3xl gap-4 px-4 pb-16">
        {reviews.map((r) => (
          <figure key={r.id} className="rounded-2xl border border-line p-4 text-sm">
            <p className="text-body">{r.body}</p>
            <figcaption className="mt-2 text-muted-ink">{initials(r.author)} · {r.author}</figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
