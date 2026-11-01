import { readBrandLogo } from "@/lib/brand-logo";

export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await readBrandLogo();
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.attachment ? "application/octet-stream" : logo.mime,
      "Content-Disposition": logo.attachment ? "attachment" : "inline",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
