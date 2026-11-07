import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AskCatalog } from "@/components/layout/ask-catalog";
import { emptyContentSlugs, unpublishedSlugs } from "@/lib/data/pages";
import { publicReviewStats } from "@/lib/data/catalog";
import { getSiteSettings } from "@/lib/data/settings";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/visa";
import { siteConfig } from "@/config/site.config";

export async function Footer({ locale }: { locale: string }) {
  const [unpublished, empty, settings, reviews] = await Promise.all([unpublishedSlugs(), emptyContentSlugs(), getSiteSettings(), publicReviewStats()]);
  const hidden = new Set([...unpublished, ...empty]);
  const toolLinks = [
    { href: "/tools/visa-requirements", label: t(locale, "footer.requirements") },
    { href: "/tools/visa-photo-maker", label: t(locale, "footer.photo") },
    { href: "/passport-index", label: t(locale, "footer.passport") },
    { href: "/emergency-care", label: t(locale, "footer.emergency") },
    { href: "/rejection-recovery", label: t(locale, "footer.rejection") },
    { href: "/events", label: t(locale, "footer.events") },
  ];
  const companyLinks = [
    { href: "/newsroom", label: t(locale, "footer.newsroom") },
    { href: "/contact", label: t(locale, "footer.contact") },
    { href: "/partners", label: t(locale, "footer.partners") },
    { href: "/security", label: t(locale, "footer.security") },
    { href: "/editorial-policy", label: t(locale, "footer.editorial") },
  ];
  const trustLinks = [
    { href: "/on-time-guaranteed", label: t(locale, "footer.guarantee") },
    { href: "/transparency/refunds-policy", label: t(locale, "footer.refunds") },
    { href: "/transparency/price-change-log", label: t(locale, "footer.fees") },
    { href: "/transparency/status", label: t(locale, "footer.status") },
  ];
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
                {t(locale, "footer.wall")} <span aria-hidden>↗</span>
              </span>
              {reviews.reviewCount > 0 && (
                <span className="text-xs text-muted-ink">
                  {reviews.rating ? `${reviews.rating} · ` : ""}
                  {reviews.reviewCount} {t(locale, "footer.reviews")}
                </span>
              )}
            </span>
          </Link>
        </div>
        <FooterCol title={t(locale, "footer.tools")} links={visible(toolLinks)} locale={locale} />
        <FooterCol title={t(locale, "footer.company")} links={visible(companyLinks)} locale={locale} />
        <FooterCol title={t(locale, "footer.trust")} links={visible(trustLinks)} locale={locale} />
      </div>
      <div className="mx-auto max-w-site px-5">
        <div className="h-px bg-line" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4 text-sm text-slate-ink">
          <SocialLinks lines={settings.extras.social} />
          {settings.phone && <span>{settings.phone}</span>}
          {settings.offices.map((o) => (
            <span key={o.city} title={o.address} className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-slate-ink/60" />
              {o.city}
            </span>
          ))}
        </div>
        <div className="h-px bg-line" />
        <div className="py-5 text-sm text-muted-ink">
          <p className="flex flex-wrap items-center gap-1">
            © {settings.name}, {t(locale, "common.rights")}
            {!hidden.has("privacy") && (
              <>
                <Diamond />
                <Link href={href("/privacy", locale)} className="hover:text-ink">
                  {t(locale, "footer.privacy")}
                </Link>
              </>
            )}
            {!hidden.has("terms") && (
              <>
                <Diamond />
                <Link href={href("/terms", locale)} className="hover:text-ink">
                  {t(locale, "footer.terms")}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}

function Diamond() {
  return <span className="mx-1 inline-block size-1 rotate-45 bg-slate-ink/50" aria-hidden />;
}

const socialNames: [string, string][] = [
  ["facebook.com", "Facebook"],
  ["fb.com", "Facebook"],
  ["instagram.com", "Instagram"],
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["tiktok.com", "TikTok"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["linkedin.com", "LinkedIn"],
  ["wa.me", "WhatsApp"],
  ["whatsapp.com", "WhatsApp"],
  ["t.me", "Telegram"],
  ["snapchat.com", "Snapchat"],
];

function socialEntries(lines: string) {
  return lines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const url = new URL(line);
        if (url.protocol !== "https:" && url.protocol !== "http:") return null;
        const host = url.hostname.replace(/^www\./, "");
        const name = socialNames.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
        return { href: url.href, name };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { href: string; name: string } => Boolean(entry));
}

function SocialLinks({ lines }: { lines: string }) {
  const entries = socialEntries(lines);
  if (!entries.length) return null;
  return (
    <ul className="flex items-center gap-2">
      {entries.map((entry) => (
        <li key={entry.href}>
          <a
            href={entry.href}
            target="_blank"
            rel="noreferrer"
            aria-label={entry.name}
            className="inline-flex size-9 items-center justify-center rounded-full border border-[#e3e5f2] text-[#3c415c] transition-colors hover:border-[#16182b] hover:bg-[#16182b] hover:text-white"
          >
            <SocialGlyph name={entry.name} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SocialGlyph({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", className: "size-4", "aria-hidden": true as const, fill: "currentColor" };
  if (name === "Facebook") {
    return (
      <svg {...common}>
        <path d="M14.3 8.6h2.2l-.4 2.5h-1.8V21h-3.1v-9.9H9.4V8.6h1.8V6.8c0-1.9 1-3.3 3.4-3.3.9 0 1.7.1 1.7.1v2.3h-1.2c-.9 0-1.1.5-1.1 1.2v1.5Z" />
      </svg>
    );
  }
  if (name === "Instagram") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "TikTok") {
    return (
      <svg {...common}>
        <path d="M14.1 3h2.2a5.4 5.4 0 0 0 3.8 3.6v2.3a7.6 7.6 0 0 1-3.8-1.2v6.8a5.5 5.5 0 1 1-5.5-5.5c.3 0 .5 0 .8.1v2.4a3.2 3.2 0 1 0 2.2 3V3Z" />
      </svg>
    );
  }
  if (name === "X") {
    return (
      <svg {...common}>
        <path d="M14.7 10.6 20.4 4h-1.6l-4.8 5.6L10.2 4H4.6l6.1 8.9L4.6 20h1.6l5.3-6.2 4.3 6.2h5.6l-6.7-9.4Zm-1.9 2.2-.6-.9-4.9-7h2.1l3.9 5.6.6.9 5.1 7.3h-2.1l-4.1-5.9Z" />
      </svg>
    );
  }
  if (name === "YouTube") {
    return (
      <svg {...common}>
        <path d="M21.2 8.2a2.7 2.7 0 0 0-1.9-1.9C17.7 6 12 6 12 6s-5.7 0-7.3.3a2.7 2.7 0 0 0-1.9 1.9C2.5 9.8 2.5 12 2.5 12s0 2.2.3 3.8a2.7 2.7 0 0 0 1.9 1.9C6.3 18 12 18 12 18s5.7 0 7.3-.3a2.7 2.7 0 0 0 1.9-1.9c.3-1.6.3-3.8.3-3.8s0-2.2-.3-3.8ZM10.4 14.8V9.2L15.3 12l-4.9 2.8Z" />
      </svg>
    );
  }
  if (name === "LinkedIn") {
    return (
      <svg {...common}>
        <path d="M6.7 9.2H4V20h2.7V9.2ZM5.3 4A1.6 1.6 0 1 0 5.3 7.2 1.6 1.6 0 0 0 5.3 4ZM20 20h-2.7v-5.6c0-1.6-.6-2.6-2-2.6-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V20H10.6V9.2h2.6v1.5c.4-.7 1.3-1.8 3.2-1.8 2.3 0 4 1.5 4 4.8V20Z" />
      </svg>
    );
  }
  if (name === "WhatsApp") {
    return (
      <svg {...common}>
        <path d="M12.1 3.5A8.2 8.2 0 0 0 5.2 16l-.8 3.1 3.2-.8a8.2 8.2 0 1 0 4.5-14.8Zm4.7 11.6c-.2.6-1.2 1.1-1.7 1.1-.4.1-.9.1-1.5-.1-.3-.1-.7-.2-1.3-.5-2.2-1-3.6-3.2-3.7-3.4-.1-.2-.9-1.2-.9-2.3s.6-1.6.8-1.8c.2-.2.4-.3.6-.3h.4c.1 0 .3 0 .5.4.2.5.6 1.6.7 1.7.1.1.1.3 0 .5l-.3.4c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.1.2.1.4.1.5-.1l.4-.6c.1-.2.3-.1.5-.1l1.5.7c.2.1.3.2.4.3.1.3 0 .8-.2 1.3Z" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" strokeLinecap="round" />
    </svg>
  );
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
