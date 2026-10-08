"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocumentAction } from "@/app/actions/apply";
import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

function fileIssue(file: File, locale: string) {
  if (!allowed.has(file.type)) return t(locale, "photo.badType");
  if (file.size > maxBytes) return t(locale, "photo.tooBig");
  if (file.size < 20_000) return t(locale, "photo.tooSmall");
  return null;
}

type FaceBox = { boundingBox?: unknown };

async function faceCount(file: File) {
  const Detector = (window as unknown as { FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => { detect: (source: ImageBitmap) => Promise<FaceBox[]> } }).FaceDetector;
  if (!Detector) return null;
  const bitmap = await createImageBitmap(file);
  try {
    const faces = await new Detector({ fastMode: true, maxDetectedFaces: 5 }).detect(bitmap);
    return faces.length;
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

type PhotoTarget = {
  applicationId: string;
  travelerId: string;
  label: string;
  spec: string | null;
};

export function PhotoMaker({ locale, targets = [] }: { locale: string; targets?: PhotoTarget[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<File | null>(null);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [targetKey, setTargetKey] = useState(targets[0] ? `${targets[0].applicationId}:${targets[0].travelerId}` : "");
  const selected = targets.find((item) => `${item.applicationId}:${item.travelerId}` === targetKey) ?? null;

  function onFile(file: File) {
    const problem = fileIssue(file, locale);
    fileRef.current = problem ? null : file;
    setIssue(problem);
    setReady(false);
    if (problem) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const size = 600;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      setReady(true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  async function download() {
    const canvas = canvasRef.current;
    const file = fileRef.current;
    if (!canvas || !file) return;
    const faces = await faceCount(file);
    if (faces === 0) {
      setIssue(t(locale, "photo.face"));
      return;
    }
    if (faces !== null && faces !== 1) {
      setIssue(t(locale, "photo.oneFace"));
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.download = "visa-photo.jpg";
    track("photo_tool_use", { action: "download" });
    a.click();
  }

  async function attach() {
    const canvas = canvasRef.current;
    const file = fileRef.current;
    if (!canvas || !file || !selected) return;
    const faces = await faceCount(file);
    if (faces === 0) {
      setIssue(t(locale, "photo.face"));
      return;
    }
    if (faces !== null && faces !== 1) {
      setIssue(t(locale, "photo.oneFace"));
      return;
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((value) => resolve(value), "image/jpeg", 0.92));
    if (!blob) return;
    const photo = new File([blob], "visa-photo.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.set("locale", locale);
    form.set("applicationId", selected.applicationId);
    form.set("travelerId", selected.travelerId);
    form.set("kind", "photo");
    form.set("file", photo);
    const result = await uploadDocumentAction(form);
    setNote(result.ok ? t(locale, "photo.attached") : result.error);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 text-center">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-8">
        <span className="font-medium">{t(locale, "photo.upload")}</span>
        <span className="mt-1 text-sm text-muted-ink">{t(locale, "photo.crop")}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {issue && <p className="mt-4 text-sm text-red-600">{issue}</p>}
      <canvas ref={canvasRef} className="mx-auto mt-6 size-56 rounded-xl bg-surface" />
      <p className="mt-3 text-sm text-muted-ink">{selected?.spec || t(locale, "photo.spec")}</p>
      {targets.length > 0 ? (
        <label className="mt-4 block text-start text-sm">
          {t(locale, "photo.attach")}
          <select value={targetKey} onChange={(event) => setTargetKey(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-line px-3">
            {targets.map((item) => (
              <option key={`${item.applicationId}:${item.travelerId}`} value={`${item.applicationId}:${item.travelerId}`}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-4 text-sm text-muted-ink">{t(locale, "photo.none")}</p>
      )}
      {note && <p className="mt-3 text-sm">{note}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => void download()}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {t(locale, "photo.download")}
        </button>
        <button
          type="button"
          disabled={!ready || !selected || pending}
          onClick={() => start(() => void attach())}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {t(locale, "photo.attach")}
        </button>
      </div>
    </div>
  );
}
