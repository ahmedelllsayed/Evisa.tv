export type PhoneFormat = "plus" | "digits" | "local";

/** International form with a leading +, assuming Egypt for local numbers. Null when it cannot be a mobile number. */
export function normalizePhone(raw: string | null | undefined, countryCode = "20") {
  const text = (raw ?? "").trim();
  if (!text) return null;
  let digits = text.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    return rest.length >= 8 && rest.length <= 15 ? `+${rest}` : null;
  }
  digits = digits.replace(/\D/g, "");
  if (countryCode === "20") {
    if (/^01[0125]\d{8}$/.test(digits)) return `+20${digits.slice(1)}`;
    if (/^1[0125]\d{8}$/.test(digits)) return `+20${digits}`;
    if (/^201[0125]\d{8}$/.test(digits)) return `+${digits}`;
    return null;
  }
  if (digits.startsWith(countryCode) && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  const local = digits.replace(/^0/, "");
  const full = `${countryCode}${local}`;
  return full.length >= 10 && full.length <= 15 ? `+${full}` : null;
}

/** GOWA addresses a private chat as the international digits plus `@s.whatsapp.net`. */
export function gowaPhone(e164: string) {
  return `${e164.replace(/\D/g, "")}@s.whatsapp.net`;
}

export function phoneForProvider(e164: string, format: PhoneFormat, countryCode = "20") {
  const digits = e164.replace(/\D/g, "");
  if (format === "plus") return `+${digits}`;
  if (format === "local" && digits.startsWith(countryCode)) return `0${digits.slice(countryCode.length)}`;
  return digits;
}

const gsmBasic =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const gsmExtended = "^{}\\[~]|€\f";

/** Characters and message parts as most carriers count them. Arabic text uses the shorter unicode parts. */
export function smsParts(text: string) {
  let units = 0;
  let unicode = false;
  for (const char of text) {
    if (gsmBasic.includes(char)) units += 1;
    else if (gsmExtended.includes(char)) units += 2;
    else {
      unicode = true;
      break;
    }
  }
  if (unicode) {
    const length = [...text].length;
    return { chars: length, parts: length <= 70 ? 1 : Math.ceil(length / 67), unicode: true };
  }
  return { chars: units, parts: units <= 160 ? 1 : Math.ceil(units / 153), unicode: false };
}
