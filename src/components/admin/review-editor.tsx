"use client";

import { useState, useTransition } from "react";
import { adminDeleteReview, adminSaveReview } from "@/app/actions/admin";
import { AdminCard, AdminEmpty, AdminPage, MasterDetail, MasterList, MasterRow, adminDangerClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import type { Review } from "@/lib/types";

export function ReviewEditor({ locale, reviews }: { locale: string; reviews: Review[] }) {
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(reviews[0]?.id ?? "new");
  const current = reviews.find((review) => review.id === selected);
  const visible = reviews.filter((review) => `${review.author} ${review.product ?? ""} ${review.body}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <AdminPage title="التقييمات" description="آراء المسافرين التي تظهر في جدار الحب وصفحات التأشيرة.">
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
              <AdminEmpty>لا توجد تقييمات بعد.</AdminEmpty>
            ) : (
              visible.map((review) => (
                <MasterRow key={review.id} active={selected === review.id} title={review.author} meta={review.product || review.scope} onClick={() => setSelected(review.id)} />
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
                adminSaveReview(locale, {
                  id: current?.id,
                  scope: String(fd.get("scope") || "wall"),
                  author: String(fd.get("author")),
                  location: String(fd.get("location") || "") || null,
                  title: String(fd.get("title") || "") || null,
                  titleAr: String(fd.get("titleAr") || "") || null,
                  body: String(fd.get("body")),
                  bodyAr: String(fd.get("bodyAr") || "") || null,
                  rating: Number(fd.get("rating") || 5),
                  product: String(fd.get("product") || "") || null,
                  destinationId: current?.destinationId ?? null,
                }),
              )
            }
          >
            <input required name="author" defaultValue={current?.author ?? ""} placeholder="الاسم" className={adminInputClass} />
            <input name="location" defaultValue={current?.location ?? ""} placeholder="المدينة" className={adminInputClass} />
            <input name="title" defaultValue={current?.title ?? ""} placeholder="العنوان" className={adminInputClass} />
            <input name="titleAr" defaultValue={current?.titleAr ?? ""} placeholder="العنوان بالعربية" dir="rtl" className={adminInputClass} />
            <input name="product" defaultValue={current?.product ?? ""} placeholder="المنتج، مثل تأشيرة المغرب" className={adminInputClass} />
            <input name="scope" defaultValue={current?.scope ?? "wall"} placeholder="النطاق" className={adminInputClass} />
            <input name="rating" type="number" min={1} max={5} defaultValue={current?.rating ?? 5} className={adminInputClass} />
            <textarea required name="body" defaultValue={current?.body ?? ""} placeholder="نص التقييم" className={adminTextareaClass} />
            <textarea name="bodyAr" defaultValue={current?.bodyAr ?? ""} placeholder="النص بالعربية" dir="rtl" className={adminTextareaClass} />
            <button disabled={pending} className={adminPrimaryClass}>
              {current ? "حفظ" : "إضافة تقييم"}
            </button>
          </form>
          {current && (
            <button type="button" disabled={pending} className={`${adminDangerClass} mt-3`} onClick={() => start(() => adminDeleteReview(locale, current.id))}>
              حذف
            </button>
          )}
        </AdminCard>
      </MasterDetail>
    </AdminPage>
  );
}
