# خطة تطوير لوحة تحكم Admin - Evisa.tv

## 📋 نظرة عامة

**الهدف:** تطوير وتحسين لوحة تحكم Admin الموجودة بإضافة:
1. نظام Roles متعدد المستويات
2. Modern Dark Dashboard UI
3. Analytics & Reports متقدمة
4. Real-time Notifications
5. Bulk Operations

**المدة المتوقعة:** 5-7 أيام

---

## 🎯 الحالة الحالية (من التقرير)

### ✅ الموجود (قوي جداً!)
- ✅ **18 صفحة Admin** كاملة
- ✅ **19 مكون UI** احترافي
- ✅ **نظام أمان محكم** (requireAdmin + Supabase)
- ✅ **إدارة طلبات كاملة** (Queue, Applications, Documents)
- ✅ **CMS متكامل** (Destinations, FAQs, Reviews, Pages)
- ✅ **Audit Log** لتتبع النشاط
- ✅ **إحصائيات أساسية** (Dashboard)
- ✅ **نظام المستندات** (قبول/رفض)
- ✅ **تصدير CSV**

### ❌ ما سنضيفه
- ❌ نظام Roles متعدد (حالياً: user/admin فقط)
- ❌ Modern Dark Dashboard UI
- ❌ Analytics تفاعلية (recharts)
- ❌ نظام Reports متقدم
- ❌ Real-time Notifications
- ❌ Bulk Operations
- ❌ Advanced Filters

---

## 🏗️ المرحلة 1: نظام الأدوار المتعدد (Roles System)

### التصميم

**الأدوار الجديدة:**
```typescript
type Role = 
  | 'super_admin'  // كل الصلاحيات + إدارة الإداريين
  | 'admin'        // إدارة كاملة للطلبات والمحتوى
  | 'moderator'    // مراجعة وتعديل (بدون حذف)
  | 'support'      // عرض فقط + إضافة ملاحظات
  | 'user';        // مستخدم عادي
```

**مصفوفة الصلاحيات:**

| الوظيفة | Super Admin | Admin | Moderator | Support | User |
|---------|-------------|-------|-----------|---------|------|
| عرض Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| إدارة الطلبات | ✅ | ✅ | ✅ (عرض فقط) | ✅ (عرض فقط) | ❌ |
| قبول/رفض مستندات | ✅ | ✅ | ✅ | ❌ | ❌ |
| استرداد مبالغ | ✅ | ✅ | ❌ | ❌ | ❌ |
| إدارة المستخدمين | ✅ | ✅ | ❌ | ❌ | ❌ |
| إدارة الإداريين | ✅ | ❌ | ❌ | ❌ | ❌ |
| إدارة المحتوى | ✅ | ✅ | ✅ | ❌ | ❌ |
| حذف بيانات | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Log | ✅ | ✅ | ✅ (عرض فقط) | ❌ | ❌ |
| إعدادات الموقع | ✅ | ✅ | ❌ | ❌ | ❌ |

### الملفات للتعديل

#### 1. Database Schema
**ملف:** `supabase/migrations/xxx_add_roles_system.sql`

```sql
-- إضافة enum للأدوار
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'moderator', 'support', 'user');

-- تعديل جدول profiles
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role USING role::user_role,
  ALTER COLUMN role SET DEFAULT 'user';

-- إضافة جدول الصلاحيات (اختياري - للمرونة المستقبلية)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- بيانات الصلاحيات الافتراضية
INSERT INTO role_permissions (role, resource, action) VALUES
  -- Super Admin
  ('super_admin', '*', '*'),
  
  -- Admin
  ('admin', 'applications', 'read'),
  ('admin', 'applications', 'update'),
  ('admin', 'applications', 'delete'),
  ('admin', 'users', 'read'),
  ('admin', 'users', 'update'),
  ('admin', 'content', '*'),
  
  -- Moderator
  ('moderator', 'applications', 'read'),
  ('moderator', 'applications', 'update'),
  ('moderator', 'content', 'read'),
  ('moderator', 'content', 'update'),
  
  -- Support
  ('support', 'applications', 'read'),
  ('support', 'messages', 'read'),
  ('support', 'messages', 'create');
```

