# خطة تطوير شاملة للوحة تحكم Admin - Evisa.tv

> هذه خطة إدارة قديمة. خارطة الإصدار التجاري الحالية في [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md).

## 📊 تحليل الوضع الحالي

### ✅ ما هو موجود (قوي جداً!)

**18 صفحة Admin:**
1. `/admin` - Dashboard
2. `/admin/queue` - طابور الطلبات
3. `/admin/applications` - إدارة الطلبات
4. `/admin/applications/[id]` - تفاصيل طلب
5. `/admin/growth` - Analytics
6. `/admin/messages` - الرسائل
7. `/admin/users` - المستخدمين
8. `/admin/destinations` - الوجهات
9. `/admin/events` - الفعاليات
10. `/admin/holidays` - العطل
11. `/admin/pages` - CMS
12. `/admin/faqs` - الأسئلة
13. `/admin/reviews` - التقييمات
14. `/admin/settings` - الإعدادات
15. `/admin/citizenships` - الجنسيات
16. `/admin/fees` - سجل الرسوم
17. `/admin/audit` - سجل النشاط

**19 مكون UI موجود**

**Admin Actions (30+ server action):**
- adminSetStatus
- adminRefund
- adminSetAssignee
- adminSetDocumentStatus
- adminUploadIssuedVisa
- adminPatchTraveler
- adminAddEvent
- adminSaveDestination
- adminSaveSettings
- ...إلخ

---

## ❌ ما ينقص (التحليل الشامل)

### 1. نظام الصلاحيات والأدوار

**الحالي:**
- فقط `user` و `admin`
- تحديد Admin عبر `ADMIN_EMAILS` في `.env`
- لا يوجد roles متدرجة

**المطلوب:**
```
Super Admin (أنت)
  ├─ Admin (إدارة كاملة)
  ├─ Manager (إدارة + مراجعة)
  ├─ Operator (معالجة الطلبات)
  ├─ Support (عرض + تعليقات)
  └─ Viewer (عرض فقط)
```

**الصلاحيات المفقودة:**
- ❌ تحديد من يستطيع حذف
- ❌ تحديد من يستطيع الاسترداد
- ❌ تحديد من يرى سجل Audit
- ❌ تحديد من يعدل الإعدادات
- ❌ صلاحيات حسب القسم (Applications, Content, Users)

---

### 2. Dashboard Analytics

**الحالي:**
- 7 كروت إحصائيات بسيطة
- رسم بياني واحد (area chart) للـ 30 يوم الماضية
- قائمة الطلبات حسب نوع التأشيرة

**ما ينقص:**
- ❌ Revenue Chart (الإيرادات اليومية/الشهرية)
- ❌ Conversion Funnel (معدل التحويل)
- ❌ Average Processing Time (متوسط وقت المعالجة)
- ❌ Staff Performance (أداء الموظفين)
- ❌ Top Destinations (أكثر الوجهات طلباً)
- ❌ Payment Methods Distribution
- ❌ Refund Rate
- ❌ Customer Satisfaction Score
- ❌ Geographic Distribution (من أين يأتي العملاء)
- ❌ Time-based trends (مقارنة مع الأسبوع/الشهر الماضي)

---

### 3. إدارة الطلبات المتقدمة

**الحالي:**
- عرض القائمة
- بحث بسيط
- فلترة محدودة
- صفحة تفاصيل ممتازة

**ما ينقص:**
- ❌ Bulk Actions (تعيين موظف لعدة طلبات دفعة واحدة)
- ❌ Advanced Filters:
  - Filter by date range
  - Filter by assignee
  - Filter by payment status
  - Filter by document status
  - Filter by processing time (late/on-time)
- ❌ Quick Actions في الجدول (assign, change status بدون فتح الصفحة)
- ❌ Timeline View (عرض زمني للطلبات)
- ❌ Kanban Board (عرض حسب الحالة)
- ❌ Export to Excel/PDF (فقط CSV موجود)
- ❌ Print View (طباعة تفاصيل طلب)
- ❌ Email/SMS من داخل الطلب مباشرة
- ❌ Document Preview (معاينة المستندات بدون تحميل)
- ❌ Auto-assign (تعيين تلقائي للموظف الأقل عبئاً)

