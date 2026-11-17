import { AdminPage, AdminPanel } from "@/components/admin/chrome";
import { ListsBoard } from "@/components/admin/marketing/lists-board";
import { SegmentsBoard } from "@/components/admin/marketing/segments-board";
import { marketingAccess } from "@/lib/data/marketing/access";
import { listContactLists, listContacts, listSegments } from "@/lib/data/marketing/library";
import { audienceOptions } from "@/lib/data/marketing/options";
import type { Page } from "@/lib/page";

export const metadata = { title: "الشرائح" };

export default async function MarketingSegmentsPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const access = await marketingAccess(locale);
  const listId = typeof sp.list === "string" ? sp.list : null;
  const [segments, options, lists, contacts] = await Promise.all([
    listSegments(),
    audienceOptions(),
    listContactLists(),
    listId ? listContacts(listId) : Promise.resolve([]),
  ]);
  return (
    <AdminPage title="الشرائح والقوائم" description="الشريحة فلتر محفوظ يُحسب وقت الإرسال، فيدخل فيه كل من يطابقه يومها. القوائم جهات من خارج الموقع تلصقها أو تستوردها.">
      <AdminPanel title="الشرائح" hint="تُستخدم في الحملات وفي قصر الكوبون على عملاء معيّنين.">
        <SegmentsBoard locale={locale} segments={segments} options={options} canEdit={access.canEdit} />
      </AdminPanel>
      <AdminPanel title="قوائم الجهات" hint="بريد أو هاتف لأشخاص ليس لهم حساب. يدخلون الحملات حين تختار «الجهات المستوردة».">
        <ListsBoard locale={locale} lists={lists} selected={listId} contacts={contacts} canEdit={access.canEdit} />
      </AdminPanel>
    </AdminPage>
  );
}
