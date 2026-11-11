export type TravelerDraft = {
  id?: string;
  firstName: string;
  lastName: string;
  sex: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};

export type ApplyStepId = "travelers" | "documents" | "answers" | "review" | "payment";

const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const latinName = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F' .-]*$/u;
const phoneChars = /^\+?[\d\s().-]+$/;

export function toDraft(source?: {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
} | null): TravelerDraft {
  return {
    id: source?.id,
    firstName: source?.firstName ?? "",
    lastName: source?.lastName ?? "",
    sex: source?.sex ?? "",
    dateOfBirth: source?.dateOfBirth ?? "",
    nationality: source?.nationality ?? "",
    passportNumber: source?.passportNumber ?? "",
    passportExpiry: source?.passportExpiry ?? "",
  };
}

export function nameProblem(value: string): "empty" | "letters" | "long" | null {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return "empty";
  if (name.length > 50) return "long";
  if (!latinName.test(name)) return "letters";
  return null;
}

export function dobProblem(value: string, today: string): "empty" | "future" | "year" | null {
  const date = value.trim();
  if (!isoDay.test(date)) return "empty";
  if (today && date >= today) return "future";
  if (today && date < shiftYears(today, -120)) return "year";
  return null;
}

/**
 * Same comparison as saveTravelersAction: the passport must still be valid
 * 180 days after departure. A departure that does not parse does not block.
 */
export function passportTooShort(expiry: string, departure: string | null) {
  if (!departure) return false;
  const expiryMs = Date.parse(`${expiry}T00:00:00Z`);
  const departMs = Date.parse(`${departure}T00:00:00Z`);
  if (Number.isNaN(expiryMs)) return true;
  if (Number.isNaN(departMs)) return false;
  return expiryMs < departMs + 180 * 864e5;
}

export function passportProblem(expiry: string, departure: string | null, today: string): "empty" | "expired" | "short" | null {
  const value = expiry.trim();
  if (!isoDay.test(value)) return "empty";
  if (today && value <= today) return "expired";
  if (passportTooShort(value, departure)) return "short";
  return null;
}

/** Soft warning when there is no trip date and the passport expires within 180 days. */
export function warnsSixMonths(expiry: string, departure: string | null, today: string) {
  if (departure || passportProblem(expiry, null, today)) return false;
  const expiryMs = Date.parse(`${expiry.trim()}T00:00:00Z`);
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(expiryMs) || Number.isNaN(todayMs)) return false;
  const days = (expiryMs - todayMs) / 864e5;
  return days > 0 && days < 180;
}

export function travelerBlocks(draft: TravelerDraft, departure: string | null, today: string) {
  return (
    nameProblem(draft.firstName) !== null ||
    nameProblem(draft.lastName) !== null ||
    dobProblem(draft.dateOfBirth, today) !== null ||
    !draft.passportNumber.trim() ||
    passportProblem(draft.passportExpiry, departure, today) !== null
  );
}

export function phoneOk(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !phoneChars.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= 8 && digits <= 15;
}

export function forwardUnlocked(target: ApplyStepId, ready: { travelers: boolean; documents: boolean; answers?: boolean }) {
  if (target === "travelers") return true;
  if (target === "documents") return ready.travelers;
  if (target === "answers") return ready.travelers && ready.documents;
  return ready.travelers && ready.documents && ready.answers !== false;
}

/** Scales the stored fees when the traveller count changes before a payment exists. */
export function feePreview(
  fees: { govFee: number; serviceFee: number; travelerCount: number },
  nextCount: number,
  locked: boolean,
) {
  const base = Math.max(1, fees.travelerCount);
  const count = locked ? base : Math.max(1, nextCount);
  const gov = (fees.govFee / base) * count;
  const service = (fees.serviceFee / base) * count;
  return { gov, service, total: gov + service, count };
}

function shiftYears(iso: string, years: number) {
  return `${String(Number(iso.slice(0, 4)) + years).padStart(4, "0")}${iso.slice(4)}`;
}