---

### 4. إدارة المستخدمين

**الحالي:**
- عرض القائمة
- تغيير Role (user/admin)
- حظر/إلغاء حظر

**ما ينقص:**
- ❌ User Profile Page (صفحة ملف شخصي كاملة)
- ❌ Activity Log لكل مستخدم (ماذا فعل؟ متى؟)
- ❌ Applications History (جميع طلباته)
- ❌ Payment History (جميع مدفوعاته)
- ❌ Notes على المستخدم (ملاحظات داخلية)
- ❌ Tags/Labels (وسوم: VIP, Problematic, etc)
- ❌ Bulk Actions (حظر جماعي، تغيير role جماعي)
- ❌ Export Users
- ❌ Login History (من أين دخل؟ متى؟)
- ❌ 2FA Management (إدارة المصادقة الثنائية)

---

### 5. إدارة المحتوى (CMS)

**الحالي - جيد جداً:**
- Destinations ✓
- FAQs ✓
- Reviews ✓
- Pages ✓
- Events ✓
- Holidays ✓

**ما ينقص:**
- ❌ Media Library (مكتبة الوسائط المركزية)
- ❌ Bulk Upload للصور
- ❌ Image Editor (قص، تدوير، فلاتر)
- ❌ Content Versioning (تتبع التغييرات)
- ❌ Draft/Published States لكل نوع محتوى
- ❌ SEO Preview (كيف سيظهر في Google)
- ❌ Content Scheduler (نشر مجدول)
- ❌ Duplicate Content (نسخ destination)
- ❌ Import/Export Content
- ❌ Multi-language Editor (تحرير العربي والإنجليزي جنباً لجنب)

---

### 6. إدارة المدفوعات

**الحالي:**
- عرض المدفوعات داخل الطلب
- استرداد يدوي

**ما ينقص:**
- ❌ Payments Dashboard (صفحة مستقلة)
- ❌ Payment Analytics
  - Total revenue
  - Success rate
  - Failed payments
  - Pending payments
  - Refund rate
- ❌ Payment Methods Stats
- ❌ Transaction Details Page
- ❌ Manual Payment Entry (تسجيل دفع يدوي)
- ❌ Partial Refunds (استرداد جزئي)
- ❌ Refund Approval Workflow
- ❌ Payment Reconciliation (مطابقة المدفوعات)
- ❌ Invoice Generation (إنشاء فواتير)
- ❌ Payment Reminders (تذكيرات الدفع)

---

### 7. إدارة المستندات

**الحالي:**
- عرض المستندات
- قبول/رفض
- رفع التأشيرة الصادرة

**ما ينقص:**
- ❌ Document Preview (معاينة PDF/Image داخل الصفحة)
- ❌ Document Annotations (التعليق على المستند)
- ❌ Document Comparison (مقارنة نسختين)
- ❌ OCR Integration (استخراج النص تلقائياً)
- ❌ Document Templates (قوالب المستندات المطلوبة)
- ❌ Auto-validation (فحص تلقائي للمستندات)
- ❌ Document Expiry Tracking (تتبع صلاحية جواز السفر)
- ❌ Bulk Document Approval
- ❌ Document History (من رفع؟ متى؟ من قبل/رفض؟)

---

### 8. Communication Center

**الحالي:**
- Contact Messages ✓
- Reply to message ✓

**ما ينقص:**
- ❌ Internal Chat (دردشة بين الموظفين)
- ❌ Notifications Center
  - New application
  - Document uploaded
  - Payment received
  - Late application
  - Customer message
- ❌ Email Templates Manager (إدارة قوالب الإيميلات)
- ❌ SMS Integration (إرسال رسائل نصية)
- ❌ WhatsApp Integration (إرسال عبر واتساب)
- ❌ Broadcast Messages (إرسال جماعي)
- ❌ Canned Responses (ردود جاهزة)
- ❌ Email/SMS History
- ❌ Communication Analytics

