import { say } from "@/lib/say";
import { cn } from "@/lib/utils";

export function Stars({
  rating,
  locale,
  className,
  size = "size-4",
  tone = "dark",
}: {
  rating: number;
  locale: string;
  className?: string;
  size?: string;
  tone?: "dark" | "light";
}) {
  const on = tone === "light" ? "fill-[#f5b400]" : "fill-[#ffd873]";
  const off = tone === "light" ? "fill-[#e3e5f2]" : "fill-white/15";
  return (
    <span role="img" className={cn("inline-flex gap-0.5", className)} aria-label={say(locale, `${rating} out of 5 stars`, `${rating} من 5 نجوم`)}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden className={cn(size, i < rating ? on : off)}>
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </span>
  );
}
