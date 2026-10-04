"use client";

import { useState, useTransition } from "react";
import { adminDeleteFaq, adminSaveFaq } from "@/app/actions/admin";
import { AdminCard, AdminEmpty, AdminPage, MasterDetail, MasterList, MasterRow, adminDangerClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { Faq } from "@/lib/types";

export function FaqEditor({ locale, faqs }: { locale: string; faqs: Faq[] }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(faqs[0]?.id ?? "new");
  const current = faqs.find((faq) => faq.id === selected);
  const visible = faqs.filter((faq) => `${faq.question} ${faq.category} ${faq.scope}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <AdminPage title="الأسئلة" description="أسئلة الصفحات العامة وصفحات التأشيرة. الحقول بالعربية تظهر كما يكتبها المدير.">
      <MasterDetail
        list={
          <MasterList
            query={query}
            onQuery={setQuery}
            placeholder="بحث"
            action={
              <button type="button" className="h-9 shrink-0 rounded-lg bg-black px-3 text-xs text-white" onClick={() => setSelected("new")}>
                جديد
              </button>
            }
          >
            {visible.length === 0 ? (
              <AdminEmpty>لا توجد أسئلة بعد.</AdminEmpty>
            ) : (
              visible.map((faq) => (
                <MasterRow key={faq.id} active={selected === faq.id} title={faq.question} meta={`${faq.scope} · ${faq.category}`} onClick={() => setSelected(faq.id)} />
              ))
            )}
          </MasterList>
        }
      >
        <AdminCard>
          <form
            key={current?.id ?? "new"}
            className="grid gap-2"
            action={(fd) =>
              start(() =>
                adminSaveFaq(locale, {
                  id: current?.id,
                  scope: String(fd.get("scope")),
                  category: String(fd.get("category")),
                  question: String(fd.get("question")),
                  answer: String(fd.get("answer")),
                  destinationId: current?.destinationId ?? null,
                  sortOrder: current?.sortOrder ?? 99,
                }),
              )
            }
          >
            <input required name="scope" defaultValue={current?.scope ?? ""} placeholder="النطاق: visa أو home" className={adminInputClass} />
            <input required name="category" defaultValue={current?.category ?? ""} placeholder="التصنيف" className={adminInputClass} />
            <input required name="question" defaultValue={current?.question ?? ""} placeholder="السؤال" className={adminInputClass} />
            <textarea required name="answer" defaultValue={current?.answer ?? ""} placeholder="الإجابة" className={adminTextareaClass} />
            <button disabled={pending} className={adminPrimaryClass}>
              {current ? "حفظ" : "إضافة سؤال"}
            </button>
          </form>
          {current && (
            <button type="button" disabled={pending} className={`${adminDangerClass} mt-3`} onClick={() => start(() => adminDeleteFaq(locale, current.id))}>
              حذف
            </button>
          )}
        </AdminCard>
      </MasterDetail>
    </AdminPage>
  );
}
