"use client";
import type { AdminRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/rbac-constants";
import { Trophy, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffPerformanceData = {
  userId: string;
  fullName: string | null;
  role: AdminRole;
  processed: number;
  approved: number;
  rejected: number;
  avgProcessingHours: number;
};

export function StaffPerformance({ performance }: { performance: StaffPerformanceData[] }) {
  const topPerformers = performance.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          أداء الموظفين (آخر 30 يوم)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topPerformers.map((staff, index) => {
            const approvalRate = staff.processed > 0 ? Math.round((staff.approved / staff.processed) * 100) : 0;

            return (
              <div key={staff.userId} className="flex items-center gap-4 rounded-lg border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <div className="font-medium">{staff.fullName || "—"}</div>
                  <div className="text-xs text-muted-foreground">{ROLE_LABELS[staff.role]}</div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{staff.processed}</div>
                    <div className="text-xs text-muted-foreground">معالج</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 font-bold text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      {approvalRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">قبول</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 font-bold">
                      <Clock className="h-3 w-3" />
                      {staff.avgProcessingHours.toFixed(1)}س
                    </div>
                    <div className="text-xs text-muted-foreground">متوسط</div>
                  </div>
                </div>
              </div>
            );
          })}

          {topPerformers.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات أداء حتى الآن</div>}
        </div>
      </CardContent>
    </Card>
  );
}
