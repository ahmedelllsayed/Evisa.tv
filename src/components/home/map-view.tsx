"use client";

import { LocateFixed, Map as MapIcon, Minus, Pause, Play, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { siteConfig } from "@/config/site.config";
import { flagUrl } from "@/lib/countries";
import { t } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination } from "@/lib/types";
import { visaHref } from "@/lib/href";
import { guaranteedDate } from "@/lib/visa";
import "leaflet/dist/leaflet.css";

/** Europe, Africa, the Middle East, and Asia — the framing in the reference. */
const HOME_BOUNDS: [[number, number], [number, number]] = [
  [-35, -18],
  [58, 150],
];

function inHomeFrame(destination: Destination) {
  if (destination.lat == null || destination.lng == null) return false;
  const [[south, west], [north, east]] = HOME_BOUNDS;
  return destination.lat >= south && destination.lat <= north && destination.lng >= west && destination.lng <= east;
}

/** Compact English pin date, including when the UI is Arabic: "04 OCT 26". */
function pinDate(hours: number) {
  const due = guaranteedDate(hours);
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: siteConfig.market.timeZone,
  }).formatToParts(due);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "").replace(/\./g, "").toUpperCase();
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${day} ${month} ${year}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function markerHtml(destination: Destination, locale: string) {
  const href = escapeHtml(visaHref(destination.slug, locale));
  const flag = escapeHtml(destination.flag || flagUrl(destination.code, 80));
  const showPill = destination.visaRequired && destination.processingHours != null;
  const flagHtml = `<span class="visa-pin-flag"><img src="${flag}" alt="" draggable="false" /></span>`;
  if (!showPill) {
    return `<a class="visa-pin-link is-flag" href="${href}">${flagHtml}</a>`;
  }
  const name = escapeHtml(localizedDestinationName(destination, locale));
  const date = escapeHtml(pinDate(destination.processingHours!));
  return `<a class="visa-pin-link" href="${href}">${flagHtml}<span class="visa-pin-pill"><strong>${name}</strong><em>${date}</em></span></a>`;
}

async function loadLeaflet() {
  const mod = await import("leaflet");
  const maybe = mod as typeof import("leaflet") & { default?: typeof import("leaflet") };
  return typeof maybe.map === "function" ? maybe : (maybe.default ?? maybe);
}