#### 2. Auth System
**ملف:** `src/lib/auth/index.ts`

```typescript
// إضافة دوال جديدة
export async function requireRole(
  locale: string, 
  minRole: Role = 'admin'
): Promise<Profile> {
  const user = await requireUser(locale);
  
  const roleHierarchy = {
    super_admin: 5,
    admin: 4,
    moderator: 3,
    support: 2,
    user: 1,
  };
  
  if (roleHierarchy[user.role] < roleHierarchy[minRole]) {
    redirect(`/${locale}/unauthorized`);
  }
  
  return user;
}

export async function hasPermission(
  resource: string,
  action: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Super admin يملك كل الصلاحيات
  if (user.role === 'super_admin') return true;
  
  // فحص الصلاحيات من قاعدة البيانات
  const { data } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', user.role)
    .or(`resource.eq.${resource},resource.eq.*`)
    .or(`action.eq.${action},action.eq.*`)
    .maybeSingle();
  
  return !!data;
}
```

#### 3. UI Components
**ملف:** `src/components/admin/role-badge.tsx` (جديد)

```typescript
export function RoleBadge({ role }: { role: Role }) {
  const config = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-500' },
    admin: { label: 'Admin', color: 'bg-blue-500' },
    moderator: { label: 'Moderator', color: 'bg-green-500' },
    support: { label: 'Support', color: 'bg-yellow-500' },
    user: { label: 'User', color: 'bg-gray-500' },
  };
  
  const { label, color } = config[role];
  
  return (
    <span className={`px-2 py-1 rounded text-xs text-white ${color}`}>
      {label}
    </span>
  );
}
```

#### 4. User Management
**ملف:** `src/app/[locale]/(console)/admin/users/page.tsx`

إضافة:
- عمود Role في الجدول
- فلتر حسب Role
- إمكانية تغيير Role (Super Admin فقط)

---

## 🎨 المرحلة 2: Modern Dark Dashboard UI

### التصميم

**نظام الألوان (Dark Mode):**
```css
:root {
  /* Surface levels - graduated dark */
  --admin-bg-1: #05070C;    /* Deepest - 3% */
  --admin-bg-2: #0A0D12;    /* 5% */
  --admin-bg-3: #0F131C;    /* 7% */
  --admin-bg-4: #161D2B;    /* 10% */
  --admin-bg-5: #1E2636;    /* 13% */
  
  /* Accent - cyan/blue for data */
  --admin-accent: #38BDF8;
  --admin-accent-hover: #0EA5E9;
  
  /* Supporting - muted cyan */
  --admin-muted: #6EE7B7;
  
  /* Text */
  --admin-text-primary: #F8FAFC;
  --admin-text-secondary: #94A3B8;
  --admin-text-muted: #64748B;
  
  /* Status colors */
  --admin-success: #10B981;
  --admin-warning: #F59E0B;
  --admin-error: #EF4444;
  --admin-info: #3B82F6;
}
```

### الملفات للتعديل

#### 1. Admin Layout
**ملف:** `src/app/[locale]/(console)/admin/layout.tsx`

```typescript
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070C] text-[#F8FAFC]">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main content */}
      <main className="lg:pl-64">
        {/* Header */}
        <AdminHeader />
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
```

#### 2. Sidebar Navigation
**ملف:** `src/components/admin/admin-nav.tsx`

تحديث التصميم:
- Dark gradient background
- Hover effects with glow
- Active state indicator
- Collapsible sections
- User menu at bottom

#### 3. Cards & Components
**ملف:** `src/components/admin/chrome.tsx`

