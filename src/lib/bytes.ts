export function asBytes(value: unknown): Buffer | null {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value.length ? value : null;
  if (value instanceof Uint8Array) return value.byteLength ? Buffer.from(value) : null;
  if (typeof value === "string") {
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    if (hex && /^[0-9a-f]+$/i.test(hex) && hex.length % 2 === 0) return Buffer.from(hex, "hex");
  }
  return null;
}
