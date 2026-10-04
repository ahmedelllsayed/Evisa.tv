"use client";

import { useState, useTransition } from "react";
import { startApplicationAction } from "@/app/actions/application";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  if (!destination.visaRequired) return null;

  return (
    <>
      {existingId ? (
        <a
          href={`/${locale}/apply/${existingId}`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-brand font-medium text-white"
        >
          Resume Application
        </a>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center justify-center rounded-full bg-brand font-medium text-white"
        >
          Start Application
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5 sm:max-w-md" showCloseButton>
          <DialogTitle className="font-display text-xl">Select your departure date</DialogTitle>
          <DialogDescription>
            We’ll guarantee your {destination.name} visa by {formatAt(guaranteedDate(hours, now))}.
          </DialogDescription>
          <Tabs defaultValue="fixed">
            <TabsList className="w-full">
              <TabsTrigger value="fixed">Fixed Dates</TabsTrigger>
              <TabsTrigger value="flexible">Flexible</TabsTrigger>
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
              No need to pick a date. We’ll still guarantee delivery in {processingLabel(hours)}.
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
            {pending ? "Starting…" : "Proceed to Application"}
          </button>
          <p className="text-center text-xs text-muted-ink">
            Total {formatMoney(totalFee(destination) + (express ? (destination.expressFee ?? 0) : 0), destination.currency)}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
