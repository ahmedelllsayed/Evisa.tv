"use client";
import { useState } from "react";
import type { AdminRole } from "@/lib/types";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac-constants";
import { promoteStaffByEmail } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export function AddStaffDialog({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("operator");
  const [department, setDepartment] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [maxApplications, setMaxApplications] = useState("10");

  async function handleAdd() {
    if (!email.trim()) {
      toast.error("الرجاء إدخال البريد الإلكتروني");
      return;
    }

    setLoading(true);
    try {
      const result = await promoteStaffByEmail(
        email.trim(),
        {
          role,
          department: department.trim() || undefined,
          specialty: specialty
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          maxApplications: Number(maxApplications) || 10,
        },
        locale,
      );
      if (result.success) {
        toast.success("تمت إضافة الموظف");
        setOpen(false);
        setEmail("");
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 ml-2" />
        إضافة موظف
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
          <DialogDescription>ترقية مستخدم موجود إلى فريق الموظفين</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>الدور</Label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as AdminRole)}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
            >
              {(["operator", "support", "manager", "admin"] as const).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]} — {ROLE_DESCRIPTIONS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>القسم</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="مثال: معالجة الطلبات" />
          </div>

          <div className="space-y-2">
            <Label>التخصص (منفصلة بفواصل)</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="مثال: schengen, asia" />
          </div>

          <div className="space-y-2">
            <Label>الحد الأقصى للطلبات</Label>
            <Input type="number" min="1" value={maxApplications} onChange={(e) => setMaxApplications(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleAdd} disabled={loading}>
            {loading ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
