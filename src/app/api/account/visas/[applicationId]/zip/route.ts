import { NextResponse } from "next/server";
import { zipSync } from "fflate";
import { getCurrentUser } from "@/lib/auth";
import { getApplication, listDocuments } from "@/lib/data/applications";
import { readStoredBytes } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const app = await getApplication(applicationId);
  if (!app || app.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const files = (await listDocuments(applicationId)).filter((document) => document.kind === "issued_visa");
  if (!files.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  const archive: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const file of files) {
    const bytes = await readStoredBytes(file.storagePath);
    let name = file.fileName.replace(/[\\/]/g, "_").slice(0, 80) || "visa";
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      let n = 2;
      while (used.has(`${stem}-${n}${ext}`)) n += 1;
      name = `${stem}-${n}${ext}`;
    }
    used.add(name);
    archive[name] = new Uint8Array(bytes);
  }
  const zipped = zipSync(archive);
  return new NextResponse(Buffer.from(zipped), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${app.reference}-visas.zip"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
