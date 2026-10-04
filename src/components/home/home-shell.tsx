"use client";

import { ChevronUp, LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { PassportIcon, SearchIcon, ShieldCheckIcon, TicketsIcon } from "@/components/brand/icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EventsPanel } from "@/components/home/events-panel";
import { FilterBar } from "@/components/home/filter-bar";
import { DestinationGrid } from "@/components/home/destination-card";
import { MapView } from "@/components/home/map-view";
import { CitizenshipButton } from "@/components/layout/citizenship-picker";
import { UserMenu } from "@/components/layout/user-menu";
import { CountrySearchOverlay } from "@/components/search/country-search";
import { siteConfig } from "@/config/site.config";
import { href } from "@/lib/href";
import type { SearchHit } from "@/lib/search";
import type { Destination, Holiday, TravelEvent, User } from "@/lib/types";
import { matchesFilters, type HomeFilters } from "@/lib/visa";
import { cn } from "@/lib/utils";

const emptyFilters: HomeFilters = { delivery: "any", type: "any", documents: "any", before: null, query: "" };

export function HomeShell({
  locale,
  user,
  citizenship,
  destinations,
  events,
  holidays,
  hits,
  brandName,
  logoUrl,
}: {
  locale: string;
  user: User | null;
  citizenship: string;
  destinations: Destination[];
  events: TravelEvent[];
  holidays: Holiday[];
  hits: SearchHit[];
  brandName: string;
  logoUrl: string;
}) {
  const [tab, setTab] = useState<"explore" | "events">("explore");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [filters, setFilters] = useState<HomeFilters>(emptyFilters);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(
    () => destinations.filter((d) => matchesFilters(d, filters)),
    [destinations, filters],
  );

  return (
    <>
      <header className={cn("sticky top-0 z-40 bg-white", compact && "shadow-[0_8px_24px_rgba(17,24,39,0.06)]")}>
        <div className="mx-auto hidden max-w-site items-start gap-4 px-8 pt-5 pb-2 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <Link href={href("/", locale)} aria-label={brandName}>
              <Logo name={brandName} src={logoUrl} />
            </Link>
            <Link href={href("/on-time-guaranteed", locale)} className="ml-2 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-[#d5d8de]">
                <ShieldCheckIcon className="text-brand" />
              </span>
              <span className="text-[11px] leading-[1.15] font-semibold">
                Visas On Time
                <span className="block font-medium text-[#3c4048]">Guaranteed</span>
              </span>
            </Link>
          </div>
          <div className="flex justify-center">
            {compact && tab === "explore" ? (
              <FilterBar filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} compact />
            ) : (
              <ExploreTabs tab={tab} onTab={setTab} />
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex items-center gap-2 text-sm text-muted-ink",
                compact ? "size-10 justify-center rounded-full border border-[#e6e6e6]" : "h-10 rounded-full border border-[#e4e4e4] px-4",
              )}
            >
              <SearchIcon />
              {!compact && "Search Country"}
            </button>
            <CitizenshipButton initial={citizenship} className="border-0" />
            <UserMenu user={user} locale={locale} className="border-0" />
          </div>
        </div>
        {!compact && tab === "explore" && (
          <div className="mx-auto hidden justify-center px-6 pt-8 pb-6 lg:flex">
            <FilterBar filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} />
          </div>
        )}

        <div className="px-4 py-3 lg:hidden">
          {!compact && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link href={href("/", locale)} aria-label={brandName}>
                    <Logo name={brandName} src={logoUrl} />
                  </Link>
                  <span className="text-[11px] font-semibold tracking-[0.08em]">VISAS ON TIME</span>
                </div>
                <CitizenshipButton initial={citizenship} />
              </div>
              <div className="mt-3">
                <ExploreTabs tab={tab} onTab={setTab} />
              </div>
            </>
          )}
          <div className={cn("flex items-center gap-2", !compact && "mt-3")}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm text-muted-ink"
            >
              <Search className="size-4" /> Search Country
            </button>
            <button
              type="button"
              aria-label="Filters"
              onClick={() => setFiltersOpen(true)}
              className="flex size-12 items-center justify-center rounded-full border border-line"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </header>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterBar filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} />
        </SheetContent>
      </Sheet>

      {citizenship !== siteConfig.market.countryCode && (
        <p className="bg-brand-50 px-4 py-2 text-center text-sm text-brand-700">
          Visa data is currently shown for {siteConfig.market.demonym} passports. Requirements for {citizenship} may differ.
        </p>
      )}

      <div className="relative pb-8">
        {tab === "explore" ? (
          <>
            {view === "grid" ? (
              <DestinationGrid destinations={filtered} locale={locale} />
            ) : (
              <MapView destinations={filtered} locale={locale} />
            )}
            {siteConfig.features.mapView && (
              <div className="pointer-events-none fixed bottom-32 left-1/2 z-20 -translate-x-1/2 lg:bottom-8">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-[0_10px_28px_rgba(17,24,39,0.18)]">
                  <button
                    type="button"
                    aria-label="Grid"
                    onClick={() => setView("grid")}
                    className={cn("flex size-9 items-center justify-center rounded-full", view === "grid" ? "text-black" : "text-[#b0b6be]")}
                  >
                    <LayoutGrid className="size-[18px]" strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    aria-label="Map"
                    onClick={() => setView("map")}
                    className={cn("flex size-9 items-center justify-center rounded-full", view === "map" ? "text-black" : "text-[#b0b6be]")}
                  >
                    <MapIcon className="size-[18px]" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              aria-label="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed right-3 bottom-32 z-20 flex size-11 items-center justify-center rounded-full bg-white shadow-float lg:hidden"
            >
              <ChevronUp className="size-5" />
            </button>
          </>
        ) : (
          <div className="pt-6">
            <EventsPanel events={events} destinations={destinations} locale={locale} />
          </div>
        )}
      </div>

      <CountrySearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        hits={hits}
        locale={locale}
        query={query}
        onQuery={setQuery}
      />
    </>
  );
}

function ExploreTabs({ tab, onTab }: { tab: "explore" | "events"; onTab: (t: "explore" | "events") => void }) {
  if (!siteConfig.features.events) return null;
  const items = [
    { id: "explore" as const, label: "Explore", icon: <PassportIcon className="size-9" />, bubble: "bg-linear-to-b from-[#F4F4F4] to-white" },
    { id: "events" as const, label: "Events", icon: <TicketsIcon className="size-9" />, bubble: "bg-linear-to-b from-[#F6F1E6] to-[#fff8ee]" },
  ];
  return (
    <div className="flex items-start justify-center gap-8">
      {items.map((item) => {
        const active = tab === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onTab(item.id)} className="flex w-[68px] flex-col items-center">
            <span className={cn("flex size-[68px] items-center justify-center rounded-full", item.bubble)}>
              {item.icon}
            </span>
            <span className={cn("mt-[10px] text-sm leading-4 font-bold tracking-[-0.28px]", active ? "text-black" : "text-[#8b919a]")}>{item.label}</span>
            <span className={cn("mt-[10px] h-[3px] w-6 rounded-full", active ? "bg-black" : "bg-transparent")} />
          </button>
        );
      })}
    </div>
  );
}
