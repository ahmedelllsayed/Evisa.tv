export type IcsEntry = {
  uid: string;
  /** YYYY-MM-DD; written as an all-day event that ends the next day (DTEND is exclusive). */
  date: string;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
};

const compact = (day: string) => day.replaceAll("-", "");

function nextDay(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps lines at 75 octets; continuation lines start with a space. */
function fold(line: string) {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = out.length ? 74 : 75;
    if (size + bytes > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(entries: IcsEntry[], stamp: Date) {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//evisa.tv//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const entry of entries) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${entry.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(entry.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(entry.date))}`,
      `SUMMARY:${escapeIcsText(entry.summary)}`,
    );
    if (entry.location) lines.push(`LOCATION:${escapeIcsText(entry.location)}`);
    if (entry.description) lines.push(`DESCRIPTION:${escapeIcsText(entry.description)}`);
    if (entry.url) lines.push(`URL:${entry.url}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadIcs(fileName: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