```typescript
export function AdminCard({ children, className, ...props }: AdminCardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl bg-[#0F131C] border border-[#1E2636]",
        "shadow-lg shadow-black/20",
        "hover:border-[#38BDF8]/20 transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AdminStatCard({ 
  title, 
  value, 
  icon, 
  trend 
}: AdminStatCardProps) {
  return (
    <AdminCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#94A3B8]">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && (
            <p className={cn(
              "text-sm mt-2",
              trend > 0 ? "text-[#10B981]" : "text-[#EF4444]"
            )}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-[#38BDF8]/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </AdminCard>
  );
}
```

---

## 📊 المرحلة 3: Analytics & Charts متقدمة

### التصميم

**Charts المطلوبة:**
1. **Revenue Chart** - Line chart للإيرادات (يومي/أسبوعي/شهري)
2. **Applications Chart** - Bar chart للطلبات
3. **Conversion Funnel** - Funnel chart
4. **Geographic Distribution** - Map chart
5. **Processing Time** - Line chart متوسط الوقت
6. **Visa Types Distribution** - Pie/Donut chart
7. **Staff Performance** - Bar chart مقارنة

### الملفات للتعديل

#### 1. Dashboard Page
**ملف:** `src/app/[locale]/(console)/admin/page.tsx`

```typescript
export default async function AdminDashboard({ params }: Props) {
  const [stats, revenueData, applicationsData, funnelData] = await Promise.all([
    getAdminStats(),
    getRevenueData(period), // period: day/week/month
    getApplicationsData(period),
    getFunnelData(),
  ]);
  
  return (
    <AdminPage title="لوحة التحكم">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <AdminStatCard 
          title="الإيرادات اليوم"
          value={formatCurrency(stats.todayRevenue)}
          trend={stats.revenueTrend}
          icon={<DollarIcon />}
        />
        {/* ... more stat cards */}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">الإيرادات</h3>
          <RevenueChart data={revenueData} />
        </AdminCard>
        
        <AdminCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">الطلبات</h3>
          <ApplicationsChart data={applicationsData} />
        </AdminCard>
      </div>
    </AdminPage>
  );
}
```

#### 2. Charts Components
**ملف:** `src/components/admin/charts/revenue-chart.tsx` (جديد)

```typescript
'use client';

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function RevenueChart({ data }: { data: RevenueData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2636" />
        <XAxis 
          dataKey="date" 
          stroke="#64748B"
          tick={{ fill: '#94A3B8' }}
        />
        <YAxis 
          stroke="#64748B"
          tick={{ fill: '#94A3B8' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#0F131C',
            border: '1px solid #1E2636',
            borderRadius: '8px',
            color: '#F8FAFC',
          }}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#38BDF8" 
          strokeWidth={2}
          dot={{ fill: '#38BDF8', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### 3. Data Functions
**ملف:** `src/lib/data/analytics.ts` (جديد)

```typescript
export async function getRevenueData(period: 'day' | 'week' | 'month') {
  // منطق جلب البيانات من Supabase
  const { data } = await supabase
    .from('payments')
    .select('created_at, amount')
    .gte('created_at', getStartDate(period))
    .eq('status', 'succeeded');
  
  // تجميع البيانات حسب الفترة
  return groupByPeriod(data, period);
}

