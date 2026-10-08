"use client";

import Image from "next/image";
import { useState } from "react";

export function MediaImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  if (src.startsWith("/destination-media") || src.includes("?")) {
    return (
      // Uploaded media is a dynamic route with a cache-busting query. next/image rejects that and crashes the page.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        className={fill ? `absolute inset-0 size-full ${className ?? ""}` : className}
        onError={() => setFailed(true)}
      />
    );
  }
  if (fill) {
    return <Image src={src} alt={alt} fill className={className} sizes={sizes ?? "400px"} />;
  }
  return <Image src={src} alt={alt} width={width ?? 24} height={height ?? 24} className={className} />;
}
