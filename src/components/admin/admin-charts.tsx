"use client";

import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: "#64748B", tick: { fill: "#94A3B8" } } as const;
const grid = "#1A2130";
const cursor = { stroke: "#334155", strokeDasharray: "3 3" };
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function dayTick(value: unknown) {
  const [, month, day] = String(value).split("-");
  const index = Number(month) - 1;
  return day && months[index] ? `${day} ${months[index]}` : String(value);
}

function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: string; color: string }[] }) {
  return (
    <div className="min-w-36 rounded-lg border border-[#273042] bg-[#0b0f17]/95 px-3 py-2 shadow-xl shadow-black/50 backdrop-blur">
      <p className="font-mono text-[11px] text-muted-foreground">{title}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <p key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: row.color }} />
              {row.label}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">{row.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Frame({ children, height = "h-60" }: { children: ReactNode; height?: string }) {
  return (
    <div className={`${height} w-full`} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Gradient({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

export function AdminRevenueChart({ data }: { data: { day: string; revenue: number; n: number }[] }) {
  const color = "#34D399";
  return (
    <Frame height="h-72">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="day" tickFormatter={dayTick} minTickGap={24} {...axis} />
        <YAxis width={44} tickFormatter={(value) => compactFormat.format(Number(value))} {...axis} />
        <Tooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
          content={({ active, payload, label }) => {
            const row = payload?.[0]?.payload as { revenue: number; n: number } | undefined;
            if (!active || !row) return null;
            return (
              <TooltipCard
                title={dayTick(label)}
                rows={[
                  { label: "الإيراد", value: `${numberFormat.format(row.revenue)} EGP`, color },
                  { label: "طلبات مدفوعة", value: numberFormat.format(row.n), color: "#64748B" },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="revenue" fill={color} fillOpacity={0.85} radius={[3, 3, 0, 0]} animationDuration={500} maxBarSize={18} />
      </BarChart>
    </Frame>
  );
}

export function AdminAreaChart({ data, label = "الطلبات" }: { data: { day: string; n: number }[]; label?: string }) {
  const color = "#38BDF8";
  return (
    <Frame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <Gradient id="count-fill" color={color} />
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="day" tickFormatter={dayTick} minTickGap={24} {...axis} />
        <YAxis allowDecimals={false} width={32} {...axis} />
        <Tooltip
          cursor={cursor}
          content={({ active, payload, label: day }) => {
            const row = payload?.[0]?.payload as { n: number } | undefined;
            if (!active || !row) return null;
            return <TooltipCard title={dayTick(day)} rows={[{ label, value: numberFormat.format(row.n), color }]} />;
          }}
        />
        <Area type="monotoneX" dataKey="n" stroke={color} strokeWidth={2} fill="url(#count-fill)" activeDot={{ r: 4, strokeWidth: 0, fill: color }} animationDuration={500} />
      </AreaChart>
    </Frame>
  );
}

export function AdminHoursChart({ data, average }: { data: { day: string; hours: number | null }[]; average?: number }) {
  const color = "#FBBF24";
  return (
    <Frame>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="day" tickFormatter={dayTick} minTickGap={24} {...axis} />
        <YAxis width={36} tickFormatter={(value) => `${value}h`} {...axis} />
        {average ? <ReferenceLine y={average} stroke="#F59E0B" strokeOpacity={0.5} strokeDasharray="4 4" /> : null}
        <Tooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
          content={({ active, payload, label }) => {
            const row = payload?.[0]?.payload as { hours: number | null } | undefined;
            if (!active || !row || row.hours == null) return null;
            return <TooltipCard title={dayTick(label)} rows={[{ label: "متوسط المعالجة", value: `${row.hours} س`, color }]} />;
          }}
        />
        <Bar dataKey="hours" fill={color} fillOpacity={0.85} radius={[3, 3, 0, 0]} animationDuration={500} maxBarSize={22} />
      </BarChart>
    </Frame>
  );
}

export function AdminBarChart({ data, label = "العدد" }: { data: { label: string; n: number }[]; label?: string }) {
  const color = "#38BDF8";
  return (
    <Frame height="h-64">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={64} {...axis} />
        <YAxis allowDecimals={false} width={32} {...axis} />
        <Tooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.06)" }}
          content={({ active, payload, label: name }) => {
            const row = payload?.[0]?.payload as { n: number } | undefined;
            if (!active || !row) return null;
            return <TooltipCard title={String(name)} rows={[{ label, value: numberFormat.format(row.n), color }]} />;
          }}
        />
        <Bar dataKey="n" fill={color} fillOpacity={0.85} radius={[3, 3, 0, 0]} animationDuration={500} maxBarSize={36} />
      </BarChart>
    </Frame>
  );
}
