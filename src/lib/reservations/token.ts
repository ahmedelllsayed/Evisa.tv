import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

export function travelToken(id: string) {
  const signature = createHmac("sha256", serverEnv().authSecret).update(`travel:${id}`).digest("base64url");
  return `${id}.${signature}`;
}

export function readTravelToken(token: string) {
  const split = token.indexOf(".");
  if (split < 1) return null;
  const id = token.slice(0, split);
  const given = token.slice(split + 1);
  const expected = createHmac("sha256", serverEnv().authSecret).update(`travel:${id}`).digest("base64url");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}