---

### 9. Reports System

**الحالي:**
- ❌ لا يوجد نظام تقارير على الإطلاق!

**المطلوب:**
1. **Revenue Report**
   - Daily/Weekly/Monthly revenue
   - By destination
   - By visa type
   - By payment method
   
2. **Operations Report**
   - Applications processed
   - Average processing time
   - On-time vs late
   - By assignee
   
3. **Quality Report**
   - Approval rate
   - Rejection reasons
   - Document rejection rate
   - Customer satisfaction
   
4. **Staff Performance Report**
   - Applications handled per staff
   - Average processing time per staff
   - Quality metrics
   
5. **Customer Report**
   - New customers
   - Returning customers
   - Customer lifetime value
   - Geographic distribution

**Export Formats:**
- PDF ✓
- Excel ✓
- CSV ✓
- JSON ✓

---

### 10. Settings & Configuration

**الحالي - ممتاز:**
- Site settings ✓
- Contact info ✓
- Logo ✓
- SEO ✓
- GA tracking ✓
- Paymob integration ✓

**ما ينقص:**
- ❌ Email Configuration (SMTP settings)
- ❌ Payment Gateways Management
  - Stripe settings
  - Paymob settings
  - Add new gateway
- ❌ Backup & Restore
- ❌ System Logs Viewer
- ❌ API Keys Management
- ❌ Webhooks Configuration
- ❌ Rate Limiting Settings
- ❌ Feature Flags (تفعيل/تعطيل ميزات)
- ❌ Maintenance Mode Schedule
- ❌ Email Queue Status
- ❌ Cache Management
- ❌ Database Health Check

---

### 11. Security & Audit

**الحالي:**
- Admin Audit Log ✓ (بسيط)

**ما ينقص:**
- ❌ Detailed Audit Trail
  - Before/After values
  - IP address
  - User agent
  - Session info
- ❌ Login Attempts Log
- ❌ Failed Actions Log
- ❌ Security Alerts
  - Multiple failed logins
  - Unusual activity
  - Large refunds
- ❌ Access Control List (ACL)
- ❌ IP Whitelist/Blacklist
- ❌ Session Management (قائمة الجلسات النشطة)
- ❌ Force Logout All Users
- ❌ Security Reports
- ❌ Compliance Reports (GDPR, etc)

---

### 12. Automation & Workflows

**الحالي:**
- ❌ لا يوجد أتمتة!

**المطلوب:**
1. **Auto-assignment Rules**
   - Assign to least busy staff
   - Round-robin assignment
   - By destination expertise
   
2. **Status Auto-update**
   - Auto-submit after payment
   - Auto-approve after all documents verified
   
3. **Reminders**
   - Document upload reminder
   - Payment reminder
   - Late application escalation
   
4. **Email Automation**
   - Welcome email
   - Document received
   - Application approved
   - Visa issued
   
5. **Scheduled Tasks**
   - Daily summary report
   - Weekly performance report
   - Monthly revenue report
   - Auto-archive old applications

---

### 13. UI/UX Improvements

**الحالي:**
- واجهة عربية نظيفة
- Sidebar navigation
- Responsive design

**التحسينات المطلوبة:**
- ❌ Dark Mode (المطلوب: Modern Dark Dashboard)
- ❌ Customizable Dashboard (ترتيب الويدجتس)
- ❌ Quick Actions Menu (Ctrl+K command palette)
- ❌ Keyboard Shortcuts
- ❌ Real-time Updates (بدون refresh)
- ❌ Progress Indicators (loading states)
- ❌ Confirmation Dialogs (هل أنت متأكد؟)
- ❌ Toast Notifications (إشعارات منبثقة)
- ❌ Empty States (رسائل عندما لا توجد بيانات)
- ❌ Error States (رسائل خطأ واضحة)
- ❌ Help Tooltips
- ❌ Onboarding Tour (جولة تعريفية للإداري الجديد)

