"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function PurchaseBeacon({ id, value, currency }: { id: string; value: number; currency: string }) {
  useEffect(() => {
    const key = `purchase:${id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    track("purchase", { transaction_id: id, value, currency });
  }, [id, value, currency]);
  return null;
}
