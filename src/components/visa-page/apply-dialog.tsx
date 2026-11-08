"use client";

import { useEffect, useState, useTransition } from "react";
import { startApplicationAction } from "@/app/actions/application";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { track } from "@/lib/analytics";
import { isArabicLocale, t, tf } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination, VisaOption } from "@/lib/types";
import { calendarDate, earliestDepartureDay, formatAt, formatMoney, guaranteedDate, optionHours, optionTotal, processingLabel } from "@/lib/visa";

function parseCalendarDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year!, (month ?? 1) - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function ApplyDialog({
  open,
  onOpenChange,
  destination,
  option,
  locale,
  express,
  now,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: Destination;
  option: VisaOption;
  locale: string;
  express: boolean;
  now: Date;
  initialDate?: string | null;
}) {
  const hours = optionHours(option, express);
  const fee = optionTotal(option, express);
  const name = localizedDestinationName(destination, locale);
  const due = guaranteedDate(hours, now);
  const earliestIso = earliestDepartureDay(hours, now);
  const earliest = parseCalendarDate(earliestIso);
  const [date, setDate] = useState<Date | undefined>(() => {
    const initial = parseCalendarDate(initialDate);
    return initial && earliest && initial >= earliest ? initial : undefined;
  });
  const [pending, start] = useTransition();
  useEffect(() => {
    const start = parseCalendarDate(earliestIso);
    setDate((current) => (current && start && current < start ? undefined : current));
  }, [earliestIso]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md rounded-2xl p-5 sm:max-w-md", isArabicLocale(locale) && "vp-ar")} showCloseButton>
        <DialogTitle className="font-display text-xl">{t(locale, "visa.departure")}</DialogTitle>
        <DialogDescription>{tf(locale, "visa.byDate", { name, date: formatAt(due, locale) })}</DialogDescription>
        <Tabs defaultValue="fixed">
          <TabsList className="w-full">
            <TabsTrigger value="fixed">{t(locale, "visa.fixed")}</TabsTrigger>
            <TabsTrigger value="flexible">{t(locale, "visa.flexible")}</TabsTrigger>
          </TabsList>
          <TabsContent value="fixed" className="pt-3">
            <Calendar mode="single" selected={date} onSelect={setDate} defaultMonth={earliest} disabled={earliest ? { before: earliest } : undefined} />
          </TabsContent>
          <TabsContent value="flexible" className="pt-3 text-sm text-slate-ink">
            {tf(locale, "visa.flexibleBody", { time: processingLabel(hours, locale) })}
          </TabsContent>
        </Tabs>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            start(() => {
              const departure = date && earliest && date >= earliest ? calendarDate(date) : null;
              track("begin_checkout", { item_id: destination.slug, item_variant: option.label, value: fee });
              return startApplicationAction({
                locale,
                destinationId: destination.id,
                departureDate: departure,
                express,
                visaOptionId: option.id || null,
              });
            })
          }
          className="mt-2 h-12 w-full rounded-full bg-[#ffd873] font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? t(locale, "visa.starting") : t(locale, "visa.proceed")}
        </button>
        <p className="text-center text-xs text-muted-ink">
          {t(locale, "visa.total")} {formatMoney(fee, option.currency, locale)}
        </p>
      </DialogContent>
    </Dialog>
  );
}