---

### 14. Mobile Admin App

**الحالي:**
- responsive ✓ لكن محدود

**المطلوب:**
- ❌ Mobile-optimized views
- ❌ Touch-friendly controls
- ❌ Push notifications
- ❌ Offline mode (قراءة فقط)
- ❌ Quick actions

---

### 15. Integrations

**الحالي:**
- Supabase ✓
- Paymob ✓
- Stripe ✓

**المطلوبة:**
- ❌ CRM Integration (Salesforce, HubSpot)
- ❌ Accounting Software (QuickBooks, Xero)
- ❌ Email Marketing (Mailchimp, SendGrid)
- ❌ SMS Provider (Twilio, Nexmo)
- ❌ WhatsApp Business API
- ❌ Google Drive (backup)
- ❌ Slack (notifications)
- ❌ Zapier/Make (automation)

---

## 🎯 خطة التنفيذ المقترحة

### المرحلة 1: الأساسيات الحرجة (أسبوع 1)

**الهدف:** إصلاح النواقص الحرجة التي تعيق العمل اليومي

1. **نظام الأدوار المتعدد** ⭐⭐⭐
   - Database migration
   - 5 أدوار: Super Admin, Admin, Manager, Operator, Support
   - Permissions matrix
   - UI لإدارة الأدوار
   
2. **Bulk Actions** ⭐⭐⭐
   - تعيين موظف جماعي
   - تغيير حالة جماعي
   - تصدير محدد
   
3. **Document Preview** ⭐⭐⭐
   - معاينة PDF
   - معاينة صور
   - بدون تحميل

**المخرجات:**
- صلاحيات واضحة لكل موظف
- سرعة أكبر في المعالجة
- تجربة أفضل

---

### المرحلة 2: Analytics & Reports (أسبوع 2)

**الهدف:** اتخاذ قرارات مبنية على بيانات

1. **Enhanced Dashboard** ⭐⭐⭐
   - Revenue Chart (line + bar)
   - Conversion Funnel
   - Top Destinations
   - Staff Performance
   - Payment Methods
   
2. **Reports System** ⭐⭐⭐
   - Revenue Report
   - Operations Report
   - Staff Performance Report
   - Export PDF/Excel
   
3. **Real-time Updates** ⭐⭐
   - Live notifications
   - Auto-refresh counters
   - Sound alerts

**المخرجات:**
- فهم عميق للأداء
- تقارير احترافية
- قرارات أسرع

---

### المرحلة 3: Payments & Finance (أسبوع 3)

**الهدف:** إدارة مالية كاملة

1. **Payments Dashboard** ⭐⭐⭐
   - صفحة مستقلة
   - Analytics
   - Transaction details
   
2. **Advanced Refunds** ⭐⭐
   - Partial refunds
   - Approval workflow
   - Refund analytics
   
3. **Invoicing** ⭐⭐
   - Auto-generate invoices
   - PDF export
   - Email invoices

**المخرجات:**
- شفافية مالية كاملة
- سهولة المحاسبة
- تقارير ضريبية

---

### المرحلة 4: Automation (أسبوع 4)

**الهدف:** توفير الوقت والجهد

1. **Auto-assignment** ⭐⭐⭐
   - قواعد ذكية
   - توزيع متوازن
   
2. **Email Automation** ⭐⭐⭐
   - قوالب
   - Auto-send
   - Triggers
   
3. **Reminders** ⭐⭐
   - للعملاء
   - للموظفين
   - للمدراء

**المخرجات:**
- 50% تقليل في العمل اليدوي
- عدم نسيان أي شيء
- تجربة عميل أفضل

---

### المرحلة 5: Communications (أسبوع 5)

**الهدف:** تواصل فعّال

1. **Notifications Center** ⭐⭐⭐
   - In-app notifications
   - Badge counters
   - Sound alerts
   
2. **Internal Chat** ⭐⭐
   - بين الموظفين
   - على الطلب
   - مع التعليقات
   
