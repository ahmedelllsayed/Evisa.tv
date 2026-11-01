"use client";
import { useState } from "react";
import type { AdminRole, StaffProfile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/rbac-constants";
import { updateStaffProfile, removeStaffProfile } from "@/app/actions/staff";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Crown, Shield, Eye } from "lucide-react";
import { toast } from "sonner";

type StaffWithUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  phone: string | null;
  banned: boolean;
  createdAt: string;
  staff: StaffProfile | null;
};

type StaffTableProps = {
  staff: StaffWithUser[];
  locale: string;
};

function getRoleIcon(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "admin":
      return <Shield className="h-4 w-4 text-blue-500" />;
    case "manager":
      return <Shield className="h-4 w-4 text-purple-500" />;
    default:
      return <Eye className="h-4 w-4 text-gray-500" />;
  }
}

function getRoleBadgeVariant(role: AdminRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "super_admin":
    case "admin":
      return "default";
    case "manager":
      return "secondary";
    case "operator":
    case "support":
      return "outline";
    default:
      return "secondary";
  }
}

export function StaffTable({ staff, locale }: StaffTableProps) {
  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-right font-medium">الموظف</th>
              <th className="px-4 py-3 text-right font-medium">الدور</th>
              <th className="px-4 py-3 text-right font-medium">القسم</th>
              <th className="px-4 py-3 text-right font-medium">التخصص</th>
              <th className="px-4 py-3 text-right font-medium">الحد الأقصى</th>
              <th className="px-4 py-3 text-right font-medium">الحالة</th>
              <th className="px-4 py-3 text-right font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{member.fullName || member.email}</div>
                    <div className="text-xs text-muted-foreground">{member.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <Badge variant={getRoleBadgeVariant(member.role)}>{ROLE_LABELS[member.role]}</Badge>
                  </div>
                </td>
                <td className="px-4 py-3">{member.staff?.department || "—"}</td>
                <td className="px-4 py-3">
                  {member.staff?.specialty && member.staff.specialty.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {member.staff.specialty.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">{member.staff?.maxApplications ?? "—"}</td>
                <td className="px-4 py-3">
                  {member.staff?.active !== false ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      معطّل
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <EditStaffDialog member={member} locale={locale} />
                    <RemoveStaffDialog member={member} locale={locale} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditStaffDialog({ member, locale }: { member: StaffWithUser; locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [department, setDepartment] = useState(member.staff?.department || "");
  const [specialty, setSpecialty] = useState(member.staff?.specialty?.join(", ") || "");
  const [maxApplications, setMaxApplications] = useState(String(member.staff?.maxApplications || 10));
  const [notes, setNotes] = useState(member.staff?.notes || "");
  const [active, setActive] = useState(String(member.staff?.active !== false));

  async function handleSave() {
    setLoading(true);
    try {
      const result = await updateStaffProfile(
        member.id,
        {
          department: department || null,
          specialty: specialty ? specialty.split(",").map((s) => s.trim()) : [],
          maxApplications: Number(maxApplications) || 10,
          notes: notes || null,
          active: active === "true",
        },
        locale
      );

      if (result.success) {
        toast.success("تم تحديث بيانات الموظف");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          <DialogDescription>{member.fullName || member.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>القسم</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="مثال: معالجة الطلبات" />
          </div>

          <div className="space-y-2">
            <Label>التخصص (منفصلة بفواصل)</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="مثال: schengen, asia, africa" />
          </div>

          <div className="space-y-2">
            <Label>الحد الأقصى للطلبات</Label>
            <Input type="number" min="1" value={maxApplications} onChange={(e) => setMaxApplications(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>الحالة</Label>
            <select
              value={active}
              onChange={(event) => setActive(event.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
            >
              <option value="true">نشط</option>
              <option value="false">معطّل</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveStaffDialog({ member, locale }: { member: StaffWithUser; locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      const result = await removeStaffProfile(member.id, locale);

      if (result.success) {
        toast.success("تم إزالة الموظف من القائمة");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إزالة موظف</DialogTitle>
          <DialogDescription>هل أنت متأكد من إزالة {member.fullName || member.email} من فريق الموظفين؟</DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">سيتم تحويله إلى مستخدم عادي وإزالة جميع بيانات الموظف الخاصة به.</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={loading}>
            {loading ? "جاري الإزالة..." : "إزالة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
