import "server-only";

export function reservationKeys() {
  const duffel = process.env.DUFFEL_ACCESS_TOKEN?.trim() || "";
  const lite = process.env.LITEAPI_KEY?.trim() || "";
  const gemini = process.env.GEMINI_API_KEY?.trim() || "";
  const live = process.env.NODE_ENV === "production";
  return {
    duffel: live ? (duffel.startsWith("duffel_live_") ? duffel : "") : duffel.startsWith("duffel_") ? duffel : "",
    liteapi: /^(sand_|prod_)/i.test(lite) ? lite : "",
    gemini,
  };
}

export function e164(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("0")) return `+20${compact.slice(1)}`;
  return `+${compact}`;
}
