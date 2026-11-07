import { AdminPanel, Bar, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { RoleBadge } from "@/components/admin/people/ui";
import type { AdminRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hours } from "./staff-shared";

type StaffPerformanceData = {
  userId: string;
  fullName: string | null;
  role: AdminRole;
  processed: number;
  approved: number;
  rejected: number;
  avgProcessingHours: number;
};

export function StaffPerformance({ performance, names }: { performance: StaffPerformanceData[]; names: Record<string, string> }) {
  const ranked = performance.filter((row) => row.processed > 0);
  const top = Math.max(1, ...ranked.map((row) => row.processed));
  return (
    <AdminPanel title="ترتيب الأداء" hint="الملفات المُغلقة خلال آخر 30 يوماً لكل موظف، من الأعلى إلى الأقل." flush>
      {ranked.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">لم يُغلق أي ملف مُسند خلال آخر 30 يوماً.</p>
      ) : (
        <div className="overflow-x-auto [color-scheme:dark]">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-background/40 whitespace-nowrap">
              <tr>
                <th className={cn(adminThClass, "w-12")}>#</th>
                <th className={adminThClass}>الموظف</th>
                <th className={cn(adminThClass, "w-[28%]")}>معالَج</th>
                <th className={cn(adminThClass, "text-end")}>قبول</th>
                <th className={cn(adminThClass, "text-end")}>رفض</th>
                <th className={cn(adminThClass, "text-end")}>نسبة القبول</th>
                <th className={cn(adminThClass, "text-end")}>متوسط المعالجة</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row, index) => {
                const rate = Math.round((row.approved / row.processed) * 100);
                return (
                  <tr key={row.userId} className={adminTrClass}>
                    <td className={cn(adminTdClass, "font-mono text-xs tabular-nums", index === 0 ? "text-amber-300" : "text-muted-foreground")}>{String(index + 1).padStart(2, "0")}</td>
                    <td className={cn(adminTdClass, "whitespace-nowrap")}>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{row.fullName || names[row.userId] || "—"}</span>
                        <RoleBadge role={row.role} />
                      </div>
                    </td>
                    <td className={adminTdClass}>
                      <div className="flex items-center gap-3">
                        <span className="w-8 font-mono tabular-nums">{row.processed}</span>
                        <span className="flex-1">
                          <Bar value={row.processed} max={top} />
                        </span>
                      </div>
                    </td>
                    <td className={cn(adminTdClass, "text-end font-mono tabular-nums text-emerald-300")}>{row.approved}</td>
                    <td className={cn(adminTdClass, "text-end font-mono tabular-nums", row.rejected ? "text-rose-300" : "text-muted-foreground")}>{row.rejected}</td>
                    <td className={cn(adminTdClass, "text-end font-mono tabular-nums")}>{rate}%</td>
                    <td className={cn(adminTdClass, "text-end font-mono tabular-nums text-muted-foreground")}>{hours(row.avgProcessingHours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminPanel>
  );
}
