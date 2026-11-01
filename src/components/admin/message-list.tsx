"use client";

import { useState, useTransition } from "react";
import { adminDeleteMessage, adminReplyMessage, adminSetMessageRead } from "@/app/actions/admin";
import { AdminCard, AdminError } from "@/components/admin/chrome";
import type { ContactMessage } from "@/lib/data/inbox";
import { formatAt } from "@/lib/visa";

export function MessageList({ locale, messages }: { locale: string; messages: ContactMessage[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <ul className="space-y-3">
      {error && <AdminError>{error}</AdminError>}
      {messages.map((message) => (
        <li key={message.id}>
          <AdminCard className={message.readAt ? "" : "border-brand"}>
            <p className="font-medium">
              {message.name} · {message.email}
              {!message.readAt && <span className="ms-2 text-xs text-brand">غير مقروء</span>}
            </p>
            {message.topic && <p className="mt-1 text-sm text-muted-ink">{message.topic}</p>}
            <p className="mt-3 text-sm whitespace-pre-wrap">{message.body}</p>
            <p className="mt-2 text-xs text-muted-ink">{formatAt(message.createdAt)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => start(() => adminSetMessageRead(locale, message.id, !message.readAt))}
              >
                {message.readAt ? "تعليم كغير مقروء" : "تعليم كمقروء"}
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-full border border-line px-3 py-1 text-xs"
                onClick={() => start(() => adminDeleteMessage(locale, message.id))}
              >
                حذف
              </button>
            </div>
            <ReplyForm
              pending={pending}
              onSend={(reply) =>
                start(async () => {
                  setError(null);
                  const result = await adminReplyMessage(locale, message.id, message.email, reply);
                  if (result && !result.ok) setError(result.error);
                })
              }
            />
          </AdminCard>
        </li>
      ))}
    </ul>
  );
}

const replies = [
  "استلمنا رسالتك وسنرد عليك خلال يوم عمل.",
  "نحتاج صورة أوضح لجواز السفر لإكمال الطلب.",
  "تم استلام الدفع، والطلب الآن قيد المراجعة.",
  "يمكنك متابعة حالة الطلب من صفحة حسابك.",
];

function ReplyForm({ pending, onSend }: { pending: boolean; onSend: (reply: string) => void }) {
  const [reply, setReply] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap gap-2"
      action={() => onSend(reply)}
    >
      <select className="h-10 rounded-xl border border-line bg-background px-2 text-sm" value="" onChange={(event) => setReply(event.target.value)}>
        <option value="">رد جاهز</option>
        {replies.map((text) => (
          <option key={text} value={text}>{text}</option>
        ))}
      </select>
      <input name="reply" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="رد بالبريد" className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm" />
      <button disabled={pending || !reply.trim()} className="rounded-full bg-brand px-4 text-sm text-white">إرسال</button>
    </form>
  );
}
