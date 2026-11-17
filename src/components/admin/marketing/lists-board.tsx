"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteList, adminImportContacts, adminRemoveContact, adminSaveList } from "@/app/actions/marketing";
import { AdminError, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";

export type ListRow = { id: string; name: string; contacts: number; emails: number; phones: number };
export type ContactRow = { id: string; email: string | null; phone: string | null; name: string | null; unsubscribed: boolean };

export function ListsBoard({
  locale,
  lists,
  selected,
  contacts,
  canEdit,
}: {
  locale: string;
  lists: ListRow[];
  selected: string | null;
  contacts: ContactRow[];
  canEdit: boolean;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const current = lists.find((list) => list.id === selected) ?? null;

  function go(id: string | null) {
    router.push(href(`/admin/marketing/segments${id ? `?list=${id}` : ""}#lists`, locale), { scroll: false });
  }

  return (
    <div id="lists" className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            start(async () => {
              const result = await adminSaveList(locale, { name });
              if (!result.ok) setError(result.error);
              else {
                setName("");
                go(result.id);
                router.refresh();
              }
            });
          }}
        >
          <input value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} placeholder="اسم قائمة جديدة" className={cn(adminInputClass, "mt-0")} />
          <button type="submit" className={adminGhostClass} disabled={!canEdit || pending || !name.trim()}>إضافة</button>
        </form>
        {lists.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">لا توجد قوائم.</p> : null}
        {lists.map((list) => (
          <button key={list.id} type="button" onClick={() => go(list.id)} className={cn("block w-full rounded-lg border p-3 text-start", list.id === selected && "border-primary")}>
            <p className="font-medium">{list.name}</p>
            <p className="text-xs text-muted-foreground">{list.contacts} جهة · بريد {list.emails} · هاتف {list.phones}</p>
          </button>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4">
        {error ? <AdminError>{error}</AdminError> : null}
        {notice ? <p className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{notice}</p> : null}
        {!current ? (
          <p className="text-sm text-muted-foreground">اختر قائمة أو أنشئ واحدة، ثم الصق الإيميلات والأرقام.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{current.name}</h3>
              <button
                type="button"
                className={adminDangerClass}
                disabled={!canEdit || pending}
                onClick={() => {
                  if (!window.confirm(`حذف قائمة «${current.name}»؟ الجهات التي ليست في قائمة أخرى تُحذف معها.`)) return;
                  start(async () => {
                    const result = await adminDeleteList(locale, current.id);
                    if (!result.ok) setError(result.error);
                    else {
                      go(null);
                      router.refresh();
                    }
                  });
                }}
              >
                حذف القائمة
              </button>
            </div>
            <p className="text-xs text-muted-foreground">سطر لكل جهة: بريد أو هاتف أو الاثنان، ثم الاسم. مثل: mona@example.com, 01012345678, منى. الأرقام المصرية تُحوَّل للصيغة الدولية.</p>
            <textarea value={text} disabled={!canEdit} onChange={(event) => setText(event.target.value)} rows={5} dir="auto" className={adminTextareaClass} placeholder={"mona@example.com, 01012345678, منى\nAli <ali@example.com>\n+971501234567, Sara"} />
            <div className="flex flex-wrap gap-2">
              <label className={cn(adminGhostClass, "cursor-pointer")}>
                ملف CSV
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  disabled={!canEdit}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) setText(await file.text());
                  }}
                />
              </label>
              <button
                type="button"
                className={adminPrimaryClass}
                disabled={!canEdit || pending || !text.trim()}
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  start(async () => {
                    const result = await adminImportContacts(locale, current.id, text);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setText("");
                    setNotice(
                      [
                        `أُضيف ${result.added}`,
                        result.linked ? `موجود ربطته بالقائمة ${result.linked}` : "",
                        result.existingAccounts ? `حسابات في الموقع ${result.existingAccounts}` : "",
                        result.invalid ? `غير صالح ${result.invalid}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · "),
                    );
                    router.refresh();
                  });
                }}
              >
                حفظ في القائمة
              </button>
            </div>
            {contacts.length ? (
              <ul className="divide-y text-sm">
                {contacts.map((contact) => (
                  <li key={contact.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{contact.name || contact.email || contact.phone}</span>
                      <span className="ms-2 text-muted-foreground" dir="ltr">{[contact.email, contact.phone].filter(Boolean).join(" · ")}</span>
                      {contact.unsubscribed ? <span className="ms-2 text-xs text-amber-300">ألغى الاشتراك</span> : null}
                    </span>
                    <button
                      type="button"
                      className={cn(adminDangerClass, "h-8 px-3 text-xs")}
                      disabled={!canEdit || pending}
                      onClick={() =>
                        start(async () => {
                          await adminRemoveContact(locale, current.id, contact.id);
                          router.refresh();
                        })
                      }
                    >
                      إزالة
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {current.contacts > contacts.length ? <p className="text-xs text-muted-foreground">يظهر آخر {contacts.length} من {current.contacts}.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}
