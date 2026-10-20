import "server-only";

const ENDPOINT = "https://epti-egy.org/Traveltargetweb/ChartService.asmx/polprint_en";

function absolute(raw: string) {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://epti-egy.org/${value.replace(/^\//, "")}`;
}

export async function fetchExistingPolicy(policyNo: string, passportNo: string) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ polno: policyNo.trim(), NationalID: "", PassportID: passportNo.trim() }),
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
  const url =
    typeof data === "string"
      ? data
      : data && typeof data === "object"
        ? String((data as { Url?: string; url?: string }).Url || (data as { url?: string }).url || "")
        : "";
  if (!url) throw new Error("The insurance policy could not be found.");
  const file = await fetch(absolute(url), { signal: AbortSignal.timeout(30_000) });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!file.ok || bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("The insurance file was not a PDF.");
  return bytes;
}
