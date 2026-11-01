"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: "#94A3B8" } as const;
const grid = "#1E2636";
const series = "#38BDF8";

export function AdminAreaChart({ data }: { data: { day: string; n: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(5)} {...axis} />
          <YAxis allowDecimals={false} width={32} {...axis} />
          <Tooltip />
          <Area type="monotone" dataKey="n" name="الطلبات" stroke={series} fill={series} fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminBarChart({ data }: { data: { label: string; n: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={70} {...axis} />
          <YAxis allowDecimals={false} width={32} {...axis} />
          <Tooltip />
          <Bar dataKey="n" name="العدد" fill={series} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminRevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(5)} {...axis} />
          <YAxis width={48} {...axis} />
          <Tooltip />
          <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminHoursChart({ data }: { data: { day: string; hours: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(5)} {...axis} />
          <YAxis width={40} {...axis} />
          <Tooltip />
          <Area type="monotone" dataKey="hours" name="ساعات" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
