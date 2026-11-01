import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { PageHero } from "@/components/layout/page-hero";
import { linesOf } from "@/lib/cms/registry";
import { requirePageContent } from "@/lib/data/pages";
import { t, tf } from "@/lib/i18n";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/transparency/status", { en: "Status", ar: "الحالة" });
}

export default async function StatusPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("transparency/status");
  const systems = linesOf(content.systems).map((parts) => ({
    name: parts[0] ?? "",
    status: parts[1] ?? "",
    uptime: parts[2] ?? "",
  }));
  return (
    <>
      <PageHero align="left" large title={content.title}>
        <p>{content.intro}</p>
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 pb-4 text-sm text-muted-ink">{t(locale, "status.portals")}</div>
      <ul className="mx-auto max-w-3xl space-y-3 px-4 pb-16">
        {systems.map((s) => (
          <li key={s.name} className="rounded-2xl border border-line px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-medium">{s.name}</span>
              <span className="text-sm font-medium text-success">{s.status}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-success" style={{ width: /^\d+(\.\d+)?%$/.test(s.uptime.trim()) ? s.uptime.trim() : "0%" }} />
            </div>
            <p className="mt-1 text-xs text-muted-ink">{tf(locale, "status.uptime", { uptime: s.uptime })}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
