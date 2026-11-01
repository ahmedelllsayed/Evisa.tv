"use client";
import { useState } from "react";
import type { AdminRole } from "@/lib/types";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac-constants";
import { promoteToStaff } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      // For demo: assume user exists - in production, you'd search first
      toast.error("هذه الميزة تتطلب البحث عن المستخدم أولاً. استخدم صفحة المستخدمين للترقية.");
      // In real implementation:
      // 1. Search for user by email
      // 2. If found, call promoteToStaff
      // 3. If not found, show error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 ml-2" />
          إضافة موظف
        </Button>
      </DialogTrigger>
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
            <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">
                  <div>
                    <div className="font-medium">{ROLE_LABELS.operator}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.operator}</div>
                  </div>
                </SelectItem>
                <SelectItem value="support">
                  <div>
                    <div className="font-medium">{ROLE_LABELS.support}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.support}</div>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div>
                    <div className="font-medium">{ROLE_LABELS.manager}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.manager}</div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div>
                    <div className="font-medium">{ROLE_LABELS.admin}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS.admin}</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
