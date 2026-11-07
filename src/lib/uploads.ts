const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "heic" || brand === "heix" || brand === "mif1" || brand === "msf1") return "image/heic";
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/** Checks size and real file bytes. HEIC is refused here; the browser converts it before upload. */
export async function acceptedUpload(file: File): Promise<{ ok: true; file: File } | { ok: false; error: "err.fileSize" | "err.fileType" | "err.fileHeic" }> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "err.fileSize" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(bytes);
  if (mime === "image/heic") return { ok: false, error: "err.fileHeic" };
  if (!mime || !ALLOWED_TYPES.includes(mime)) return { ok: false, error: "err.fileType" };
  return { ok: true, file: new File([bytes], file.name, { type: mime }) };
}
