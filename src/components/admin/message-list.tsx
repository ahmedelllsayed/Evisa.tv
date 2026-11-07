"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { adminDeleteMessage, adminReplyMessage, adminSetMessageRead } from "@/app/actions/admin";
import { AdminNotice, FilterChip, Pill, adminGhostClass, adminPrimaryClass, adminTextareaClass, type Tone } from "@/components/admin/chrome";
import { ConfirmButton, Counter } from "@/components/admin/chrome-client";
import { relativeTime, shortDateTime } from "@/components/admin/format";
import { Avatar, TopicChip } from "@/components/admin/people/ui";
import type { MessageReply, SenderMatch } from "@/lib/data/admin-people";
import type { ContactMessage } from "@/lib/data/inbox";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

const cannedReplies = [
  "استلمنا رسالتك وسنرد عليك خلال يوم عمل.",
  "نحتاج صورة أوضح لجواز السفر لإكمال الطلب.",
  "تم استلام الدفع، والطلب الآن قيد المراجعة.",
  "يمكنك متابعة حالة الطلب من صفحة حسابك.",
];

const MAX_REPLY = 2000;

type Filter = "all" | "unread" | "read";
type Notice = { tone: Tone; title: string; body?: string };
type Overrides = { read: Record<string, boolean>; deleted: Record<string, true> };
type OverrideAction = { kind: "read"; id: string; read: boolean } | { kind: "delete"; id: string };

function applyOverride(state: Overrides, action: OverrideAction): Overrides {
  if (action.kind === "read") return { ...state, read: { ...state.read, [action.id]: action.read } };
  return { ...state, deleted: { ...state.deleted, [action.id]: true } };
}

function typingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

