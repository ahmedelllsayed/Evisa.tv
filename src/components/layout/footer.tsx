import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AskCatalog } from "@/components/layout/ask-catalog";
import { siteConfig } from "@/config/site.config";
import { unpublishedSlugs } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { href } from "@/lib/href";
import { initials } from "@/lib/visa";

const toolLinks = [
  { href: "/tools/visa-requirements", label: "Visa Requirements Checker" },
  { href: "/tools/visa-photo-maker", label: "Visa Photo Creator" },
  { href: "/passport-index", label: "Passport Index" },
  { href: "/emergency-care", label: "Emergency Helpline" },
  { href: "/rejection-recovery", label: "Rejection Recovery" },
];

const companyLinks = [
  { href: siteConfig.links.careers, label: "Careers", external: true },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/contact", label: "Contact" },
  { href: "/partners", label: "Partners" },
  { href: "/transparency/status", label: "Security" },
];

const trustLinks = [
  { href: "/on-time-guaranteed", label: "Visas On Time, Guaranteed" },
  { href: "/transparency/refunds-policy", label: "Refunds Policy" },
  { href: "/transparency/price-change-log", label: "Fee Change Audit" },
  { href: "/transparency/status", label: "Status" },
];

export async function Footer({ locale }: { locale: string }) {
  const [hidden, settings] = await Promise.all([unpublishedSlugs(), getSiteSettings()]);
  const visible = (links: { href: string; label: string; external?: boolean }[]) =>
    links.filter((link) => link.external || /^https?:/.test(link.href) || !hidden.has(link.href.replace(/^\//, "")));
  const wallAvatars = ["P", "A", "R", "M"];
  return (
    <footer className="mt-16 border-t border-line bg-white pb-24 lg:pb-8">
      <div className="mx-auto grid max-w-site gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
            <Link href={href("/", locale)} aria-label={settings.name}>
            <Logo name={settings.name} src={settings.logoUrl} />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-body">{settings.description}</p>
          {siteConfig.features.askAi && <AskCatalog locale={locale} name={settings.name} />}
          <Link href={href("/wall-of-love", locale)} className="mt-6 flex items-center gap-3">
            <span className="flex -space-x-2">
              {wallAvatars.map((letter, i) => (
                <span
                  key={letter}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white"
                  style={{ background: ["#5057ea", "#b165fd", "#35cc6d", "#eaa250"][i] }}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span>
              <span className="block text-sm font-medium">
                Wall Of Love <span aria-hidden>↗</span>
              </span>
              <span className="text-xs text-muted-ink">{siteConfig.stats.reviewCount} reviews</span>
            </span>
          </Link>
          <div className="mt-6 flex gap-3">
            <a href={siteConfig.links.appStore} target="_blank" rel="noreferrer" className="rounded-lg bg-black px-3 py-2 text-[11px] text-white">
              Download on the App Store
            </a>
            <a href={siteConfig.links.playStore} target="_blank" rel="noreferrer" className="rounded-lg bg-black px-3 py-2 text-[11px] text-white">
              Get it on Google Play
            </a>
          </div>
        </div>
        <FooterCol title="Tools" links={visible(toolLinks)} locale={locale} />
        <FooterCol title="Company" links={visible(companyLinks)} locale={locale} />
        <FooterCol title="Trust" links={visible(trustLinks)} locale={locale} />
      </div>
      <div className="mx-auto max-w-site px-5">
        <div className="h-px bg-line" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm text-slate-ink">
          {settings.offices.map((o) => (
            <span key={o.city} title={o.address} className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-slate-ink/60" />
              {o.city}
            </span>
          ))}
        </div>
        <div className="h-px bg-line" />
        <div className="flex items-center justify-between gap-4 py-5 text-sm text-muted-ink">
          <p className="flex flex-wrap items-center gap-1">
            © {settings.name}, All rights reserved
            {!hidden.has("privacy") && (
              <>
                <Diamond />
                <Link href={href("/privacy", locale)} className="hover:text-ink">
                  Privacy
                </Link>
              </>
            )}
            {!hidden.has("terms") && (
              <>
                <Diamond />
                <Link href={href("/terms", locale)} className="hover:text-ink">
                  Terms
                </Link>
              </>
            )}
          </p>
          <Link href={href("/", locale)} aria-label={settings.name} className="shrink-0">
            <Logo name={settings.name} src={settings.logoUrl} />
          </Link>
        </div>
      </div>
    </footer>
  );
}

function Diamond() {
  return <span className="mx-1 inline-block size-1 rotate-45 bg-slate-ink/50" aria-hidden />;
}

function FooterCol({
  title,
  links,
  locale,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
  locale: string;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-2.5 text-sm text-body">
        {links.map((l) => (
          <li key={l.label}>
            {l.external || /^https?:/.test(l.href) ? (
              <a href={l.href} target="_blank" rel="noreferrer" className="hover:text-ink">
                {l.label}
              </a>
            ) : (
              <Link href={href(l.href, locale)} className="hover:text-ink">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewAvatars({ names }: { names: string[] }) {
  return (
    <span className="flex -space-x-2">
      {names.map((n) => (
        <span key={n} className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
          {initials(n)}
        </span>
      ))}
    </span>
  );
}