3. **Templates Manager** ⭐⭐
   - Email templates
   - SMS templates
   - Variables support

**المخرجات:**
- تواصل سريع
- عدم فقدان معلومات
- رد أسرع على العملاء

---

### المرحلة 6: Advanced Features (أسبوع 6)

**الهدف:** ميزات احترافية

1. **Dark Mode UI** ⭐⭐
   - Modern dark design
   - Customizable
   - Smooth transitions
   
2. **Advanced Filters** ⭐⭐
   - Date ranges
   - Multiple conditions
   - Save filters
   
3. **Kanban Board** ⭐⭐
   - Drag & drop
   - Visual workflow
   - Quick updates

**المخرجات:**
- واجهة عصرية
- عمل أسرع
- تجربة ممتعة

---

### المرحلة 7: Security & Compliance (أسبوع 7)

**الهدف:** أمان وتوافق

1. **Enhanced Audit** ⭐⭐⭐
   - Before/After values
   - IP tracking
   - Detailed logs
   
2. **Security Alerts** ⭐⭐
   - Failed logins
   - Unusual activity
   - Email alerts
   
3. **Backup System** ⭐⭐⭐
   - Auto-backup
   - Manual backup
   - Restore

**المخرجات:**
- أمان محكم
- تتبع كامل
- سهولة استرجاع البيانات

---

## 📊 مصفوفة الأولويات

### Must Have (لا يمكن العمل بدونها)
1. نظام الأدوار المتعدد ⭐⭐⭐
2. Bulk Actions ⭐⭐⭐
3. Document Preview ⭐⭐⭐
4. Enhanced Dashboard ⭐⭐⭐
5. Payments Dashboard ⭐⭐⭐
6. Notifications Center ⭐⭐⭐
7. Enhanced Audit ⭐⭐⭐
8. Backup System ⭐⭐⭐

### Should Have (مهمة جداً)
9. Reports System ⭐⭐
10. Auto-assignment ⭐⭐
11. Email Automation ⭐⭐
12. Advanced Filters ⭐⭐
13. Templates Manager ⭐⭐
14. Invoicing ⭐⭐
15. Security Alerts ⭐⭐

### Nice to Have (تحسينات)
16. Dark Mode ⭐
17. Kanban Board ⭐
18. Internal Chat ⭐
19. SMS Integration ⭐
20. WhatsApp Integration ⭐

---

## 💰 تقدير الجهد

### التقدير بالأيام (8 ساعات/يوم):

| الميزة | الأيام | الملاحظات |
|--------|---------|-----------|
| نظام الأدوار | 3 | Database + Backend + UI |
| Bulk Actions | 2 | UI + Server Actions |
| Document Preview | 2 | PDF.js integration |
| Enhanced Dashboard | 4 | Charts + Analytics |
| Reports System | 5 | Multiple reports + Export |
| Payments Dashboard | 3 | UI + Analytics |
| Notifications Center | 3 | Realtime + UI |
| Auto-assignment | 2 | Logic + Triggers |
| Email Automation | 3 | Templates + Queue |
| Advanced Filters | 2 | UI + Backend |
| Enhanced Audit | 2 | Database + UI |
| Backup System | 2 | Cron + Storage |
| Dark Mode | 2 | CSS + Components |
| Kanban Board | 3 | Drag & Drop |
| Internal Chat | 4 | Realtime + UI |

**الإجمالي:** ~42 يوم عمل = **8-10 أسابيع**

---

## 🛠️ التقنيات المطلوبة

### Frontend:
- ✅ React 19 (موجود)
- ✅ Next.js 16 (موجود)
- ✅ Tailwind CSS (موجود)
- ➕ **Recharts** (للرسوم البيانية) - **مفقود حالياً!**
- ➕ **React-PDF** (معاينة PDF)
- ➕ **DnD Kit** (Drag & Drop)
- ➕ **Zustand** (State management)

