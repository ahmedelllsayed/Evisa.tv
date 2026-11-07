"use client";

import Image from "next/image";
import { useState } from "react";

/** `MediaImage` for an above-the-fold image: loads eagerly so it does not delay the largest paint. */
export function EagerImage({ src, alt, className, sizes }: { src: string; alt: string; className?: string; sizes: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  if (src.startsWith("/destination-media") || src.includes("?")) {
    return (
      // Uploaded media is a dynamic route with a cache-busting query that next/image rejects.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="eager" fetchPriority="high" className={`absolute inset-0 size-full ${className ?? ""}`} onError={() => setFailed(true)} />
    );
  }
  return <Image src={src} alt={alt} fill loading="eager" fetchPriority="high" className={className} sizes={sizes} onError={() => setFailed(true)} />;
}
