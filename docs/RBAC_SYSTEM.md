# نظام الأدوار المتعدد - Multi-Role RBAC System

## 📋 نظرة عامة

تم تطوير نظام متقدم لإدارة الأدوار والصلاحيات في لوحة التحكم Admin.

## 🎭 الأدوار المتاحة

### 1. **Super Admin** (مدير النظام العام)
- صلاحيات كاملة على كل شيء
- إدارة الإداريين الآخرين
- تغيير أي دور
- الوصول الكامل لجميع الميزات

### 2. **Admin** (مدير)
- صلاحيات إدارية واسعة
- إدارة الموظفين والمستخدمين
- إدارة المحتوى والإعدادات
- لا يمكنه تعديل Super Admin

### 3. **Manager** (مدير عمليات)
- إدارة الطلبات والمستندات
- تعيين الموظفين
- الموافقة على الطلبات
- رفض/قبول المستندات

### 4. **Operator** (موظف عمليات)
- معالجة الطلبات المعينة له
- رفع المستندات
- تحديث حالات الطلبات
- لا يمكنه تعيين الموظفين

### 5. **Support** (دعم فني)
- عرض الطلبات (قراءة فقط)
- الرد على الرسائل
- إضافة ملاحظات
- لا يمكنه تغيير الحالات

### 6. **Viewer** (مراقب)
- عرض فقط (Read-only)
- عرض التقارير والإحصائيات
- لا يمكنه التعديل على أي شيء

## 🗄️ التغييرات في قاعدة البيانات

### جدول `profiles`
```sql
ALTER TABLE profiles ALTER COLUMN role TYPE VARCHAR(20);
-- الأدوار الجديدة: super_admin, admin, manager, operator, support, viewer, user
```

### جدول `staff_profiles` (جديد)
```sql
CREATE TABLE staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  department VARCHAR(100),         -- القسم
  specialty TEXT[],                -- التخصصات
  max_applications INTEGER DEFAULT 10,  -- الحد الأقصى للطلبات
  notes TEXT,                      -- ملاحظات
  active BOOLEAN DEFAULT TRUE,     -- نشط/معطل
  hired_at DATE,                   -- تاريخ التوظيف
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### جدول `permissions` (جديد)
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL,
  resource VARCHAR(50) NOT NULL,   -- applications, users, staff, etc.
  action VARCHAR(50) NOT NULL,      -- view, create, update, delete, etc.
  allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📁 الملفات المضافة/المعدلة

### Backend
- ✅ `src/lib/types.ts` - تعريف AdminRole
- ✅ `src/lib/rbac.ts` - نظام RBAC كامل
- ✅ `src/lib/data/staff.ts` - إدارة بيانات الموظفين
- ✅ `src/lib/audit.ts` - Audit logging
- ✅ `src/lib/auth/index.ts` - دعم الأدوار الجديدة
- ✅ `src/app/actions/staff.ts` - Server actions للموظفين

### Frontend
- ✅ `src/app/[locale]/(dashboard)/admin/staff/page.tsx` - صفحة الموظفين
- ✅ `src/app/[locale]/(dashboard)/admin/staff/_components/staff-table.tsx`
- ✅ `src/app/[locale]/(dashboard)/admin/staff/_components/staff-performance.tsx`
- ✅ `src/app/[locale]/(dashboard)/admin/staff/_components/add-staff-dialog.tsx`
- ✅ `src/components/admin/admin-nav.tsx` - إضافة قسم الموظفين

### Database
- ✅ `.next/standalone/supabase/migrations/20250101000004_add_rbac_system.sql`

## 🚀 كيفية الاستخدام

### 1. تشغيل Migration
```bash
# للمشاريع التي تستخدم Supabase
cd .next/standalone/supabase
supabase db push

# أو يدوياً في Supabase Dashboard:
# SQL Editor > تنفيذ محتوى ملف Migration
```

### 2. إضافة Super Admin الأول
في متغيرات البيئة `.env.local`:
```env
ADMIN_EMAILS=your-email@example.com
```

سيتم تحويله تلقائياً إلى `super_admin` عند تسجيل الدخول.

### 3. إضافة موظف جديد
1. اذهب إلى `/admin/staff`
2. اضغط "إضافة موظف"
3. أدخل البريد الإلكتروني
4. اختر الدور والقسم
5. احفظ

### 4. إدارة الصلاحيات
```typescript
import { currentUserHasPermission } from '@/lib/rbac';

// في أي server action أو component
const canDelete = await currentUserHasPermission('applications', 'delete');
if (!canDelete) {
  return { success: false, error: 'ليس لديك صلاحية' };
}
```

## 🔐 مصفوفة الصلاحيات

| الدور | عرض | إنشاء | تعديل | حذف | تعيين | إدارة موظفين |
|------|-----|-------|-------|------|-------|--------------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Operator | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Support | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

✅ = كامل | ⚠️ = محدود | ❌ = ممنوع

## 📊 الميزات الجديدة

### 1. لوحة الموظفين
- عرض جميع الموظفين مع الأدوار
- تعديل بيانات الموظف
- إدارة التخصصات والأقسام
- تحديد الحد الأقصى للطلبات

### 2. أداء الموظفين
- Top 5 performers
- عدد الطلبات المعالجة
- معدل القبول
- متوسط وقت المعالجة

### 3. Audit Log محسّن
- تسجيل كل تغيير في الأدوار
- تتبع تعديلات بيانات الموظفين
- Before/After values

### 4. Bulk Actions
- تعيين عدة طلبات دفعة واحدة
- (قريباً: تغيير حالة جماعي)

## 🧪 الاختبار

```bash
# 1. تسجيل دخول كـ Super Admin
# 2. اذهب إلى /admin/staff
# 3. جرب إضافة موظف
# 4. جرب تعديل الصلاحيات
# 5. تحقق من Audit Log في /admin/audit
```

## 🔄 الخطوات القادمة

- [ ] تحسين UI للموبايل
- [ ] إضافة Bulk Actions أكثر
- [ ] نظام الإشعارات الفورية
- [ ] Dashboard Analytics متقدم
- [ ] تصدير التقارير

## ⚠️ ملاحظات مهمة

1. **الحماية من الحذف**: لا يمكن حذف آخر Super Admin
2. **الصلاحيات المتدرجة**: كل دور له صلاحيات أقل من الأعلى منه
3. **Audit Trail**: كل تغيير يُسجّل في `admin_audit`
4. **Migration آمنة**: تحافظ على البيانات الحالية

## 📞 الدعم

للمزيد من المعلومات، راجع:
- `src/lib/rbac.ts` - نظام الصلاحيات الكامل
- `ADMIN_DEVELOPMENT_PLAN.md` - الخطة الكاملة
