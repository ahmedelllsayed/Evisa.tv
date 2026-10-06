import { AdminCard, AdminEmpty, AdminPage } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listContactMessages } from "@/lib/data/inbox";
import type { Page } from "@/lib/page";
import { formatAt } from "@/lib/visa";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const messages = await listContactMessages();
  return (
    <AdminPage title="الرسائل" description="رسائل نموذج التواصل.">
      {messages.length === 0 ? (
        <AdminEmpty>لا توجد رسائل.</AdminEmpty>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id}>
              <AdminCard>
                <p className="font-medium">
                  {message.name} · {message.email}
                </p>
                {message.topic && <p className="mt-1 text-sm text-muted-ink">{message.topic}</p>}
                <p className="mt-3 text-sm whitespace-pre-wrap">{message.body}</p>
                <p className="mt-2 text-xs text-muted-ink">{formatAt(message.createdAt)}</p>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
