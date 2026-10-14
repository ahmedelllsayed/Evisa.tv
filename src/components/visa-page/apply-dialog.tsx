"use client";

import { useState, useTransition } from "react";
import { startApplicationAction } from "@/app/actions/application";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { track } from "@/lib/analytics";
import { isArabicLocale, t, tf } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination, VisaOption } from "@/lib/types";
import { formatAt, formatMoney, guaranteedDate, optionHours, optionTotal, processingLabel } from "@/lib/visa";

export function ApplyDialog({
  open,
  onOpenChange,
  destination,
  option,
  locale,
  express,
  now,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: Destination;
  option: VisaOption;
  locale: string;
  express: boolean;
  now: Date;
}) {
  const [date, setDate] = useState<Date | undefined>();
  const [pending, start] = useTransition();
  const hours = optionHours(option, express);
  const fee = optionTotal(option, express);
  const name = localizedDestinationName(destination, locale);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-md rounded-2xl p-5 sm:max-w-md", isArabicLocale(locale) && "vp-ar")} showCloseButton>
        <DialogTitle className="font-display text-xl">{t(locale, "visa.departure")}</DialogTitle>
        <DialogDescription>{tf(locale, "visa.byDate", { name, date: formatAt(guaranteedDate(hours, now), locale) })}</DialogDescription>
        <Tabs defaultValue="fixed">
          <TabsList className="w-full">
            <TabsTrigger value="fixed">{t(locale, "visa.fixed")}</TabsTrigger>
            <TabsTrigger value="flexible">{t(locale, "visa.flexible")}</TabsTrigger>
          </TabsList>
          <TabsContent value="fixed" className="pt-3">
            <Calendar mode="single" selected={date} onSelect={setDate} disabled={{ before: new Date() }} />
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
              track("begin_checkout", { item_id: destination.slug, item_variant: option.label, value: fee });
              return startApplicationAction({
                locale,
                destinationId: destination.id,
                departureDate: date ? date.toISOString().slice(0, 10) : null,
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
