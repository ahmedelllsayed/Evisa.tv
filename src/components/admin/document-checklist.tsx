"use client";

import { useState } from "react";
import { documentLabels } from "@/data/seed/content";
import { adminGhostClass, adminInputClass } from "@/components/admin/chrome";
import { customDocumentParts, encodeCustomDocument } from "@/lib/documents";

const knownKinds = Object.keys(documentLabels);

function title(kind: string) {
  return documentLabels[kind]?.labelAr ?? customDocumentParts(kind)?.ar ?? kind;
}

export function DocumentChecklist({
  name,
  selected,
  onChange,
}: {
  name: string;
  selected: string[];
  onChange?: (next: string[]) => void;
}) {
  const [extras, setExtras] = useState(() => selected.filter((kind) => !knownKinds.includes(kind)));
  const [english, setEnglish] = useState("");
  const [arabic, setArabic] = useState("");
  const [message, setMessage] = useState("");
  const custom = onChange ? selected.filter((kind) => !knownKinds.includes(kind)) : extras;

  function toggle(kind: string, checked: boolean) {
    if (!onChange) return;
    const next = checked ? [...selected, kind] : selected.filter((item) => item !== kind);
    onChange([...new Set(next)]);
  }

  function add() {
    const kind = encodeCustomDocument(english, arabic);
    if (!kind) {
      setMessage("اكتب اسم المستند بالعربية أو الإنجليزية.");
      return;
    }
    const current = onChange ? selected : [...selected.filter((item) => knownKinds.includes(item)), ...extras];
    if (current.includes(kind)) {
      setMessage("هذا المستند مضاف بالفعل.");
      return;
    }
    setMessage("");
    setEnglish("");
    setArabic("");
    if (onChange) onChange([...current, kind]);
    else setExtras((items) => [...items, kind]);
  }

  function remove(kind: string) {
    if (onChange) onChange(selected.filter((item) => item !== kind));
    else setExtras((items) => items.filter((item) => item !== kind));
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {knownKinds.map((kind) => (
          <label key={kind} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={kind}
              defaultChecked={onChange ? undefined : selected.includes(kind)}
              checked={onChange ? selected.includes(kind) : undefined}
              onChange={onChange ? (event) => toggle(kind, event.target.checked) : undefined}
            />
            {title(kind)}
          </label>
        ))}
        {custom.map((kind) => (
          <label key={kind} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
            <input
              type="checkbox"
              name={name}
              value={kind}
              defaultChecked={onChange ? undefined : true}
              checked={onChange ? selected.includes(kind) : undefined}
              onChange={onChange ? (event) => toggle(kind, event.target.checked) : (event) => { if (!event.target.checked) remove(kind); }}
            />
            <span className="min-w-0 flex-1">
              {title(kind)}
              {customDocumentParts(kind)?.en && customDocumentParts(kind)?.en !== title(kind) ? (
                <span className="mt-0.5 block text-xs text-muted-ink">{customDocumentParts(kind)?.en}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          اسم المستند بالعربية
          <input value={arabic} onChange={(event) => setArabic(event.target.value)} className={adminInputClass} />
        </label>
        <label className="text-sm">
          الاسم بالإنجليزية
          <input value={english} onChange={(event) => setEnglish(event.target.value)} className={adminInputClass} />
        </label>
        <button type="button" className={adminGhostClass} onClick={add}>
          إضافة مستند
        </button>
      </div>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
