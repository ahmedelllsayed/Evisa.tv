"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { startReservationCheckout } from "@/app/actions/reservations";
import { track } from "@/lib/analytics";
import { href } from "@/lib/href";

export function ReservationSuccess({
  locale,
  arabic,
  status,
  reference,
  token,
  id,
}: {
  locale: string;
  arabic: boolean;
  status: string;
  reference: string;
  token: string;
  id: string;
}) {
  const paid = status !== "pending_payment";
  useEffect(() => {
    if (paid) track("reservation_payment_success", { item_id: reference });
  }, [paid, reference]);
  useEffect(() => {
    if (status !== "paid" && status !== "fulfilling") return;
    const timer = setTimeout(() => window.location.reload(), 5000);
    return () => clearTimeout(timer);
  }, [status]);
  const copy = arabic
    ? {
        title: paid ? "تم استلام الدفع" : "لم يكتمل الدفع",
        body: status === "sent"
          ? "أُرسلت الملفات إلى بريدك."
          : status === "needs_attention"
            ? "الدفع تم. نكمل الحجز وسنرسل الملفات عندما تجهز."
            : paid
              ? "جارٍ إنشاء الحجز وتجهيز الملفات."
              : "يمكنك إعادة الدفع. لن يُنشأ حجز قبل نجاحه.",
        statusLink: "صفحة الطلب",
        retry: "إعادة الدفع",
      }
    : {
        title: paid ? "Payment received" : "Payment was not completed",
        body: status === "sent"
          ? "The files were sent to your email."
          : status === "needs_attention"
            ? "Payment is in. We are finishing the booking and will email the files when they are ready."
            : paid
              ? "The booking is being created and the files are being prepared."
              : "You can pay again. Nothing is booked before a successful payment.",
        statusLink: "Order status",
        retry: "Pay again",
      };
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[28px] border border-line bg-white px-6 py-10">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e9f9ef] text-xl text-[#14713a]"
        >
          {paid ? "✓" : "!"}
        </motion.span>
        <h1 className="mt-5 text-2xl font-semibold text-[#16182b]">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-ink">{reference}</p>
        <p className="mt-3 text-sm leading-relaxed text-body">{copy.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`${href("/travel-reservations/status", locale)}?token=${encodeURIComponent(token)}`} className="inline-flex h-11 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
            {copy.statusLink}
          </Link>
          {status === "pending_payment" && (
            <button
              className="h-11 rounded-full border border-line text-sm"
              onClick={() => {
                void startReservationCheckout(id, locale).then((result) => {
                  if (result.ok) window.location.assign(result.url);
                });
              }}
            >
              {copy.retry}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
