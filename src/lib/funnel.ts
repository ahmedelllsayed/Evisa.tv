export const funnelEvents = [
  "view_visa",
  "begin_application",
  "travelers_done",
  "documents_done",
  "reach_payment",
  "payment_start",
  "payment_success",
  "payment_failed",
  "offer_click",
] as const;

export type FunnelEvent = (typeof funnelEvents)[number];

const aliases: Record<string, FunnelEvent> = {
  begin_checkout: "begin_application",
  add_payment_info: "payment_start",
  purchase: "payment_success",
};

export function funnelName(event: string): FunnelEvent | null {
  if ((funnelEvents as readonly string[]).includes(event)) return event as FunnelEvent;
  return aliases[event] ?? null;
}
