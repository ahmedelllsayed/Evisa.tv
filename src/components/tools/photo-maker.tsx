"use client";

import { useRef, useState } from "react";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

function fileIssue(file: File) {
  if (!allowed.has(file.type)) return "Use a JPEG, PNG, or WebP photo.";
  if (file.size > maxBytes) return "Photo must be under 8 MB.";
  if (file.size < 20_000) return "Photo file is too small.";
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

export function PhotoMaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<File | null>(null);
  const [ready, setReady] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);

  function onFile(file: File) {
    const problem = fileIssue(file);
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
      setIssue("We couldn't find a face in this photo.");
      return;
    }
    if (faces !== null && faces !== 1) {
      setIssue("Use a photo with one face only.");
      return;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.92);
    a.download = "visa-photo.jpg";
    a.click();
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 text-center">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong p-8">
        <span className="font-medium">Upload a photo</span>
        <span className="mt-1 text-sm text-muted-ink">We’ll crop it to a square visa-photo frame.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {issue && <p className="mt-4 text-sm text-red-600">{issue}</p>}
      <canvas ref={canvasRef} className="mx-auto mt-6 size-56 rounded-xl bg-surface" />
      <button
        type="button"
        disabled={!ready}
        onClick={() => void download()}
        className="mt-4 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        Download photo
      </button>
    </div>
  );
}
