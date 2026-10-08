import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { linesOf } from "@/lib/cms/registry";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/emergency-care", { en: "Emergency Helpline", ar: "الطوارئ" });
}

export default async function EmergencyPage() {
  const [content, settings] = await Promise.all([requirePageContent("emergency-care"), getSiteSettings()]);
  const stats = linesOf(content.stats).map((parts) => [parts[0] ?? "", parts[1] ?? ""]);
  const [first, second] = content.title.split("\n");
  return (
    <div className="min-h-[calc(100vh-72px)] px-6 py-16 lg:px-20">
      <div className="max-w-xl">
        <h1 className="max-w-[280px] font-serif text-3xl leading-tight font-medium tracking-tight text-[#0e1116] md:text-[40px] md:leading-[48px]">
          {first}
          {second && (
            <>
              <br />
              {second}
            </>
          )}
        </h1>
        <p className="mt-6 max-w-[240px] text-sm leading-relaxed text-muted-ink">{content.body}</p>
        <a
          href={`tel:${settings.phone.replace(/\s/g, "")}`}
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#3f3f3f] px-6 text-sm font-medium text-white"
        >
          <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1Z" />
          </svg>
          {settings.phone}
        </a>
      </div>
      <dl className="mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
        {stats.map(([n, l]) => (
          <div key={l} className="rounded-2xl bg-[#f6f7f9] p-6">
            <dt className="text-2xl font-semibold">{n}</dt>
            <dd className="mt-1 text-sm text-muted-ink">{l}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
