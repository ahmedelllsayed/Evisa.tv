import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/data/db";

export async function GET(_request: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { paymentId } = await ctx.params;
  const row = await sql<{
    receipt_no: string;
    amount: string;
    currency: string;
    reference: string;
    processed_at: string | null;
  }>(
    `select r.receipt_no, p.amount::text, p.currency, a.reference, p.processed_at::text
     from payment_receipts r
     join payments p on p.id = r.payment_id
     join applications a on a.id = p.application_id
     where r.payment_id = $1 and a.user_id = $2`,
    [paymentId, user.id],
  );
  const receipt = row[0];
  if (!receipt) return NextResponse.json({ error: "not found" }, { status: 404 });
  const lines = [
    "Evisa receipt",
    receipt.receipt_no,
    receipt.reference,
    `${receipt.amount} ${receipt.currency}`,
    receipt.processed_at ?? "",
  ];
  return new NextResponse(simplePdf(lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.receipt_no}.pdf"`,
    },
  });
}

function simplePdf(lines: string[]) {
  const text = lines.map((line) => line.replace(/[()\\]/g, "")).join(") Tj T* (");
  const stream = `BT /F1 12 Tf 50 780 Td (${text}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object + "\n";
  }
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return body;
}
