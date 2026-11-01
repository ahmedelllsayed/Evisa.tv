import { MessageList } from "@/components/admin/message-list";
import { AdminEmpty, AdminPage, adminInputClass, adminPrimaryClass } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listContactMessages } from "@/lib/data/inbox";
import type { Page } from "@/lib/page";

export const metadata = { title: "الرسائل" };

export default async function AdminMessagesPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const q = typeof sp.q === "string" ? sp.q : "";
  const messages = await listContactMessages(q);
  return (
    <AdminPage title="الرسائل" description="رسائل نموذج التواصل. يمكن تعليمها مقروءة أو الرد عليها بالبريد.">
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="بحث" className={adminInputClass} />
        <button className={adminPrimaryClass}>بحث</button>
      </form>
      {messages.length === 0 ? <AdminEmpty>لا توجد رسائل.</AdminEmpty> : <MessageList locale={locale} messages={messages} />}
    </AdminPage>
  );
}
