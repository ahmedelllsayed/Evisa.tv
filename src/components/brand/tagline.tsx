import { cn } from "@/lib/utils";

/** The slogan saved in site settings. A line break becomes the quieter second line. */
export function BrandTagline({
  tagline,
  className,
  lineClassName,
}: {
  tagline: string;
  className?: string;
  lineClassName?: string;
}) {
  const lines = tagline
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  return (
    <span className={className}>
      {lines[0]}
      {lines.slice(1).map((line, index) => (
        <span key={`${index}-${line}`} className={cn("block font-medium", lineClassName)}>
          {line}
        </span>
      ))}
    </span>
  );
}
