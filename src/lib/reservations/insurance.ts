import "server-only";

const ENDPOINT = "https://epti-egy.org/Traveltargetweb/ChartService.asmx/polprint_en";
const MAX_PDF_BYTES = 8_000_000;
const BROWSER = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

function absolute(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value)
    ? value
    : value.startsWith("//")
      ? `https:${value}`
      : `https://epti-egy.org/${value.replace(/^\//, "")}`;
  return withScheme.replace(/([^:]\/)\/+/g, "$1");
}

function urlFrom(data: unknown): string {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{")) {
      try {
        return urlFrom(JSON.parse(trimmed) as unknown);
      } catch {
        return "";
      }
    }
    return trimmed;
  }
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const nested = record.Url || record.url || record.URL || record.PolicyUrl || record.policyUrl;
  return typeof nested === "string" ? urlFrom(nested) : "";
}

async function downloadPdf(url: string) {
  const file = await fetch(url, {
    headers: {
      "user-agent": BROWSER,
      accept: "application/pdf,application/octet-stream,*/*",
      referer: "https://epti-egy.org/Traveltargetweb/Pages/Policy_Qry2/Default.aspx",
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!file.ok) throw new Error("The insurance policy could not be found.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) throw new Error("The insurance file was not a PDF.");
  if (bytes.subarray(0, 4).toString() === "%PDF") return bytes;
  const type = file.headers.get("content-type") || "";
  if (!type.includes("text/html")) throw new Error("The insurance file was not a PDF.");
  const html = bytes.toString("utf8");
  const match = html.match(/https?:\/\/[^"']+\.pdf[^"']*/i) || html.match(/src=["']([^"']+\.pdf[^"']*)["']/i);
  const nested = absolute(match?.[1] || match?.[0] || "");
  if (!nested) throw new Error("The insurance file was not a PDF.");
  const again = await fetch(nested, {
    headers: { "user-agent": BROWSER, accept: "application/pdf,*/*" },
    signal: AbortSignal.timeout(30_000),
  });
  const nestedBytes = Buffer.from(await again.arrayBuffer());
  if (!again.ok || nestedBytes.subarray(0, 4).toString() !== "%PDF") throw new Error("The insurance file was not a PDF.");
  return nestedBytes;
}

export async function fetchExistingPolicy(policyNo: string, passportNo: string) {
  const policy = policyNo.trim();
  const passport = passportNo.trim();
  if (!policy || !passport) throw new Error("Policy number and passport number are required");
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/javascript, */*; q=0.01",
      origin: "https://epti-egy.org",
      referer: "https://epti-egy.org/Traveltargetweb/Pages/Policy_Qry2/Default.aspx",
      "user-agent": BROWSER,
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify({ polno: policy, NationalID: "", PassportID: passport }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("The insurance policy could not be found.");
  const payload = (await response.json().catch(() => null)) as { d?: unknown } | null;
  let data = payload?.d;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as unknown;
    } catch {
      /* the service sometimes returns the URL itself */
    }
  }
  const url = absolute(urlFrom(data));
  if (!url) throw new Error("The insurance policy could not be found.");
  return downloadPdf(url);
}
