"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: "hsl(240 3.8% 46.1%)" } as const;

export function AdminAreaChart({ data }: { data: { day: string; n: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="hsl(240 5.9% 90%)" />
          <XAxis dataKey="day" tickFormatter={(value) => String(value).slice(5)} {...axis} />
          <YAxis allowDecimals={false} width={32} {...axis} />
          <Tooltip />
          <Area type="monotone" dataKey="n" name="الطلبات" stroke="hsl(220 70% 50%)" fill="hsl(220 70% 50%)" fillOpacity={0.2} />
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
          <CartesianGrid vertical={false} stroke="hsl(240 5.9% 90%)" />
          <XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={70} {...axis} />
          <YAxis allowDecimals={false} width={32} {...axis} />
          <Tooltip />
          <Bar dataKey="n" name="العدد" fill="hsl(220 70% 50%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
