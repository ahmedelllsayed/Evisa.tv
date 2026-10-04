const closed = new Set(["approved", "rejected", "cancelled", "refunded"]);

export function isPastGuarantee(status: string, guaranteedAt: string | null) {
  if (!guaranteedAt || closed.has(status)) return false;
  return new Date(guaranteedAt).getTime() < Date.now();
}

export type DocGap = {
  travelerId: string;
  travelerName: string;
  kind: string;
  reason: "missing" | "rejected";
  rejectReason: string | null;
};

export function documentGaps(
  required: string[],
  travelers: { id: string; firstName: string; lastName: string }[],
  documents: { travelerId: string | null; kind: string; status: string; rejectReason?: string | null }[],
): DocGap[] {
  const kinds = required.length ? required : ["passport"];
  const gaps: DocGap[] = [];
  for (const traveler of travelers) {
    for (const kind of kinds) {
      const doc = documents.find((item) => item.travelerId === traveler.id && item.kind === kind);
      const name = `${traveler.firstName} ${traveler.lastName}`.trim();
      if (!doc) gaps.push({ travelerId: traveler.id, travelerName: name, kind, reason: "missing", rejectReason: null });
      else if (doc.status === "rejected") {
        gaps.push({
          travelerId: traveler.id,
          travelerName: name,
          kind,
          reason: "rejected",
          rejectReason: doc.rejectReason ?? null,
        });
      }
    }
  }
  return gaps;
}