export async function getConversionFunnel() {
  const stats = await Promise.all([
    // Step 1: Page views
    supabase.from('funnel_events').select('*', { count: 'exact' })
      .eq('event', 'page_view'),
    
    // Step 2: Started application
    supabase.from('applications').select('*', { count: 'exact' }),
    
    // Step 3: Completed travelers
    supabase.from('applications').select('*', { count: 'exact' })
      .gte('step', 'documents'),
    
    // Step 4: Paid
    supabase.from('applications').select('*', { count: 'exact' })
      .eq('status', 'submitted'),
    
    // Step 5: Approved
    supabase.from('applications').select('*', { count: 'exact' })
      .eq('status', 'approved'),
  ]);
  
  return [
    { stage: 'زيارة الموقع', count: stats[0].count, percentage: 100 },
    { stage: 'بدء طلب', count: stats[1].count, percentage: calculatePercentage(stats[1].count, stats[0].count) },
    { stage: 'إكمال البيانات', count: stats[2].count, percentage: calculatePercentage(stats[2].count, stats[1].count) },
    { stage: 'دفع', count: stats[3].count, percentage: calculatePercentage(stats[3].count, stats[2].count) },
    { stage: 'قبول', count: stats[4].count, percentage: calculatePercentage(stats[4].count, stats[3].count) },
  ];
}
```

---

## 📄 المرحلة 4: نظام التقارير (Reports)

### التصميم

**التقارير المطلوبة:**
1. **تقرير الإيرادات** (Revenue Report)
2. **تقرير الأداء** (Performance Report)
3. **تقرير الطلبات** (Applications Report)
4. **تقرير الجودة** (Quality Report)
5. **تقرير الموظفين** (Staff Report)

### الملفات

#### 1. Reports Page
**ملف:** `src/app/[locale]/(console)/admin/reports/page.tsx` (جديد)

```typescript
export default async function ReportsPage({ searchParams }: Props) {
  const reportType = searchParams.type || 'revenue';
  const startDate = searchParams.start || getDefaultStartDate();
  const endDate = searchParams.end || new Date().toISOString();
  
  const reportData = await generateReport(reportType, { startDate, endDate });
  
  return (
    <AdminPage title="التقارير">
      {/* Report selector */}
      <div className="flex gap-4 mb-6">
        <ReportTypeSelector />
        <DateRangePicker />
        <Button onClick={() => exportReport(reportData, 'pdf')}>
          تصدير PDF
        </Button>
        <Button onClick={() => exportReport(reportData, 'excel')}>
          تصدير Excel
        </Button>
      </div>
      
      {/* Report content */}
      <ReportRenderer data={reportData} type={reportType} />
    </AdminPage>
  );
}
```

#### 2. Report Generator
**ملف:** `src/lib/reports/generator.ts` (جديد)

```typescript
export async function generateReport(
  type: ReportType,
  options: ReportOptions
): Promise<Report> {
  switch (type) {
    case 'revenue':
      return generateRevenueReport(options);
    case 'performance':
      return generatePerformanceReport(options);
    case 'applications':
      return generateApplicationsReport(options);
    case 'quality':
      return generateQualityReport(options);
    case 'staff':
      return generateStaffReport(options);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

async function generateRevenueReport(options: ReportOptions): Promise<Report> {
  const { startDate, endDate } = options;
  
  // جلب البيانات
  const [payments, refunds, byDestination, byVisaType] = await Promise.all([
    getPayments(startDate, endDate),
    getRefunds(startDate, endDate),
    getRevenueByDestination(startDate, endDate),
    getRevenueByVisaType(startDate, endDate),
  ]);
  
  // حساب المقاييس
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netRevenue = totalRevenue - totalRefunds;
  const avgOrderValue = totalRevenue / payments.length;
  
  return {
    type: 'revenue',
    period: { startDate, endDate },
    summary: {
      totalRevenue,
      totalRefunds,
      netRevenue,
      avgOrderValue,
      transactionCount: payments.length,
    },
    charts: [
      {
        type: 'line',
        title: 'الإيرادات اليومية',
        data: groupPaymentsByDay(payments),
      },
      {
        type: 'bar',
        title: 'حسب الوجهة',
        data: byDestination,
      },
      {
        type: 'pie',
        title: 'حسب نوع التأشيرة',
        data: byVisaType,
      },
    ],
    tables: [
      {
        title: 'أعلى 10 وجهات',
        columns: ['الوجهة', 'عدد الطلبات', 'الإيرادات'],
        rows: byDestination.slice(0, 10),
      },
    ],
  };
}
```

---

## 🔔 المرحلة 5: Real-time Notifications

### التصميم

**طرق الإشعارات:**
1. **In-app notifications** - Badge counter + dropdown
2. **Browser push notifications** (optional)
3. **Sound alerts** لأحداث مهمة

**أنواع الإشعارات:**
- طلب جديد مدفوع
- مستند جديد يحتاج مراجعة
- طلب متأخر عن الموعد
- رد من عميل
- تعليق من موظف آخر

### التقنية

**الخيار 1: Server-Sent Events (SSE)** - أبسط وأخف
**الخيار 2: WebSockets** - أكثر مرونة
**الخيار 3: Supabase Realtime** - مدمج مع Supabase

### الملفات

#### 1. Notifications Context
**ملف:** `src/contexts/notifications-context.tsx` (جديد)

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  type: 'new_application' | 'new_document' | 'late_application' | 'comment';
  title: string;
  body: string;
  link: string;
  read: boolean;
  created_at: string;
};

const NotificationsContext = createContext<{
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}>(null!);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Play sound
          playNotificationSound();
          
          // Show browser notification (if permitted)
          showBrowserNotification(newNotif);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // ... markAsRead, markAllAsRead implementations
  
  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
```

#### 2. Notification Bell
**ملف:** `src/components/admin/notification-bell.tsx` (جديد)

```typescript
'use client';

import { BellIcon } from 'lucide-react';
import { useNotifications } from '@/contexts/notifications-context';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-[#1E2636] transition-colors">
          <BellIcon className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF4444] rounded-full text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0">
        <div className="bg-[#0F131C] border border-[#1E2636] rounded-lg">
          {/* Header */}
          <div className="p-4 border-b border-[#1E2636] flex justify-between">
            <h3 className="font-semibold">الإشعارات</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-sm text-[#38BDF8] hover:underline"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          
          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(notif => (
              <NotificationItem 
                key={notif.id} 
                notification={notif}
                onRead={() => markAsRead(notif.id)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## ⚡ المرحلة 6: Bulk Operations

### التصميم

**العمليات الجماعية المطلوبة:**
1. تعيين موظف لعدة طلبات
2. تغيير حالة عدة طلبات
3. تصدير مجموعة طلبات محددة
4. إرسال إشعار لعدة مستخدمين
5. حذف عدة عناصر

### الملفات

#### 1. Bulk Actions Bar
**ملف:** `src/components/admin/bulk-actions-bar.tsx` (جديد)

```typescript
'use client';

export function BulkActionsBar({ 
  selectedIds, 
  onClear,
  entityType // 'applications' | 'users' | etc
}: BulkActionsBarProps) {
  const [action, setAction] = useState<string | null>(null);
  
  if (selectedIds.length === 0) return null;
  
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <AdminCard className="p-4 flex items-center gap-4 shadow-2xl">
        <span className="text-sm">
          تم تحديد {selectedIds.length} عنصر
        </span>
        
        <div className="h-6 w-px bg-[#1E2636]" />
        
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="اختر إجراء" />
          </SelectTrigger>
          <SelectContent>
            {entityType === 'applications' && (
              <>
                <SelectItem value="assign">تعيين موظف</SelectItem>
                <SelectItem value="status">تغيير الحالة</SelectItem>
                <SelectItem value="export">تصدير</SelectItem>
              </>
            )}
            {entityType === 'users' && (
              <>
                <SelectItem value="role">تغيير الدور</SelectItem>
                <SelectItem value="ban">حظر</SelectItem>
                <SelectItem value="notify">إرسال إشعار</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        
        <Button 
          onClick={() => executeBulkAction(action, selectedIds)}
          disabled={!action}
        >
          تنفيذ
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={onClear}
        >
          إلغاء
        </Button>
      </AdminCard>
    </div>
  );
}
```

#### 2. Server Actions
**ملف:** `src/app/actions/bulk-admin.ts` (جديد)

```typescript
'use server';

export async function bulkAssignApplications(
  applicationIds: string[],
  assigneeId: string
) {
  const user = await requireRole('ar', 'admin');
  
  // تحديث الطلبات
  const { error } = await supabase
    .from('applications')
    .update({ assignee_id: assigneeId })
    .in('id', applicationIds);
  
  if (error) throw error;
  
  // تسجيل في Audit
  await recordAudit({
    action: 'bulk_assign',
    entity: 'applications',
    entity_ids: applicationIds,
    details: { assignee_id: assigneeId },
  });
  
  revalidatePath('/[locale]/(console)/admin/applications', 'page');
  
  return { success: true };
}

export async function bulkChangeStatus(
  applicationIds: string[],
  status: ApplicationStatus
) {
  const user = await requireRole('ar', 'admin');
  
  // تحديث الحالات
  const { error } = await supabase
    .from('applications')
    .update({ status })
    .in('id', applicationIds);
  
  if (error) throw error;
  
  // إرسال إشعارات للمستخدمين
  const applications = await supabase
    .from('applications')
    .select('id, user_id')
    .in('id', applicationIds);
  
  await Promise.all(
    applications.data?.map(app => 
      sendStatusChangeNotification(app.user_id, app.id, status)
    ) || []
  );
  
  await recordAudit({
    action: 'bulk_status_change',
    entity: 'applications',
    entity_ids: applicationIds,
    details: { status },
  });
  
  revalidatePath('/[locale]/(console)/admin/applications', 'page');
  
  return { success: true };
}
```

---

## 📁 ملخص الملفات الجديدة/المعدلة

### ملفات جديدة (سيتم إنشاؤها):

**Database:**
- `supabase/migrations/xxx_add_roles_system.sql`
- `supabase/migrations/xxx_add_notifications_table.sql`

**Components:**
- `src/components/admin/role-badge.tsx`
- `src/components/admin/notification-bell.tsx`
- `src/components/admin/notification-item.tsx`
- `src/components/admin/bulk-actions-bar.tsx`
- `src/components/admin/charts/revenue-chart.tsx`
- `src/components/admin/charts/applications-chart.tsx`
- `src/components/admin/charts/funnel-chart.tsx`
- `src/components/admin/charts/geo-map.tsx`

**Pages:**
- `src/app/[locale]/(console)/admin/reports/page.tsx`
- `src/app/[locale]/(console)/admin/reports/[type]/page.tsx`
- `src/app/[locale]/(console)/admin/staff/page.tsx` (إدارة الموظفين)

**Lib:**
- `src/lib/reports/generator.ts`
- `src/lib/reports/exporters.ts` (PDF/Excel export)
- `src/lib/data/analytics.ts`
- `src/contexts/notifications-context.tsx`

**Actions:**
- `src/app/actions/bulk-admin.ts`

### ملفات للتعديل:

**Core:**
- `src/lib/auth/index.ts` - إضافة نظام Roles
- `src/app/[locale]/(console)/admin/layout.tsx` - Dark UI
- `src/components/admin/admin-nav.tsx` - Dark sidebar
- `src/components/admin/chrome.tsx` - Dark components

**Pages:**
- `src/app/[locale]/(console)/admin/page.tsx` - Enhanced dashboard
- `src/app/[locale]/(console)/admin/users/page.tsx` - Role management
- `src/app/[locale]/(console)/admin/applications/page.tsx` - Bulk actions

**Styles:**
- `src/app/globals.css` - Dark theme variables

---

## 🗓️ خطة التنفيذ (Timeline)

### يوم 1-2: نظام الأدوار
- [ ] Database migration
- [ ] تحديث Auth system
- [ ] UI لإدارة الأدوار
- [ ] Testing

### يوم 3: Dark UI
- [ ] تحديث CSS variables
- [ ] تحديث Layout
- [ ] تحديث Sidebar
- [ ] تحديث Components

### يوم 4-5: Analytics & Charts
- [ ] Dashboard enhancements
- [ ] Charts components
- [ ] Data functions
- [ ] Reports system

### يوم 6: Notifications
- [ ] Database setup
- [ ] Realtime subscriptions
- [ ] UI components
- [ ] Browser notifications

### يوم 7: Bulk Operations
- [ ] UI components
- [ ] Server actions
- [ ] Testing
- [ ] Documentation

---

## ✅ Checklist التنفيذ

### المرحلة 1: نظام الأدوار
- [ ] إنشاء migration للأدوار
- [ ] تحديث enum في profiles
- [ ] إنشاء جدول role_permissions
- [ ] تحديث requireRole()
- [ ] إضافة hasPermission()
- [ ] RoleBadge component
- [ ] تحديث صفحة Users
- [ ] اختبار الصلاحيات

### المرحلة 2: Dark UI
- [ ] CSS variables جديدة
- [ ] تحديث AdminLayout
- [ ] تحديث AdminNav
- [ ] تحديث AdminCard
- [ ] تحديث AdminStatCard
- [ ] تحديث جميع الصفحات
- [ ] اختبار المظهر

### المرحلة 3: Analytics
- [ ] RevenueChart component
- [ ] ApplicationsChart component
- [ ] FunnelChart component
- [ ] GeoMap component
- [ ] getRevenueData()
- [ ] getConversionFunnel()
- [ ] تحديث Dashboard
- [ ] اختبار Charts

### المرحلة 4: Reports
- [ ] Reports page
- [ ] ReportGenerator
- [ ] PDF exporter
- [ ] Excel exporter
- [ ] Revenue report
- [ ] Performance report
- [ ] Staff report
- [ ] اختبار التقارير

### المرحلة 5: Notifications
- [ ] Database table
- [ ] NotificationsContext
- [ ] NotificationBell component
- [ ] Realtime subscriptions
- [ ] Sound alerts
- [ ] Browser notifications
- [ ] اختبار الإشعارات

### المرحلة 6: Bulk Operations
- [ ] BulkActionsBar component
- [ ] Checkbox في الجداول
- [ ] bulkAssignApplications()
- [ ] bulkChangeStatus()
- [ ] bulkExport()
- [ ] اختبار العمليات

---

## 🎯 النتائج المتوقعة

### قبل التطوير:
- ✅ 18 صفحة Admin
- ✅ 2 أدوار (user/admin)
- ✅ إحصائيات أساسية
- ⚠️ UI عربي عادي
- ⚠️ لا notifications
- ⚠️ لا bulk operations

### بعد التطوير:
- ✅ 21 صفحة Admin (+ Reports, Staff, Enhanced Dashboard)
- ✅ 5 أدوار (super_admin, admin, moderator, support, user)
- ✅ Analytics تفاعلية مع 7+ charts
- ✅ Modern Dark Dashboard UI
- ✅ Real-time Notifications
- ✅ Bulk Operations
- ✅ Reports System (PDF/Excel)
- ✅ Advanced Filters

---

## 📊 مقارنة قبل/بعد

| الميزة | قبل | بعد |
|--------|-----|-----|
| عدد الصفحات | 18 | 21 |
| الأدوار | 2 | 5 |
| Charts | 2 | 7+ |
| UI Theme | Light Arabic | Modern Dark |
| Notifications | ❌ | ✅ Real-time |
| Bulk Actions | ❌ | ✅ |
| Reports | CSV فقط | PDF + Excel + Interactive |
| Permissions System | Basic | Advanced RBAC |
| Mobile Responsive | ⚠️ | ✅ Full |

---

**آخر تحديث:** 2024-11-01  
**المشروع:** https://github.com/ahmedelllsayed/Evisa.tv  
**المطور:** Claude Opus (Senior Full-Stack Engineer)
