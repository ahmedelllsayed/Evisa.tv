import { env } from "@/lib/public-env";

export function couponLink(code: string) {
  return `${env.siteUrl.replace(/\/$/, "")}/ar-EG?coupon=${code}`;
}