export function MapView({
  destinations,
  locale,
  onShowGrid,
}: {
  destinations: Destination[];
  locale: string;
  onShowGrid: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinsRef = useRef<Destination[]>([]);
  const linksRef = useRef<HTMLAnchorElement[]>([]);
  const indexRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  const pins = useMemo(
    () => destinations.filter((d) => d.lat != null && d.lng != null && d.isActive !== false),
    [destinations],
  );
  pinsRef.current = pins;

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let map: LeafletMap | undefined;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !host.current) return;
      map = L.map(host.current, {
        zoomControl: false,
        attributionControl: false,
        minZoom: 2,
        maxZoom: 8,
        zoomSnap: 0.25,
        worldCopyJump: false,
      });
      L.control.attribution({ prefix: false }).addTo(map);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        maxZoom: 19,
      }).addTo(map);
      const started = performance.now();
      let userMoved = false;
      const frame = () => {
        if (userMoved || !host.current || host.current.clientHeight < 120) return;
        map?.invalidateSize();
        map?.fitBounds(HOME_BOUNDS, { padding: [18, 28], animate: false, maxZoom: 4.25 });
      };
      requestAnimationFrame(() => requestAnimationFrame(frame));
      map.on("dragstart", () => {
        userMoved = true;
        setPaused(true);
      });
      map.on("zoomstart", (event) => {
        if ("originalEvent" in event && event.originalEvent) {
          userMoved = true;
          setPaused(true);
        }
      });
      observer = new ResizeObserver(() => {
        if (userMoved || performance.now() - started > 1500) map?.invalidateSize();
        else frame();
      });
      observer.observe(host.current);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let group: LayerGroup | undefined;
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled) return;
      group = L.layerGroup().addTo(map);
      const links: HTMLAnchorElement[] = [];
      for (const destination of pins) {
        const icon = L.divIcon({
          className: "visa-pin",
          iconSize: [1, 1],
          iconAnchor: [0, 0],
          html: markerHtml(destination, locale),
        });
        const marker = L.marker([destination.lat!, destination.lng!], { icon, keyboard: false, riseOnHover: true }).addTo(group);
        const link = marker.getElement()?.querySelector("a");
        if (link) {
          for (const type of ["mousedown", "touchstart", "dblclick"] as const) {
            L.DomEvent.on(link, type, L.DomEvent.stopPropagation);
          }
          links.push(link);
        }
      }
      linksRef.current = links;
    })();
    return () => {
      cancelled = true;
      linksRef.current = [];
      group?.remove();
    };
  }, [pins, locale, ready]);

  useEffect(() => {
    if (paused) {
      for (const link of linksRef.current) link.classList.remove("is-current");
      return;
    }
    if (!ready || pins.length === 0) return;
    const timer = window.setInterval(() => {
      const map = mapRef.current;
      const list = pinsRef.current.filter(inHomeFrame);
      if (!map || list.length === 0) return;
      const next = list[indexRef.current % list.length];
      indexRef.current += 1;
      for (const link of linksRef.current) {
        link.classList.toggle("is-current", link.getAttribute("href") === visaHref(next.slug, locale));
      }
    }, 6500);
    return () => window.clearInterval(timer);
  }, [ready, paused, pins.length, locale]);

  return (
    <div className="visa-map relative h-full w-full overflow-hidden rounded-t-[22px] bg-[#c5dff0]">
      <div ref={host} className="absolute inset-0" />
      <div className="absolute top-[46%] right-3 z-[500] flex -translate-y-1/2 flex-col items-center gap-3">
        <button
          type="button"
          aria-label={t(locale, "home.locate")}
          onClick={() => {
            setPaused(true);
            mapRef.current?.locate({ setView: true, maxZoom: 5 });
          }}
          className="flex size-10 items-center justify-center rounded-full bg-white text-[#202124] shadow-[0_6px_18px_rgba(17,24,39,0.16)]"
        >
          <LocateFixed className="size-4" strokeWidth={2.25} />
        </button>
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_6px_18px_rgba(17,24,39,0.16)]">
          <button
            type="button"
            aria-label={t(locale, "home.zoomIn")}
            onClick={() => mapRef.current?.zoomIn()}
            className="flex size-10 items-center justify-center text-[#202124]"
          >
            <Plus className="size-4" strokeWidth={2.25} />
          </button>
          <span className="mx-2.5 h-px bg-[#e6e8ee]" />
          <button
            type="button"
            aria-label={t(locale, "home.zoomOut")}
            onClick={() => mapRef.current?.zoomOut()}
            className="flex size-10 items-center justify-center text-[#202124]"
          >
            <Minus className="size-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      <div dir="ltr" className="absolute bottom-5 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-1 rounded-full bg-white py-1 ps-1 pe-1 shadow-[0_10px_28px_rgba(17,24,39,0.18)]">
        <button
          type="button"
          aria-label={paused ? t(locale, "home.play") : t(locale, "home.pause")}
          onClick={() => setPaused((value) => !value)}
          className="flex size-9 items-center justify-center rounded-full text-black"
        >
          {paused ? <Play className="size-4 fill-black text-black" /> : <Pause className="size-[18px]" strokeWidth={2.75} />}
        </button>
        <button
          type="button"
          aria-pressed
          aria-label={t(locale, "home.grid")}
          title={t(locale, "home.grid")}
          onClick={onShowGrid}
          className="flex size-9 items-center justify-center rounded-[11px] bg-[linear-gradient(145deg,#8a5cff_0%,#5057ea_52%,#3b78ff_100%)] text-white shadow-[0_4px_12px_rgba(80,87,234,0.4)]"
        >
          <MapIcon className="size-[18px]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
