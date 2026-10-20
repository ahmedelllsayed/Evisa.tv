export const MAX_STAY_NIGHTS = 30;
export const MAX_HORIZON_DAYS = 334;

export function nightsBetween(a: string, b: string) {
  const ms = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
