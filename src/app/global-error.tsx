"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { siteConfig } from "@/config/site.config";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4f5fb",
          color: "#16182b",
          fontFamily: "Tahoma, Segoe UI, sans-serif",
        }}
      >
        <main style={{ width: "min(440px, calc(100% - 32px))", background: "#fff", border: "1px solid #e3e5f2", borderRadius: 24, overflow: "hidden" }}>
          <div style={{ height: 6, background: "#5057ea" }} />
          <div style={{ background: "#16182b", color: "#fff", padding: "18px 24px" }}>
            <strong>{siteConfig.name}</strong>
          </div>
          <div style={{ padding: 24 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Something went wrong</h1>
            <p style={{ margin: 0, color: "#69727b", lineHeight: 1.6 }}>حدث خطأ غير متوقع. أعد المحاولة، وتم تسجيل المشكلة.</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ marginTop: 18, border: 0, borderRadius: 999, background: "#5057ea", color: "#fff", fontWeight: 700, padding: "12px 22px", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
