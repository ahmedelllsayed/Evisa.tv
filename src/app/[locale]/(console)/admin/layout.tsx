import { Cairo, Lato } from "next/font/google";
import { AdminShell } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth";
import { opsCounts } from "@/lib/data/applications";
import type { Layout } from "@/lib/page";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-admin-cairo",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-admin-lato",
  display: "swap",
});

export default async function AdminLayout({ children, params }: Layout) {
  const { locale } = await params;
  const user = await requireAdmin(locale);
  const ops = await opsCounts();
  return (
    <div dir="ltr" className={`${cairo.variable} ${lato.variable} admin-shell surface-ar min-h-svh`}>
      <AdminShell locale={locale} attention={ops.attention} email={user.email}>
        {children}
      </AdminShell>
    </div>
  );
}
