"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isArabicLocale } from "@/lib/i18n";

const COOKIE = "analytics_consent";

function readConsent() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE}=`));
  return match?.split("=")[1] ?? "";
}

function writeConsent(value: "granted" | "denied") {
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
}

export function SiteAnalytics({
  measurementId,
  locale,
  consentEnabled,
  consentText,
}: {
  measurementId: string;
  locale: string;
  consentEnabled: boolean;
  consentText: string;
}) {
  const path = usePathname();
  const [choice, setChoice] = useState("");
  const id = measurementId.trim();
  const allowed = /^G-[A-Z0-9]+$/i.test(id);

  useEffect(() => {
    setChoice(readConsent());
  }, []);

  useEffect(() => {
    if (!allowed || choice !== "granted" || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", { page_path: path, language: locale });
  }, [allowed, choice, path, locale]);

  if (!allowed) return null;

  function choose(value: "granted" | "denied") {
    writeConsent(value);
    setChoice(value);
    window.gtag?.("consent", "update", {
      analytics_storage: value,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  return (
    <>
      <Script id="ga-consent" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`}
      </Script>
      {choice === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`gtag('js', new Date());gtag('config', '${id}', {send_page_view:false, anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consentEnabled && !choice && (
        <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-lg sm:bottom-6 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm">{consentText || (isArabicLocale(locale) ? "نستخدم الكوكيز لقياس الزيارات." : "We use cookies to measure visits.")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => choose("denied")} className="rounded-full border border-line px-4 py-2 text-sm">
              {isArabicLocale(locale) ? "رفض" : "Refuse"}
            </button>
            <button type="button" onClick={() => choose("granted")} className="rounded-full bg-brand px-4 py-2 text-sm text-white">
              {isArabicLocale(locale) ? "موافقة" : "Accept"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
