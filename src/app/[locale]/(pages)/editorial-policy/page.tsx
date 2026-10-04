import { getSiteSettings } from "@/lib/data/settings";
import { siteConfig } from "@/config/site.config";
import type { Page } from "@/lib/page";

export const metadata = { title: "Editorial Policy" };

export default async function EditorialPolicyPage({ params }: Page) {
  await params;
  const settings = await getSiteSettings();
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-sm leading-relaxed text-black lg:px-0">
      <h1 className="font-sans text-3xl font-semibold tracking-tight">Editorial policy</h1>
      <span className="mt-3 block h-[3px] w-10 rounded-full bg-brand" />
      <p className="mt-6">
        {settings.name} describes visa requirements from primary government sources: the immigration service, the foreign ministry, or the official electronic visa portal of the destination. Travel blogs, agencies, and other secondary write-ups are not used as sources.
      </p>
      <p className="mt-4">
        Each destination page lists the pages that were checked, with the address of the government site. A link is included only when it points at that authority. Fees on the page are the government charge plus the {settings.name} service fee, shown in {siteConfig.market.currency}. They change when the authority changes its charge or when the exchange rate used for display changes.
      </p>
      <p className="mt-4">
        Rules depend on the passport you hold. The pages on this site are written for {siteConfig.market.demonym} passports. If your citizenship is different, the same government site is still the place to confirm what applies to you.
      </p>
      <p className="mt-4">
        The History tab on a destination page shows the date that page was last updated against those official sources.
      </p>
    </article>
  );
}