export function MessageInbox({
  locale,
  messages,
  replies,
  senders,
  initialQuery,
  initialId,
  now,
}: {
  locale: string;
  messages: ContactMessage[];
  replies: Record<string, MessageReply[]>;
  senders: Record<string, SenderMatch>;
  initialQuery: string;
  initialId: string | null;
  now: string;
}) {
  const nowDate = useMemo(() => new Date(now), [now]);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (initialId && messages.some((message) => message.id === initialId) ? initialId : (messages.find((message) => !message.readAt) ?? messages[0])?.id ?? null),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notices, setNotices] = useState<Record<string, Notice | undefined>>({});
  const [overrides, override] = useOptimistic<Overrides, OverrideAction>({ read: {}, deleted: {} }, applyOverride);
  const [statusPending, startStatus] = useTransition();
  const [replyPending, startReply] = useTransition();
  const detailRef = useRef<HTMLDivElement>(null);

  const isRead = (message: ContactMessage) => overrides.read[message.id] ?? Boolean(message.readAt);
  const live = messages.filter((message) => !overrides.deleted[message.id]);
  const needle = query.trim().toLowerCase();
  const searched = needle
    ? live.filter((message) => `${message.name} ${message.email} ${message.topic ?? ""} ${message.body}`.toLowerCase().includes(needle))
    : live;
  const counts = {
    all: searched.length,
    unread: searched.filter((message) => !isRead(message)).length,
    read: searched.filter((message) => isRead(message)).length,
  };
  const visible = searched.filter((message) => (filter === "all" ? true : filter === "unread" ? !isRead(message) : isRead(message)));
  const current = live.find((message) => message.id === selectedId) ?? visible[0] ?? null;
  const position = current ? visible.findIndex((message) => message.id === current.id) : -1;

  const select = (id: string, scroll = true) => {
    setSelectedId(id);
    if (scroll && window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };
  const step = (delta: number) => {
    const next = visible[position + delta];
    if (next) select(next.id, false);
  };

  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || typingTarget(event.target)) return;
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        stepRef.current(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        stepRef.current(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notify = (id: string, notice?: Notice) => setNotices((all) => ({ ...all, [id]: notice }));

  const toggleRead = (message: ContactMessage) => {
    const read = !isRead(message);
    startStatus(async () => {
      override({ kind: "read", id: message.id, read });
      try {
        await adminSetMessageRead(locale, message.id, read);
      } catch {
        notify(message.id, { tone: "danger", title: "تعذر تحديث حالة الرسالة.", body: "حاول مرة أخرى بعد لحظات." });
      }
    });
  };

  const remove = (message: ContactMessage) => {
    const next = visible[position + 1] ?? visible[position - 1] ?? null;
    startStatus(async () => {
      override({ kind: "delete", id: message.id });
      setSelectedId(next?.id ?? null);
      try {
        await adminDeleteMessage(locale, message.id);
      } catch {
        setSelectedId(message.id);
        notify(message.id, { tone: "danger", title: "تعذر حذف الرسالة.", body: "حاول مرة أخرى بعد لحظات." });
      }
    });
  };

  const send = (message: ContactMessage) => {
    const text = (drafts[message.id] ?? "").trim();
    if (text.length < 2) {
      notify(message.id, { tone: "warning", title: "اكتب الرد أولاً، أو اختر رداً جاهزاً." });
      return;
    }
    notify(message.id, undefined);
    startReply(async () => {
      try {
        const result = await adminReplyMessage(locale, message.id, message.email, text);
        if (result && !result.ok) {
          notify(message.id, { tone: "danger", title: "لم يُرسل الرد.", body: `${result.error} النص ما زال في المربع ولم يُحفظ في السجل.` });
          return;
        }
        setDrafts((all) => ({ ...all, [message.id]: "" }));
        notify(message.id, { tone: "success", title: `أُرسل الرد إلى ${message.email}`, body: "حُفظ في سجل الردود، وعُلّمت الرسالة مقروءة." });
      } catch {
        notify(message.id, { tone: "danger", title: "لم يُرسل الرد.", body: "حدث خطأ في الاتصال. النص ما زال في المربع." });
      }
    });
  };

  const insertCanned = (message: ContactMessage, text: string) => {
    setDrafts((all) => {
      const existing = (all[message.id] ?? "").trimEnd();
      const first = message.name.trim().split(/\s+/)[0] ?? "";
      return { ...all, [message.id]: existing ? `${existing}\n${text}` : `مرحباً ${first}،\n${text}` };
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-5 [color-scheme:dark] lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-xl border bg-card lg:sticky lg:top-4">
        <div className="space-y-2 border-b p-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو البريد أو النص…"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "الكل"],
                ["unread", "غير مقروءة"],
                ["read", "مقروءة"],
              ] as const
            ).map(([value, label]) => (
              <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>
                {label} <span className="ms-1 font-mono tabular-nums opacity-70">{counts[value]}</span>
              </FilterChip>
            ))}
          </div>
        </div>
        <ul className="max-h-[70svh] divide-y divide-border/60 overflow-y-auto lg:max-h-[calc(100svh-13rem)]">
          {visible.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">{needle ? `لا توجد رسائل تطابق «${query.trim()}».` : "لا توجد رسائل هنا."}</li>
          ) : (
            visible.map((message) => {
              const unread = !isRead(message);
              const active = current?.id === message.id;
              const replyCount = replies[message.id]?.length ?? 0;
              return (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => select(message.id)}
                    aria-current={active || undefined}
                    className={cn(
                      "relative flex w-full gap-3 px-4 py-3 text-start transition-colors",
                      active ? "bg-accent" : "hover:bg-accent/40",
                    )}
                  >
                    {active ? <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" /> : null}
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary shadow-[0_0_0_3px_rgba(56,189,248,0.15)]" : "bg-transparent")} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("truncate text-sm", unread ? "font-semibold text-foreground" : "text-foreground/85")}>{message.name}</span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{relativeTime(message.createdAt, nowDate)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <TopicChip topic={message.topic} />
                        {replyCount ? (
                          <Pill tone="success" className="px-2 py-0 text-[11px]">
                            رُدّ عليها{replyCount > 1 ? ` ×${replyCount}` : ""}
                          </Pill>
                        ) : null}
                      </span>
                      <span dir="auto" className={cn("mt-1 line-clamp-2 block text-xs leading-relaxed", unread ? "text-foreground/75" : "text-muted-foreground")}>
                        {message.body}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <p className="hidden border-t px-4 py-2 text-[11px] text-muted-foreground lg:block">
          التنقل: <kbd className="rounded border border-border px-1 font-mono">J</kbd> / <kbd className="rounded border border-border px-1 font-mono">K</kbd> أو الأسهم
        </p>
      </section>

      <div ref={detailRef} className="min-w-0 scroll-mt-4">
        {current ? (
          <MessageDetail
            key={current.id}
            locale={locale}
            message={current}
            read={isRead(current)}
            replies={replies[current.id] ?? []}
            sender={senders[current.email.toLowerCase()]}
            nowDate={nowDate}
            draft={drafts[current.id] ?? ""}
            onDraft={(value) => setDrafts((all) => ({ ...all, [current.id]: value }))}
            notice={notices[current.id]}
            statusPending={statusPending}
            replyPending={replyPending}
            onToggleRead={() => toggleRead(current)}
            onDelete={() => remove(current)}
            onSend={() => send(current)}
            onCanned={(text) => insertCanned(current, text)}
            position={position}
            total={visible.length}
            onStep={step}
          />
        ) : (
          <div className="rounded-xl border border-dashed px-5 py-16 text-center text-sm text-muted-foreground">اختر رسالة من القائمة لعرضها.</div>
        )}
      </div>
    </div>
  );
}

function MessageDetail({
  locale,
  message,
  read,
  replies,
  sender,
  nowDate,
  draft,
  onDraft,
  notice,
  statusPending,
  replyPending,
  onToggleRead,
  onDelete,
  onSend,
  onCanned,
  position,
  total,
  onStep,
}: {
  locale: string;
  message: ContactMessage;
  read: boolean;
  replies: MessageReply[];
  sender?: SenderMatch;
  nowDate: Date;
  draft: string;
  onDraft: (value: string) => void;
  notice?: Notice;
  statusPending: boolean;
  replyPending: boolean;
  onToggleRead: () => void;
  onDelete: () => void;
  onSend: () => void;
  onCanned: (text: string) => void;
  position: number;
  total: number;
  onStep: (delta: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b bg-gradient-to-b from-white/[0.02] to-transparent px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={message.name} email={message.email} tone={read ? "muted" : "primary"} />
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{message.name}</h2>
            <a href={`mailto:${message.email}`} dir="ltr" className="mt-0.5 block truncate font-mono text-xs text-primary hover:underline">
              {message.email}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onStep(-1)} disabled={position <= 0} className={cn(adminGhostClass, "h-8 px-2.5 text-xs")} aria-label="الرسالة السابقة">
            السابقة
          </button>
          <span className="px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {position >= 0 ? position + 1 : "–"}/{total}
          </span>
          <button type="button" onClick={() => onStep(1)} disabled={position < 0 || position >= total - 1} className={cn(adminGhostClass, "h-8 px-2.5 text-xs")} aria-label="الرسالة التالية">
            التالية
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone={read ? "neutral" : "info"} dot>
            {read ? "مقروءة" : "غير مقروءة"}
          </Pill>
          <TopicChip topic={message.topic} />
          <span>
            {relativeTime(message.createdAt, nowDate)} · <span className="font-mono tabular-nums">{shortDateTime(message.createdAt)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={statusPending} onClick={onToggleRead} className={adminGhostClass}>
            {read ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
          </button>
          <ConfirmButton onConfirm={onDelete} disabled={statusPending} confirmLabel="تأكيد الحذف">
            حذف
          </ConfirmButton>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
          {sender ? (
            <>
              <span className="text-emerald-300">عميل مسجّل</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                <span className="font-mono tabular-nums text-foreground">{sender.applications}</span> طلب
              </span>
              {sender.banned ? <Pill tone="danger">محظور</Pill> : null}
              <Link href={href(`/admin/users/${sender.userId}`, locale)} className="ms-auto text-primary hover:underline">
                فتح ملف العميل
              </Link>
            </>
          ) : (
            <span className="text-muted-foreground">زائر بدون حساب بهذا البريد.</span>
          )}
        </div>

        <div className="rounded-lg border bg-background/50 p-4">
          <p dir="auto" className="whitespace-pre-wrap break-words text-[15px] leading-7">
            {message.body}
          </p>
        </div>

        {replies.length ? (
          <section>
            <h3 className="text-xs font-medium text-muted-foreground">
              سجل الردود <span className="font-mono tabular-nums">({replies.length})</span>
            </h3>
            <ol className="mt-3 space-y-3 border-s border-border ps-4">
              {replies.map((reply) => (
                <li key={reply.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 size-2.5 rounded-full border-2 border-card bg-emerald-400" />
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span dir="ltr" className="font-mono text-foreground/80">
                      {reply.authorEmail ?? "—"}
                    </span>
                    <span>·</span>
                    <span title={shortDateTime(reply.createdAt)}>{relativeTime(reply.createdAt, nowDate)}</span>
                  </p>
                  <p dir="auto" className="mt-1.5 whitespace-pre-wrap rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-sm leading-relaxed">
                    {reply.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <form
          className="rounded-xl border bg-background/40 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor={`reply-${message.id}`} className="text-sm font-medium">
              الرد بالبريد إلى{" "}
              <span dir="ltr" className="font-mono text-xs text-muted-foreground">
                {message.email}
              </span>
            </label>
            <Counter length={draft.length} max={MAX_REPLY} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cannedReplies.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  onCanned(text);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
                className="max-w-full truncate rounded-md border border-dashed border-input px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {text}
              </button>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            id={`reply-${message.id}`}
            value={draft}
            dir="auto"
            rows={5}
            maxLength={MAX_REPLY + 200}
            disabled={replyPending}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="اكتب ردك هنا، أو اختر رداً جاهزاً من الأعلى…"
            className={cn(adminTextareaClass, "mt-3 min-h-32")}
          />
          {notice ? (
            <div className="mt-3">
              <AdminNotice tone={notice.tone}>
                <p className="font-medium">{notice.title}</p>
                {notice.body ? <p className="mt-0.5 text-xs opacity-80">{notice.body}</p> : null}
              </AdminNotice>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              <kbd className="rounded border border-border px-1 font-mono">Ctrl</kbd> + <kbd className="rounded border border-border px-1 font-mono">Enter</kbd> للإرسال
            </p>
            <div className="flex items-center gap-2">
              {draft ? (
                <button type="button" onClick={() => onDraft("")} disabled={replyPending} className={cn(adminGhostClass, "text-muted-foreground")}>
                  مسح
                </button>
              ) : null}
              <button disabled={replyPending || draft.trim().length < 2 || draft.length > MAX_REPLY} className={adminPrimaryClass}>
                {replyPending ? "جارٍ الإرسال…" : "إرسال الرد"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </article>
  );
}
