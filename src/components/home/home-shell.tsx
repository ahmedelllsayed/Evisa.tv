"use client";

import { ChevronUp, LayoutGrid, Map as MapIcon, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { t, tf } from "@/lib/i18n";
import { useLocale } from "@/components/providers";
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
  citizenshipCodes = [],
  showMap = siteConfig.features.mapView,
  showEvents = siteConfig.features.events,
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
  citizenshipCodes?: string[];
  showMap?: boolean;
  showEvents?: boolean;
}) {
  const [tab, setTab] = useState<"explore" | "events">("explore");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [filters, setFilters] = useState<HomeFilters>(emptyFilters);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [mapHeight, setMapHeight] = useState("calc(100dvh - 4.75rem)");
  const mapOpen = view === "map" && tab === "explore";

  useEffect(() => {
    const collapseAt = 120;
    const expandAt = 8;
    let frame = 0;
    let current = false;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const next = current ? y > expandAt : y > collapseAt;
        if (next === current) return;
        const before = headerRef.current?.offsetHeight ?? 0;
        current = next;
        setCompact(next);
        requestAnimationFrame(() => {
          const after = headerRef.current?.offsetHeight ?? 0;
          const y2 = window.scrollY;
          // A shrinking header can pull scrollY back under the threshold and oscillate.
          if (next && y2 <= collapseAt) window.scrollTo({ top: collapseAt + 1, behavior: "auto" });
          else if (!next && before && after > before && y2 >= expandAt) window.scrollTo({ top: 0, behavior: "auto" });
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!mapOpen) return;
    document.documentElement.dataset.homeMap = "on";
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    const fit = () => {
      const top = stageRef.current?.getBoundingClientRect().top ?? 0;
      setMapHeight(`${Math.max(280, Math.round(window.innerHeight - top))}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (stageRef.current?.previousElementSibling) observer.observe(stageRef.current.previousElementSibling);
    window.addEventListener("resize", fit);
    return () => {
      delete document.documentElement.dataset.homeMap;
      document.body.style.overflow = previousOverflow;
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [mapOpen]);

  const filtered = useMemo(
    () => destinations.filter((d) => matchesFilters(d, filters)),
    [destinations, filters],
  );

  return (
    <>
      <header
        ref={headerRef}
        style={{ overflowAnchor: "none" }}
        className={cn("sticky top-0 z-40 bg-white", (compact || mapOpen) && "shadow-[0_8px_24px_rgba(17,24,39,0.06)]")}
      >
        <div className={cn("mx-auto hidden gap-4 px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]", mapOpen ? "max-w-none items-center py-3" : "max-w-site items-start pt-5 pb-2")}>
          <div className="flex items-center gap-3">
            <Link href={href("/", locale)} aria-label={brandName}>
              <Logo name={brandName} src={logoUrl} />
            </Link>
            <Link href={href("/on-time-guaranteed", locale)} className="ms-2 flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-[#d5d8de]">
                <ShieldCheckIcon className="text-brand" />
              </span>
              <span className="text-[11px] leading-[1.15] font-semibold">
                {t(locale, "home.visasOnTime")}
                <span className="block font-medium text-[#3c4048]">{t(locale, "home.guaranteed")}</span>
              </span>
            </Link>
          </div>
          <div className="flex justify-center">
            {mapOpen ? (
              <button
                type="button"
                aria-label={t(locale, "home.searchCountry")}
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-[4.5rem] items-center justify-center rounded-2xl border border-[#e4e4e4] text-muted-ink"
              >
                <SearchIcon />
              </button>
            ) : compact && tab === "explore" ? (
              <FilterBar locale={locale} filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} compact />
            ) : (
              <ExploreTabs tab={tab} onTab={setTab} showEvents={showEvents} />
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            {!mapOpen && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={cn(
                  "flex items-center gap-2 text-sm text-muted-ink",
                  compact ? "size-10 justify-center rounded-full border border-[#e6e6e6]" : "h-10 rounded-full border border-[#e4e4e4] px-4",
                )}
              >
                <SearchIcon />
                {!compact && t(locale, "home.searchCountry")}
              </button>
            )}
            <CitizenshipButton initial={citizenship} codes={citizenshipCodes} className="border-0" />
            <UserMenu user={user} locale={locale} className="border-0" />
          </div>
        </div>
        <div
          className={cn(
            "mx-auto hidden overflow-hidden px-6 transition-[grid-template-rows,padding,opacity] duration-200 lg:grid",
            mapOpen || compact || tab !== "explore" ? "pointer-events-none grid-rows-[0fr] py-0 opacity-0" : "grid-rows-[1fr] pt-8 pb-6 opacity-100",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex justify-center">
              <FilterBar locale={locale} filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 lg:hidden">
          {mapOpen ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link href={href("/", locale)} aria-label={brandName}>
                  <Logo name={brandName} src={logoUrl} />
                </Link>
                <span className="text-[11px] font-semibold tracking-[0.08em]">{t(locale, "home.visasOnTime")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t(locale, "home.searchCountry")}
                  onClick={() => setSearchOpen(true)}
                  className="flex size-10 items-center justify-center rounded-2xl border border-[#e4e4e4] text-muted-ink"
                >
                  <SearchIcon />
                </button>
                <CitizenshipButton initial={citizenship} codes={citizenshipCodes} />
              </div>
            </div>
          ) : (
            <>
              <div className={cn("grid transition-[grid-template-rows,opacity] duration-200", compact ? "pointer-events-none grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100")}>
                <div className="overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link href={href("/", locale)} aria-label={brandName}>
                        <Logo name={brandName} src={logoUrl} />
                      </Link>
                      <span className="text-[11px] font-semibold tracking-[0.08em]">{t(locale, "home.visasOnTime")}</span>
                    </div>
                    <CitizenshipButton initial={citizenship} codes={citizenshipCodes} />
                  </div>
                  <div className="mt-3">
                    <ExploreTabs tab={tab} onTab={setTab} showEvents={showEvents} />
                  </div>
                </div>
              </div>
              <div className={cn("flex items-center gap-2", !compact && "mt-3")}>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm text-muted-ink"
                >
                  <Search className="size-4" /> {t(locale, "home.searchCountry")}
                </button>
                <button
                  type="button"
                  aria-label={t(locale, "home.filters")}
                  onClick={() => setFiltersOpen(true)}
                  className="flex size-12 items-center justify-center rounded-full border border-line"
                >
                  <SlidersHorizontal className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5">
          <SheetHeader>
            <SheetTitle>{t(locale, "home.filters")}</SheetTitle>
          </SheetHeader>
          <FilterBar locale={locale} filters={filters} onChange={setFilters} destinations={destinations} holidays={holidays} />
        </SheetContent>
      </Sheet>

      {citizenship !== siteConfig.market.countryCode && (
        <p className="bg-brand-50 px-4 py-2 text-center text-sm text-brand-700">
          {tf(locale, "home.passportNote", { demonym: siteConfig.market.demonym, code: citizenship })}
        </p>
      )}

      <div ref={stageRef} className={cn("relative", mapOpen ? "overflow-hidden bg-white" : "pb-8")} style={mapOpen ? { height: mapHeight } : undefined}>
        {tab === "explore" ? (
          <>
            {view === "grid" ? (
              <DestinationGrid destinations={filtered} locale={locale} />
            ) : (
              <MapView destinations={filtered} locale={locale} onShowGrid={() => setView("grid")} />
            )}
            {showMap && view === "grid" && (
              <div className="pointer-events-none fixed bottom-32 left-1/2 z-20 -translate-x-1/2 lg:bottom-8">
                <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-[0_10px_28px_rgba(17,24,39,0.18)]">
                  <button
                    type="button"
                    aria-label={t(locale, "home.grid")}
                    onClick={() => setView("grid")}
                    className="flex size-9 items-center justify-center rounded-full text-black"
                  >
                    <LayoutGrid className="size-[18px]" strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    aria-label={t(locale, "home.map")}
                    onClick={() => setView("map")}
                    className="flex size-9 items-center justify-center rounded-full text-[#b0b6be]"
                  >
                    <MapIcon className="size-[18px]" strokeWidth={2.2} />
                  </button>
                </div>
              </div>
            )}
            {view === "grid" && (
            <button
              type="button"
              aria-label={t(locale, "home.top")}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed right-3 bottom-32 z-20 flex size-11 items-center justify-center rounded-full bg-white shadow-float lg:hidden"
            >
              <ChevronUp className="size-5" />
            </button>
            )}
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

function ExploreTabs({ tab, onTab, showEvents }: { tab: "explore" | "events"; onTab: (t: "explore" | "events") => void; showEvents: boolean }) {
  const locale = useLocale();
  if (!showEvents) return null;
  const items = [
    { id: "explore" as const, label: t(locale, "home.explore"), icon: <PassportIcon className="size-9" />, bubble: "bg-linear-to-b from-[#F4F4F4] to-white" },
    { id: "events" as const, label: t(locale, "home.events"), icon: <TicketsIcon className="size-9" />, bubble: "bg-linear-to-b from-[#F6F1E6] to-[#fff8ee]" },
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
