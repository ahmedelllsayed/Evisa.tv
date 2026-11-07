import { MessageInbox } from "@/components/admin/message-list";
import { AdminEmpty, AdminPage, Pill } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listMessageReplies, matchMessageSenders } from "@/lib/data/admin-people";
import { listContactMessages } from "@/lib/data/inbox";
import type { Page } from "@/lib/page";

export const metadata = { title: "الرسائل" };

export default async function AdminMessagesPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  await requireAdmin(locale);
  const q = typeof sp.q === "string" ? sp.q : "";
  const id = typeof sp.id === "string" ? sp.id : null;
  const messages = await listContactMessages();
  const [replies, senders] = await Promise.all([
    listMessageReplies(messages.map((message) => message.id)),
    matchMessageSenders(messages.map((message) => message.email)),
  ]);
  const unread = messages.filter((message) => !message.readAt).length;
  const now = new Date().toISOString();

  return (
    <AdminPage
      title="الرسائل"
      description="رسائل نموذج التواصل. اقرأ، رد بالبريد من هنا، ويُحفظ كل رد في سجل الرسالة."
      action={
        messages.length ? (
          <>
            <Pill tone={unread ? "info" : "neutral"} dot={unread > 0}>
              <span className="font-mono tabular-nums">{unread}</span> غير مقروءة
            </Pill>
            <Pill>
              <span className="font-mono tabular-nums">{messages.length}</span> رسالة
            </Pill>
          </>
        ) : null
      }
    >
      {messages.length === 0 ? (
        <AdminEmpty title="صندوق الرسائل فارغ">تظهر هنا الرسائل التي يرسلها الزوار من صفحة التواصل.</AdminEmpty>
      ) : (
        <MessageInbox locale={locale} messages={messages} replies={replies} senders={senders} initialQuery={q} initialId={id} now={now} />
      )}
    </AdminPage>
  );
}
