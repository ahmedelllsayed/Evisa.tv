"use client";

import { useState, useTransition } from "react";
import { startApplicationAction } from "@/app/actions/application";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t, tf } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination } from "@/lib/types";
import { formatAt, formatMoney, guaranteedDate, processingLabel, totalFee } from "@/lib/visa";

export function StartApplication({
  destination,
  locale,
  express,
  existingId,
  defaultOpen = false,
  now,
}: {
  destination: Destination;
  locale: string;
  express: boolean;
  existingId?: string | null;
  defaultOpen?: boolean;
  now: Date;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [date, setDate] = useState<Date | undefined>();
  const [pending, start] = useTransition();
  const hours = express && destination.expressHours ? destination.expressHours : destination.processingHours ?? 72;

  const name = localizedDestinationName(destination, locale);
  if (!destination.visaRequired) return null;

  return (
    <>
      {existingId ? (
        <a
          href={`/${locale}/apply/${existingId}`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-brand font-medium text-white"
        >
          {t(locale, "visa.resume")}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center justify-center rounded-full bg-brand font-medium text-white"
        >
          {t(locale, "visa.start")}
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5 sm:max-w-md" showCloseButton>
          <DialogTitle className="font-display text-xl">{t(locale, "visa.departure")}</DialogTitle>
          <DialogDescription>
            {tf(locale, "visa.byDate", { name, date: formatAt(guaranteedDate(hours, now), locale) })}
          </DialogDescription>
          <Tabs defaultValue="fixed">
            <TabsList className="w-full">
              <TabsTrigger value="fixed">{t(locale, "visa.fixed")}</TabsTrigger>
              <TabsTrigger value="flexible">{t(locale, "visa.flexible")}</TabsTrigger>
            </TabsList>
            <TabsContent value="fixed" className="pt-3">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={{ before: new Date() }}
              />
            </TabsContent>
            <TabsContent value="flexible" className="pt-3 text-sm text-slate-ink">
              {tf(locale, "visa.flexibleBody", { time: processingLabel(hours, locale) })}
            </TabsContent>
          </Tabs>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(() =>
                startApplicationAction({
                  locale,
                  destinationId: destination.id,
                  departureDate: date ? date.toISOString().slice(0, 10) : null,
                  express,
                }),
              )
            }
            className="mt-2 h-12 w-full rounded-full bg-[#ffd873] font-semibold text-black disabled:opacity-60"
          >
            {pending ? t(locale, "visa.starting") : t(locale, "visa.proceed")}
          </button>
          <p className="text-center text-xs text-muted-ink">
            {t(locale, "visa.total")} {formatMoney(totalFee(destination) + (express ? (destination.expressFee ?? 0) : 0), destination.currency, locale)}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
