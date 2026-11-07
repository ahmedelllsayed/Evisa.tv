// Fills the embedded local database with sample applications, payments, staff and messages
// so the admin console can be reviewed with realistic content.
// Usage: stop `next dev`, then run `npm run db:demo`. Refuses to run when DATABASE_URL is set.
import { getDb, migrate, seed } from "../src/lib/db/core.ts";

if (process.env.DATABASE_URL) {
  console.error("db:demo only writes to the local embedded database. Unset DATABASE_URL.");
  process.exit(1);
}

const db = await getDb();
await migrate(db);
await seed(db);

const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from applications where reference like 'DEMO-%'");
if (n > 0) {
  console.log(`demo data already present (${n} applications). Delete rows with reference DEMO-* to rebuild.`);
  process.exit(0);
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function profile(email: string, fullName: string, role: string, phone: string | null = null) {
  const [row] = await db.query<{ id: string }>(
    `insert into profiles (email, full_name, phone, role) values ($1,$2,$3,$4)
     on conflict (email) do update set full_name = excluded.full_name, role = excluded.role
     returning id`,
    [email, fullName, phone, role],
  );
  return row!.id;
}

const staff = [
  { id: await profile("mona.operator@evisa.local", "منى عادل", "operator"), dept: "operations", max: 12 },
  { id: await profile("karim.manager@evisa.local", "كريم فؤاد", "manager"), dept: "operations", max: 20 },
  { id: await profile("salma.support@evisa.local", "سلمى حسن", "support"), dept: "support", max: 8 },
];
for (const member of staff) {
  await db.query(
    `insert into staff_profiles (user_id, department, max_applications, active, hired_at)
     values ($1,$2,$3,true,current_date - 200) on conflict (user_id) do nothing`,
    [member.id, member.dept, member.max],
  );
}

const customers = [
  ["ahmed.samir@example.com", "Ahmed Samir", "+201001112233"],
  ["nour.hassan@example.com", "Nour Hassan", "+201112223344"],
  ["omar.khaled@example.com", "Omar Khaled", "+201223334455"],
  ["mariam.adel@example.com", "Mariam Adel", "+201234567890"],
  ["youssef.ali@example.com", "Youssef Ali", null],
  ["hana.mostafa@example.com", "Hana Mostafa", "+201098765432"],
  ["karim.zaki@example.com", "Karim Zaki", "+201155566677"],
  ["laila.fathy@example.com", "Laila Fathy", null],
  ["mostafa.nabil@example.com", "Mostafa Nabil", "+201066677788"],
  ["sara.gamal@example.com", "Sara Gamal", "+201277788899"],
] as const;
const customerIds: string[] = [];
for (const [email, name, phone] of customers) customerIds.push(await profile(email, name, "user", phone));

const destinations = await db.query<{ id: string; name: string; gov_fee: string; service_fee: string; processing_hours: number | null }>(
  "select id, name, gov_fee, service_fee, processing_hours from destinations where visa_required and is_active order by sort_order limit 8",
);
if (!destinations.length) {
  console.error("no destinations found");
  process.exit(1);
}

type Plan = {
  status: string;
  daysAgo: number;
  paid: "paid" | "pending" | "failed" | "refunded" | null;
  late?: boolean;
  docs: ("uploaded" | "verified" | "rejected")[];
  assignee?: number;
  travelers?: number;
};

const plans: Plan[] = [
  { status: "draft", daysAgo: 1, paid: null, docs: [] },
  { status: "draft", daysAgo: 6, paid: null, docs: ["uploaded"] },
  { status: "payment_pending", daysAgo: 0, paid: "pending", docs: ["uploaded", "uploaded"] },
  { status: "payment_pending", daysAgo: 3, paid: "failed", docs: ["uploaded", "uploaded"] },
  { status: "submitted", daysAgo: 0, paid: "paid", docs: ["uploaded", "uploaded"] },
  { status: "submitted", daysAgo: 1, paid: "paid", docs: ["uploaded", "uploaded"], assignee: 0 },
  { status: "submitted", daysAgo: 2, paid: "paid", docs: ["uploaded", "rejected"], assignee: 0 },
  { status: "submitted", daysAgo: 5, paid: "paid", docs: ["verified", "uploaded"], late: true },
  { status: "in_review", daysAgo: 2, paid: "paid", docs: ["verified", "verified"], assignee: 1 },
  { status: "in_review", daysAgo: 4, paid: "paid", docs: ["verified", "rejected"], assignee: 0, late: true },
  { status: "in_review", daysAgo: 3, paid: "paid", docs: ["verified", "verified", "verified", "verified"], assignee: 1, travelers: 2 },
  { status: "filed", daysAgo: 6, paid: "paid", docs: ["verified", "verified"], assignee: 1 },
  { status: "filed", daysAgo: 9, paid: "paid", docs: ["verified", "verified"], assignee: 0, late: true },
  { status: "approved", daysAgo: 8, paid: "paid", docs: ["verified", "verified"], assignee: 0 },
  { status: "approved", daysAgo: 12, paid: "paid", docs: ["verified", "verified"], assignee: 1 },
  { status: "approved", daysAgo: 18, paid: "paid", docs: ["verified", "verified"], assignee: 1 },
  { status: "approved", daysAgo: 25, paid: "paid", docs: ["verified", "verified"], assignee: 0 },
  { status: "approved", daysAgo: 40, paid: "paid", docs: ["verified", "verified"], assignee: 1 },
  { status: "rejected", daysAgo: 15, paid: "paid", docs: ["verified", "verified"], assignee: 0 },
  { status: "refunded", daysAgo: 20, paid: "refunded", docs: ["verified", "verified"], assignee: 1 },
  { status: "cancelled", daysAgo: 11, paid: null, docs: ["uploaded"] },
  { status: "submitted", daysAgo: 0, paid: "paid", docs: ["uploaded", "uploaded"] },
];

const kinds = ["passport", "photo"];
let index = 0;
for (const plan of plans) {
  index += 1;
  const destination = destinations[index % destinations.length]!;
  const userId = customerIds[index % customerIds.length]!;
  const travelerCount = plan.travelers ?? 1;
  const gov = Number(destination.gov_fee) * travelerCount;
  const service = Number(destination.service_fee) * travelerCount;
  const total = gov + service;
  const created = `now() - interval '${plan.daysAgo} days' - interval '${(index * 37) % 600} minutes'`;
  const hours = destination.processing_hours ?? 72;
  const guaranteed = plan.late ? "now() - interval '6 hours'" : `${created} + interval '${hours + 24} hours'`;
  const paidAt = plan.paid === "paid" || plan.paid === "refunded" ? `${created} + interval '20 minutes'` : "null";
  const deliveredAt = plan.status === "approved" ? `${created} + interval '${Math.max(24, hours - 6)} hours'` : "null";
  const assignee = plan.assignee == null ? null : staff[plan.assignee]!.id;
  const [app] = await db.query<{ id: string }>(
    `insert into applications (reference, user_id, destination_id, status, step, departure_date, express, guaranteed_at, traveler_count,
       gov_fee, service_fee, total_amount, currency, paid_at, delivered_at, assignee_id, created_at, updated_at, locale)
     values ($1,$2,$3,$4,$5,current_date + 30,false,${guaranteed},$6,$7,$8,$9,'EGP',${paidAt},${deliveredAt},$10,${created},${created} + interval '1 hour',$11)
     returning id`,
    [
      `DEMO-${String(index).padStart(3, "0")}`,
      userId,
      destination.id,
      plan.status,
      plan.status === "draft" ? "documents" : "done",
      travelerCount,
      gov,
      service,
      total,
      assignee,
      index % 3 === 0 ? "ar-EG" : "en-EG",
    ],
  );
  const applicationId = app!.id;
  const travelerIds: string[] = [];
  for (let t = 0; t < travelerCount; t += 1) {
    const [traveler] = await db.query<{ id: string }>(
      `insert into travelers (application_id, first_name, last_name, sex, date_of_birth, nationality, passport_number, passport_expiry, sort_order)
       values ($1,$2,$3,'M','1990-04-12','EG',$4,current_date + 900,$5) returning id`,
      [applicationId, customers[index % customers.length]![1].split(" ")[0], customers[index % customers.length]![1].split(" ")[1] ?? "", `A${1000000 + index * 10 + t}`, t],
    );
    travelerIds.push(traveler!.id);
  }
  for (let d = 0; d < plan.docs.length; d += 1) {
    const travelerId = travelerIds[Math.floor(d / kinds.length)] ?? travelerIds[0]!;
    const kind = kinds[d % kinds.length]!;
    const storagePath = `${userId}/${applicationId}/demo-${kind}-${d}.png`;
    await db.query("insert into stored_files (path, bytes, mime) values ($1,$2,'image/png') on conflict (path) do nothing", [storagePath, png]);
    await db.query(
      `insert into documents (application_id, traveler_id, kind, storage_path, file_name, mime_type, size_bytes, status, reject_reason)
       values ($1,$2,$3,$4,$5,'image/png',$6,$7,$8)`,
      [applicationId, travelerId, kind, storagePath, `${kind}.png`, png.length, plan.docs[d], plan.docs[d] === "rejected" ? "الصورة غير واضحة والخلفية ليست بيضاء." : null],
    );
  }
  await db.query(
    `insert into application_events (application_id, status, title, description, created_at) values ($1,'draft','Application started',$2,${created})`,
    [applicationId, destination.name],
  );
  if (plan.paid) {
    const status = plan.paid;
    const [payment] = await db.query<{ id: string }>(
      `insert into payments (application_id, provider, provider_ref, amount, currency, status, merchant_order_id, transaction_id, method,
         refunded_amount, processed_at, created_at)
       values ($1,'paymob',$2,$3,'EGP',$4,$2,$5,$6,$7,${status === "pending" ? "null" : `${created} + interval '20 minutes'`},${created} + interval '15 minutes')
       returning id`,
      [
        applicationId,
        `DEMO-ORDER-${index}`,
        total,
        status,
        status === "pending" ? null : `${880000 + index}`,
        index % 4 === 0 ? "wallet" : "card",
        status === "refunded" ? total : 0,
      ],
    );
    if (status === "paid" || status === "refunded") {
      await db.query(
        `insert into payment_receipts (payment_id, application_id, receipt_no, amount, currency, issued_at)
         values ($1,$2,$3,$4,'EGP',${created} + interval '20 minutes') on conflict do nothing`,
        [payment!.id, applicationId, `RCP-DEMO-${String(index).padStart(4, "0")}`, total],
      );
      await db.query(
        `insert into application_events (application_id, status, title, description, created_at)
         values ($1,'submitted','Payment received','Your application is submitted and our team is checking your documents',${created} + interval '20 minutes')`,
        [applicationId],
      );
      await db.query(
        `insert into application_status_history (application_id, from_status, to_status, reason, created_at)
         values ($1,'draft','submitted','payment_received',${created} + interval '20 minutes')`,
        [applicationId],
      );
    }
  }
  if (plan.status === "refunded" || index === 8) {
    await db.query(
      "insert into refund_requests (application_id, user_id, reason, status) values ($1,$2,$3,$4) on conflict (application_id) do nothing",
      [applicationId, userId, "تأخرت التأشيرة عن الموعد المستهدف.", plan.status === "refunded" ? "approved" : "open"],
    );
  }
}

const messages = [
  ["Ahmed Samir", "ahmed.samir@example.com", "Payment", "I paid but the page still shows pending. Can you check order DEMO-ORDER-3?", null],
  ["نور حسن", "nour.hassan@example.com", "Documents", "هل يمكن رفع صورة الجواز بصيغة PDF بدلاً من الصورة؟", "now() - interval '2 days'"],
  ["Omar Khaled", "omar.khaled@example.com", "Refund", "My visa is late. How do I request the service fee back?", null],
  ["مريم عادل", "mariam.adel@example.com", "General", "هل تقدمون تأشيرة شنغن للمقيمين في الإسكندرية؟", null],
  ["Partner Travel", "hello@partner-travel.example", "Partnership", "We are a travel agency in Cairo and want to send 40 applications a month.", "now() - interval '5 days'"],
] as const;
for (let m = 0; m < messages.length; m += 1) {
  const [name, email, topic, body, read] = messages[m]!;
  await db.query(
    `insert into contact_messages (name, email, topic, body, read_at, created_at) values ($1,$2,$3,$4,${read ?? "null"}, now() - interval '${m * 7} hours')`,
    [name, email, topic, body],
  );
}

const funnel = [
  ["view_visa", 420],
  ["begin_application", 160],
  ["travelers_done", 120],
  ["documents_done", 90],
  ["reach_payment", 70],
  ["payment_start", 55],
  ["payment_success", 41],
  ["payment_failed", 9],
  ["application_submitted", 41],
] as const;
for (const [name, count] of funnel) {
  for (let i = 0; i < count; i += 1) {
    const slug = ["turkey-visa", "morocco-visa", "china-visa", "indonesia-visa"][i % 4];
    await db.query(
      `insert into funnel_events (name, locale, destination_slug, created_at) values ($1,$2,$3, now() - interval '${i % 7} days' - interval '${(i * 13) % 1440} minutes')`,
      [name, i % 3 === 0 ? "ar-EG" : "en-EG", slug],
    );
  }
}

const audits = [
  ["admin@example.com", "settings.save", "site_settings", null],
  ["karim.manager@evisa.local", "payment.refund", "DEMO-020", "full"],
  ["mona.operator@evisa.local", "document.reject", "DEMO-007", "الصورة غير واضحة"],
  ["admin@example.com", "user.role", "salma.support@evisa.local", "support"],
  ["karim.manager@evisa.local", "destination.save", "turkey-visa", null],
] as const;
for (let a = 0; a < audits.length; a += 1) {
  const [actor, action, target, detail] = audits[a]!;
  await db.query(
    `insert into admin_audit (actor_email, action, target, detail, created_at) values ($1,$2,$3,$4, now() - interval '${a * 5} hours')`,
    [actor, action, target, detail],
  );
}

const [first] = destinations;
await db.query(
  "insert into fee_changes (destination_id, old_total, new_total, reason, changed_at) values ($1,$2,$3,$4, now() - interval '3 days'), ($1,$3,$5,$6, now() - interval '1 day')",
  [first!.id, 2500, 2721, "Government fee increased", 2690, "Service fee adjusted"],
);

console.log(`demo data: ${plans.length} applications, ${customers.length} customers, ${staff.length} staff, ${messages.length} messages`);
process.exit(0);
