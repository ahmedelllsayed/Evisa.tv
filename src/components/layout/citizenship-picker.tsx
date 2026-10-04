"use client";

import { Pencil } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { siteConfig } from "@/config/site.config";
import { countries, countryName, flagUrl } from "@/lib/countries";
import { cn } from "@/lib/utils";

function setCitizenshipCookie(code: string) {
  document.cookie = `citizenship=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function Flag({ code, size = 20, className }: { code: string; size?: number; className?: string }) {
  return (
    <Image
      src={flagUrl(code, 40)}
      alt={`flag of ${code}`}
      width={size}
      height={size}
      unoptimized
      className={cn("aspect-square rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

function CountryList({ value, onSelect }: { value: string; onSelect: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const list = useMemo(
    () => countries.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query],
  );
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Enter a new citizenship</p>
      <label className="flex items-center gap-2 rounded-full border border-line px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a country"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <p className="mt-3 mb-2 flex items-center justify-between text-xs text-muted-ink">
        <span>All citizenships</span>
        <span>[{countries.length}]</span>
      </p>
      <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
        {list.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c.code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-sm",
              c.code === value ? "border-brand" : "border-line",
            )}
          >
            <Flag code={c.code} size={16} />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function useCitizenship(initial: string) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const select = (code: string) => {
    setValue(code);
    setCitizenshipCookie(code);
    startTransition(() => router.refresh());
  };
  return { value, select };
}

/** Round flag button in the header that opens the citizenship list. */
export function CitizenshipButton({ initial, className }: { initial: string; className?: string }) {
  const { value, select } = useCitizenship(initial);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Change citizenship"
        className={cn(
          "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-white",
          className,
        )}
      >
        <Flag code={value} size={20} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[28rem] rounded-2xl p-4">
        <p className="text-base font-semibold">Your citizenship</p>
        <p className="text-xs text-slate-ink">
          This is the nationality on your passport. It determines your visa requirements.
        </p>
        <CountryList
          value={value}
          onSelect={(code) => {
            select(code);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** First-visit modal on visa pages ("Your citizenship"). */
export function CitizenshipDialog({ initial, defaultOpen }: { initial: string; defaultOpen: boolean }) {
  const { value, select } = useCitizenship(initial);
  const [open, setOpen] = useState(defaultOpen);
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setCitizenshipCookie(value);
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl rounded-2xl p-5 sm:max-w-xl">
        <DialogTitle className="text-lg font-semibold">Your citizenship</DialogTitle>
        <DialogDescription className="text-slate-ink">
          This is the nationality mentioned on your passport. It determines your visa requirements and where you can
          travel visa-free
        </DialogDescription>
        <p className="mt-2 text-sm">I live in {siteConfig.market.countryName} and am a citizen of</p>
        <span className="flex w-fit items-center gap-2 rounded-lg bg-[#E5F9E7] px-2.5 py-1.5 text-sm">
          <Flag code={value} size={16} />
          {countryName(value)}
          <Pencil className="ml-3 size-3.5 text-brand" />
        </span>
        <CountryList value={value} onSelect={select} />
      </DialogContent>
    </Dialog>
  );
}
