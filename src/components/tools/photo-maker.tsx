"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadDocumentAction } from "@/app/actions/apply";
import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import { say } from "@/lib/say";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

const presets = [
  { id: "35x45", width: 413, height: 531, en: "35 × 45 mm", ar: "35 × 45 مم" },
  { id: "2x2", width: 600, height: 600, en: "2 × 2 in", ar: "2 × 2 بوصة" },
  { id: "5x5", width: 591, height: 591, en: "5 × 5 cm", ar: "5 × 5 سم" },
] as const;

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

function paint(image: HTMLImageElement, width: number, height: number, zoom: number, panX: number, panY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const drawnWidth = image.width * scale;
  const drawnHeight = image.height * scale;
  ctx.drawImage(image, (width - drawnWidth) / 2 + panX * width, (height - drawnHeight) / 2 + panY * height, drawnWidth, drawnHeight);
  return canvas;
}

export function PhotoMaker({ locale, targets = [] }: { locale: string; targets?: PhotoTarget[] }) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<File | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [presetId, setPresetId] = useState<(typeof presets)[number]["id"]>("35x45");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [targetKey, setTargetKey] = useState(targets[0] ? `${targets[0].applicationId}:${targets[0].travelerId}` : "");
  const selected = targets.find((item) => `${item.applicationId}:${item.travelerId}` === targetKey) ?? null;
  const preset = presets.find((item) => item.id === presetId) ?? presets[0];

  useEffect(() => {
    const image = imageRef.current;
    const preview = previewRef.current;
    if (!image || !preview) return;
    const painted = paint(image, preset.width, preset.height, zoom, pan.x, pan.y);
    if (!painted) return;
    preview.width = preset.width;
    preview.height = preset.height;
    preview.getContext("2d")?.drawImage(painted, 0, 0);
  }, [pan, preset.height, preset.width, ready, zoom]);

  function onFile(file: File) {
    const problem = fileIssue(file, locale);
    fileRef.current = problem ? null : file;
    setIssue(problem);
    setReady(false);
    setNote(null);
    if (problem) return;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setReady(true);
      URL.revokeObjectURL(image.src);
    };
    image.src = URL.createObjectURL(file);
  }

  async function facesOk() {
    const file = fileRef.current;
    if (!file) return false;
    const faces = await faceCount(file);
    if (faces === 0) {
      setIssue(t(locale, "photo.face"));
      return false;
    }
    if (faces !== null && faces !== 1) {
      setIssue(t(locale, "photo.oneFace"));
      return false;
    }
    return true;
  }

  async function output() {
    const image = imageRef.current;
    if (!image || !(await facesOk())) return null;
    return paint(image, preset.width, preset.height, zoom, pan.x, pan.y);
  }

  async function download() {
    const canvas = await output();
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.92);
    link.download = `visa-photo-${preset.id}.jpg`;
    track("photo_tool_use", { action: "download" });
    link.click();
  }

  async function attach() {
    const canvas = await output();
    if (!canvas || !selected) return;
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
    <div className="mx-auto max-w-md px-4 pb-8 text-center">
      <p className="mb-4 text-xs leading-relaxed text-muted-ink">
        {say(locale, "The photo stays in your browser. Nothing is uploaded unless you attach it to an open application.", "تبقى الصورة في متصفحك. لا يُرفع شيء إلا إذا أرفقتها بطلب مفتوح.")}
      </p>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {presets.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPresetId(item.id)}
            className={item.id === preset.id ? "rounded-full bg-brand px-3 py-1 text-xs text-white" : "rounded-full bg-surface px-3 py-1 text-xs"}
          >
            {say(locale, item.en, item.ar)}
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-8">
        <span className="font-medium">{t(locale, "photo.upload")}</span>
        <span className="mt-1 text-sm text-muted-ink">{t(locale, "photo.crop")}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
      </label>
      {issue && <p className="mt-4 text-sm text-red-600">{issue}</p>}
      <canvas
        ref={previewRef}
        className="mx-auto mt-6 max-h-72 max-w-full rounded-xl bg-surface"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          setPan({ x: start.panX + (event.clientX - start.x) / 300, y: start.panY + (event.clientY - start.y) / 300 });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      />
      {ready ? (
        <label className="mt-4 block text-xs text-muted-ink">
          {say(locale, "Zoom", "التقريب")}
          <input type="range" min="1" max="2.4" step="0.02" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-1 w-full" />
        </label>
      ) : null}
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
        <button type="button" disabled={!ready} onClick={() => void download()} className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40">
          {t(locale, "photo.download")}
        </button>
        <button type="button" disabled={!ready || !selected || pending} onClick={() => start(() => void attach())} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium disabled:opacity-40">
          {t(locale, "photo.attach")}
        </button>
      </div>
    </div>
  );
}
