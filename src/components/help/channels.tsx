import type { ReactNode } from "react";
import type { SiteSettings } from "@/lib/data/settings";
import { t } from "@/lib/i18n";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";

export type ChannelKind = "phone" | "whatsapp" | "support" | "general" | "partnerships" | "press";

export type Channel = { kind: ChannelKind; label: string; value: string; href: string; external?: boolean; ltr: boolean };

const icons: Record<"phone" | "whatsapp" | "mail", ReactNode> = {
  phone: (
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1Z" />
  ),
  whatsapp: (
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  ),
  mail: <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.4l8 5.1 8-5.1V7H4Zm16 2.8-7.5 4.8a1 1 0 0 1-1 0L4 9.8V17h16V9.8Z" />,
};

export function ChannelIcon({ kind, className }: { kind: ChannelKind; className?: string }) {
  const icon = kind === "phone" ? icons.phone : kind === "whatsapp" ? icons.whatsapp : icons.mail;
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0 fill-current", className)} aria-hidden>
      {icon}
    </svg>
  );
}

function email(value: string) {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : "";
}

/** Only channels that are actually configured in settings; empty values never render. */
export function configuredChannels(settings: SiteSettings, locale: string, kinds?: ChannelKind[]): Channel[] {
  const list: Channel[] = [];
  const phoneDigits = settings.phone.replace(/[^\d+]/g, "");
  if (phoneDigits.replace(/\D/g, "").length >= 6) {
    list.push({ kind: "phone", label: say(locale, "Phone", "الهاتف"), value: settings.phone.trim(), href: `tel:${phoneDigits}`, ltr: true });
  }
  if (/^https?:\/\//i.test(settings.whatsapp.trim())) {
    list.push({
      kind: "whatsapp",
      label: say(locale, "WhatsApp", "واتساب"),
      value: say(locale, "Open a chat", "افتح المحادثة"),
      href: settings.whatsapp.trim(),
      external: true,
      ltr: false,
    });
  }
  const mails: [ChannelKind, string, string][] = [
    ["support", settings.supportEmail, t(locale, "contact.issues")],
    ["general", settings.generalEmail, t(locale, "contact.general")],
    ["partnerships", settings.partnershipsEmail, say(locale, "Partnerships", "الشراكات")],
    ["press", settings.pressEmail, say(locale, "Press", "الصحافة")],
  ];
  const seen = new Set<string>();
  for (const [kind, raw, label] of mails) {
    const address = email(raw);
    if (!address || seen.has(address.toLowerCase())) continue;
    seen.add(address.toLowerCase());
    list.push({ kind, label, value: address, href: `mailto:${address}`, ltr: true });
  }
  return kinds ? list.filter((channel) => kinds.includes(channel.kind)) : list;
}

export function ChannelList({ channels, className }: { channels: Channel[]; className?: string }) {
  if (!channels.length) return null;
  return (
    <ul className={cn("divide-y divide-[#eceef6]", className)}>
      {channels.map((channel) => (
        <li key={channel.kind} className="min-w-0 py-3 first:pt-0 last:pb-0">
          <a
            href={channel.href}
            {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex min-w-0 items-center gap-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <ChannelIcon kind={channel.kind} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-ink">{channel.label}</span>
              <span className="block truncate text-sm font-semibold text-[#16182b] group-hover:text-brand-700">
                {channel.ltr ? <bdi dir="ltr">{channel.value}</bdi> : channel.value}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
