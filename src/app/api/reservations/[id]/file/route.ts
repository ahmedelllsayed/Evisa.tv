import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTravelOrder } from "@/lib/reservations/orders";
import { readTravelToken } from "@/lib/reservations/token";
import { readStoredBytes } from "@/lib/storage";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const user = await getCurrentUser();
  const allowed = user?.role === "admin" || readTravelToken(url.searchParams.get("token") ?? "") === id;
  if (!allowed) return NextResponse.json({ ok: false }, { status: 401 });
  const order = await getTravelOrder(id);
  const kind = url.searchParams.get("kind");
  const file = order?.files.find((item) => item.kind === kind);
  if (!file) return NextResponse.json({ ok: false }, { status: 404 });
  const bytes = await readStoredBytes(file.path);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
