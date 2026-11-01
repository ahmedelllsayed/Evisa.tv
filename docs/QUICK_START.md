# Quick Start Guide - Admin RBAC System

## 🚀 التثبيت السريع (5 دقائق)

### 1. تشغيل Migration

**إذا كنت تستخدم Supabase:**
```bash
cd .next/standalone/supabase
supabase db push
```

**أو يدوياً في Supabase Dashboard:**
1. افتح SQL Editor
2. انسخ محتوى `.next/standalone/supabase/migrations/20250101000004_add_rbac_system.sql`
3. Execute

**أو عبر psql:**
```bash
psql -h your-host -U postgres -d your-database -f .next/standalone/supabase/migrations/20250101000004_add_rbac_system.sql
```

### 2. إضافة Super Admin الأول

في `.env.local`:
```env
ADMIN_EMAILS=your-email@example.com,another@example.com
```

### 3. إعادة تشغيل التطبيق

```bash
npm run dev
```

### 4. تسجيل الدخول

سجّل الدخول بالبريد الموجود في `ADMIN_EMAILS` - سيتم تحويلك تلقائياً إلى `super_admin`

---

## 📖 الاستخدام السريع

### إضافة موظف جديد

1. اذهب إلى `/admin/staff`
2. اضغط "إضافة موظف"
3. أدخل البريد الإلكتروني (يجب أن يكون مسجلاً مسبقاً)
4. اختر:
   - الدور (admin, manager, operator, support, viewer)
   - القسم (اختياري)
   - التخصص (comma-separated)
   - الحد الأقصى للطلبات
5. احفظ

### تعديل صلاحيات موظف

```typescript
// في src/app/actions/staff.ts
await updateStaffProfile(userId, {
  department: "معالجة الطلبات",
  specialty: ["schengen", "asia"],
  maxApplications: 15,
  active: true,
});
```

### فحص الصلاحيات (Server-side)

```typescript
import { currentUserHasPermission } from '@/lib/rbac';

// في أي server action
const canDelete = await currentUserHasPermission('applications', 'delete');
if (!canDelete) {
  return { success: false, error: 'غير مصرح' };
}
```

### فحص الدور (Client-side UI)

```typescript
import { ROLE_LABELS } from '@/lib/rbac-constants';

// في component
{user.role === 'super_admin' && (
  <Button>حذف</Button>
)}
```

---

## 🔐 مصفوفة الصلاحيات السريعة

| الدور | الطلبات | المستخدمين | الموظفين | المحتوى | التقارير |
|------|---------|------------|----------|---------|----------|
| Super Admin | ✅✅✅✅ | ✅✅✅ | ✅✅ | ✅✅ | ✅✅ |
| Admin | ✅✅✅✅ | ✅✅✅ | ✅✅ | ✅✅ | ✅✅ |
| Manager | ✅✅✅⚠️ | ✅❌❌ | ✅❌ | ✅✅ | ✅✅ |
| Operator | ✅✅⚠️❌ | ✅❌❌ | ❌❌ | ❌❌ | ✅❌ |
| Support | ✅❌❌❌ | ✅❌❌ | ❌❌ | ❌❌ | ❌❌ |
| Viewer | ✅❌❌❌ | ✅❌❌ | ❌❌ | ❌❌ | ✅❌ |

✅ = كامل | ⚠️ = محدود | ❌ = ممنوع

الترتيب: View | Create | Edit | Delete

---

## 🛠️ API سريع

### Server Actions المتاحة

```typescript
// في src/app/actions/staff.ts

// 1. تحديث دور مستخدم
await updateUserRole(userId, 'admin', locale);

// 2. تحديث ملف موظف
await updateStaffProfile(userId, {
  department: 'Operations',
  specialty: ['schengen'],
  maxApplications: 10,
}, locale);

// 3. إزالة موظف (تحويل لمستخدم عادي)
await removeStaffProfile(userId, locale);

// 4. ترقية مستخدم لموظف
await promoteToStaff(userId, {
  role: 'operator',
  department: 'Processing',
  specialty: ['asia', 'africa'],
  maxApplications: 12,
}, locale);

// 5. تعيين طلبات جماعياً
await bulkAssignApplications(
  ['app-id-1', 'app-id-2'],
  assigneeId,
  locale
);
```

### Data Functions

```typescript
import {
  getStaffProfile,
  listStaff,
  getStaffWorkload,
  getLeastBusyStaff,
  getStaffPerformance,
  getAllStaffPerformance,
} from '@/lib/data/staff';

// 1. Get staff profile
const profile = await getStaffProfile(userId);

// 2. List all staff
const staff = await listStaff();

// 3. Get workload
const { total, pending, late } = await getStaffWorkload(userId);

// 4. Get least busy staff (for auto-assignment)
const leastBusyId = await getLeastBusyStaff('schengen');

// 5. Staff performance
const perf = await getStaffPerformance(userId, 30); // last 30 days

// 6. All staff performance
const allPerf = await getAllStaffPerformance(30);
```

---

## 🧪 الاختبار السريع

### 1. Test RBAC

```bash
# 1. Login as super_admin
# 2. Go to /admin/staff
# 3. Add a manager
# 4. Logout and login as manager
# 5. Try to access /admin/staff (should work)
# 6. Try to change a user to super_admin (should fail)
```

### 2. Test Permissions

```typescript
// في src/app/actions/admin.ts
export async function testPermissions(locale: string) {
  const user = await requireAdmin(locale);
  
  const tests = [
    await currentUserHasPermission('applications', 'delete'),
    await currentUserHasPermission('users', 'change_role'),
    await currentUserHasPermission('staff', 'manage'),
  ];
  
  console.log('Permissions:', tests);
}
```

### 3. Test Workload

```typescript
// في console أو في صفحة test
import { getStaffWorkload } from '@/lib/data/staff';

const workload = await getStaffWorkload('user-id');
console.log(workload);
// { total: 10, pending: 5, late: 2 }
```

---

## 🐛 Troubleshooting

### Build Error: "server-only"

```typescript
// ❌ Wrong (in client component)
import { currentUserHasPermission } from '@/lib/rbac';

// ✅ Right (in client component)
import { ROLE_LABELS } from '@/lib/rbac-constants';

// ✅ Right (in server action)
import { currentUserHasPermission } from '@/lib/rbac';
```

### Migration Error: "role check constraint"

```sql
-- Run this first
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Then run the migration again
```

### "Not authorized" error

```typescript
// Check:
1. User role in profiles table
2. ADMIN_EMAILS in .env.local
3. Permission in permissions table
4. requireAdmin() call in page
```

---

## 📚 المزيد

- **التوثيق الكامل**: `docs/RBAC_SYSTEM.md`
- **الخطة**: `ADMIN_DEVELOPMENT_PLAN.md`
- **التغييرات**: `CHANGELOG.md`

---

## ⚡ Next Steps

بعد الانتهاء من هذه الخطوة:

1. ✅ اذهب إلى `/admin/staff` وجرّب النظام
2. ✅ أضف موظف أو اثنين
3. ✅ تحقق من صفحة Performance
4. ✅ راجع Audit Log في `/admin/audit`
5. 🚀 جاهز للـ Phase 2: Analytics!