### Backend:
- ✅ Supabase (موجود)
- ✅ PostgreSQL (موجود)
- ➕ **Redis** (للـ queue والـ cache)
- ➕ **Bull** (Job queue)
- ➕ **Nodemailer** (Email)

### Integrations:
- ➕ **Twilio** (SMS)
- ➕ **SendGrid** (Email)
- ➕ **Pusher** أو **Ably** (Realtime)
- ➕ **PDFKit** (PDF generation)
- ➕ **ExcelJS** (Excel export)

---

## 📁 البنية المقترحة للملفات الجديدة

```
src/
├── app/
│   ├── [locale]/
│   │   └── (console)/
│   │       └── admin/
│   │           ├── payments/
│   │           │   ├── page.tsx (جديد)
│   │           │   └── [id]/page.tsx (جديد)
│   │           ├── reports/
│   │           │   ├── page.tsx (جديد)
│   │           │   ├── revenue/page.tsx (جديد)
│   │           │   ├── operations/page.tsx (جديد)
│   │           │   └── staff/page.tsx (جديد)
│   │           ├── notifications/
│   │           │   └── page.tsx (جديد)
│   │           └── staff/
│   │               ├── page.tsx (جديد)
│   │               └── [id]/page.tsx (جديد)
│   │
│   └── actions/
│       ├── bulk-admin.ts (جديد)
│       ├── payments-admin.ts (جديد)
│       └── reports-admin.ts (جديد)
│
├── components/
│   └── admin/
│       ├── charts/
│       │   ├── revenue-chart.tsx (جديد)
│       │   ├── funnel-chart.tsx (جديد)
│       │   ├── bar-chart.tsx (جديد)
│       │   └── pie-chart.tsx (جديد)
│       ├── payments/
│       │   ├── payment-table.tsx (جديد)
│       │   ├── refund-dialog.tsx (جديد)
│       │   └── invoice-generator.tsx (جديد)
│       ├── notifications/
│       │   ├── notification-bell.tsx (جديد)
│       │   ├── notification-list.tsx (جديد)
│       │   └── notification-item.tsx (جديد)
│       ├── bulk-actions-bar.tsx (جديد)
│       ├── document-preview.tsx (جديد)
│       ├── kanban-board.tsx (جديد)
│       └── role-badge.tsx (جديد)
│
├── lib/
│   ├── data/
│   │   ├── analytics.ts (جديد)
│   │   ├── reports.ts (جديد)
│   │   ├── payments-admin.ts (جديد)
│   │   └── notifications-admin.ts (جديد)
│   ├── reports/
│   │   ├── generator.ts (جديد)
│   │   ├── pdf-exporter.ts (جديد)
│   │   └── excel-exporter.ts (جديد)
│   ├── automation/
│   │   ├── auto-assign.ts (جديد)
│   │   ├── email-queue.ts (جديد)
│   │   └── reminders.ts (جديد)
│   └── rbac/
│       ├── permissions.ts (جديد)
│       ├── roles.ts (جديد)
│       └── check.ts (جديد)
│
└── contexts/
    ├── notifications-context.tsx (جديد)
    └── admin-settings-context.tsx (جديد)
```

---

## 🗄️ Database Changes المطلوبة

### 1. نظام الأدوار
```sql
-- supabase/migrations/xxx_roles_system.sql

-- Add role enum
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'admin', 
  'manager',
  'operator',
  'support',
  'viewer',
  'user'
);

-- Update profiles table
ALTER TABLE profiles 
  ALTER COLUMN role TYPE admin_role USING role::text::admin_role;

-- Permissions table
CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role admin_role NOT NULL,
  resource TEXT NOT NULL,
  actions TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Notifications
```sql
-- supabase/migrations/xxx_notifications.sql

CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_notifs_user ON admin_notifications(user_id);
CREATE INDEX idx_admin_notifs_read ON admin_notifications(read);
```

### 3. Enhanced Audit
```sql
-- supabase/migrations/xxx_enhanced_audit.sql

ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS before_value JSONB;
ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS after_value JSONB;
ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE admin_audit ADD COLUMN IF NOT EXISTS session_id TEXT;
```

### 4. Automation
```sql
-- supabase/migrations/xxx_automation.sql

CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  conditions JSONB,
  actions JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automation_rules(id),
  entity_id TEXT,
  status TEXT,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ Acceptance Criteria (معايير القبول)

### نظام الأدوار:
- [ ] يمكن إنشاء 5 أدوار مختلفة
- [ ] كل دور له صلاحيات واضحة
- [ ] Super Admin يستطيع تعديل أي شيء
- [ ] Viewer يستطيع العرض فقط
- [ ] UI لإدارة الأدوار في `/admin/staff`

### Bulk Actions:
- [ ] تحديد متعدد في الجداول
- [ ] تعيين موظف لـ 10+ طلبات دفعة واحدة
- [ ] تغيير حالة جماعي
- [ ] تصدير محدد
- [ ] Confirmation dialog

### Document Preview:
- [ ] معاينة PDF بدون تحميل
- [ ] معاينة صور
- [ ] Zoom in/out
- [ ] Print
- [ ] Download

### Enhanced Dashboard:
- [ ] 7+ Charts
- [ ] Real-time updates
- [ ] Date range filter
- [ ] Export data
- [ ] Mobile responsive

### Reports System:
- [ ] 5 أنواع تقارير
- [ ] Export PDF
- [ ] Export Excel
- [ ] Email report
- [ ] Schedule reports

---

## 🎨 UI/UX Mockups المطلوبة

سأحتاج موافقتك على:

1. **Dark Mode Color Palette**
   - Background colors
   - Accent colors
   - Text colors
   - Component colors

2. **Dashboard Layout**
   - Widgets placement
   - Charts sizes
   - Stats cards

3. **Notifications Design**
   - Bell icon + badge
   - Dropdown design
   - Item layout

4. **Bulk Actions Bar**
   - Position (bottom/top)
   - Actions menu
   - Confirmation

---

## 🚀 خطة البدء

### الخطوة 1: المراجعة والموافقة
- [ ] مراجعة هذه الخطة
- [ ] تحديد الأولويات النهائية
- [ ] الموافقة على البدء

### الخطوة 2: Setup
- [ ] تثبيت recharts
- [ ] Setup Redis (اختياري)
- [ ] Setup development environment

### الخطوة 3: المرحلة 1 - الأساسيات
- [ ] نظام الأدوار
- [ ] Bulk Actions
- [ ] Document Preview

### الخطوة 4: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing

### الخطوة 5: Deployment
- [ ] Staging environment
- [ ] Production deployment
- [ ] Monitoring

---

## 📝 ملاحظات مهمة

1. **recharts مفقود حالياً** - يجب تثبيته أولاً
2. **الإعدادات الحالية ممتازة** - نبني عليها
3. **البنية قوية** - لا حاجة لإعادة هيكلة
4. **الكود نظيف** - سهل الصيانة
5. **Database schema جيد** - نضيف جداول فقط

---

## 🎯 النتيجة المتوقعة

### قبل التطوير:
- 18 صفحة Admin
- 2 أدوار (user/admin)
- إحصائيات بسيطة
- إدارة يدوية
- لا تقارير
- لا أتمتة

### بعد التطوير الكامل:
- 25+ صفحة Admin
- 6 أدوار مع صلاحيات
- Analytics متقدمة
- Bulk operations
- Reports system
- Automation
- Real-time notifications
- Dark mode
- Document preview
- Enhanced security
- Backup system

**التحسين المتوقع:**
- ⚡ 60% أسرع في المعالجة
- 📊 100% رؤية للبيانات
- 🔒 أمان أقوى بـ 3x
- 🤖 50% أقل عمل يدوي
- 😊 رضا الموظفين +80%

---

**آخر تحديث:** 2024-11-01  
**المشروع:** https://github.com/ahmedelllsayed/Evisa.tv  
**المطور:** Claude Opus 5.5 (Senior Full-Stack Engineer & Code Auditor)
