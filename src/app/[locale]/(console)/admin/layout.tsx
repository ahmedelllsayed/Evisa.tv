import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { opsCounts } from "@/lib/data/applications";
import type { Layout } from "@/lib/page";

export default async function AdminLayout({ children, params }: Layout) {
  const { locale } = await params;
  await requireAdmin(locale);
  const ops = await opsCounts();
  return (
    <div dir="ltr" className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto flex min-h-screen max-w-site flex-col gap-4 px-4 py-6 lg:flex-row lg:gap-8">
        <AdminNav locale={locale} attention={ops.attention} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
