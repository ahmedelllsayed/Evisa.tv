import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApplication, getDocument } from "@/lib/data/applications";
import { getProfileDocumentByPath } from "@/lib/data/profile-vault";
import { readFileForDownload } from "@/lib/storage";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const storagePath = parts.map(decodeURIComponent).join("/");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const owned = await resolveOwnedFile(storagePath, user.id, user.role === "admin");
  if (owned === "missing") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (owned === "forbidden") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const file = await readFileForDownload(storagePath);
  if ("url" in file) return NextResponse.redirect(file.url);
  const fileName = (owned.fileName || "document").replace(/[\r\n"]/g, "").slice(0, 120) || "document";
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": owned.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function resolveOwnedFile(storagePath: string, userId: string, admin: boolean) {
  const { one } = await import("@/lib/data/db");
  const row = await one("select id from documents where storage_path = $1", [storagePath]);
  if (row) {
    const doc = await getDocument(String(row.id));
    if (!doc) return "missing" as const;
    const app = await getApplication(doc.applicationId);
    if (!app || (app.userId !== userId && !admin)) return "forbidden" as const;
    return { fileName: doc.fileName, mimeType: doc.mimeType };
  }
  const answer = await one<{ file_name: string | null; file_mime: string | null; user_id: string }>(
    `select aa.file_name, aa.file_mime, a.user_id
     from application_answers aa
     join applications a on a.id = aa.application_id
     where aa.file_path = $1`,
    [storagePath],
  );
  if (answer) {
    if (String(answer.user_id) !== userId && !admin) return "forbidden" as const;
    return { fileName: answer.file_name || "file", mimeType: answer.file_mime };
  }
  const profileDoc = await getProfileDocumentByPath(storagePath);
  if (!profileDoc) return "missing" as const;
  if (!storagePath.startsWith(`${profileDoc.userId}/`)) return "forbidden" as const;
  if (profileDoc.userId !== userId && !admin) return "forbidden" as const;
  return { fileName: profileDoc.fileName, mimeType: profileDoc.mimeType };
}
