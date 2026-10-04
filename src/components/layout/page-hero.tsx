export function PageHero({
  kicker,
  title,
  children,
  align = "center",
  large = false,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
  align?: "center" | "left";
  large?: boolean;
}) {
  return (
    <header className={`mx-auto px-4 pt-12 pb-8 ${large ? "max-w-5xl" : "max-w-3xl"} ${align === "left" ? "text-left" : "text-center"}`}>
      {kicker && <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">{kicker}</p>}
      <h1 className={`mt-2 leading-tight tracking-tight ${large ? "max-w-2xl font-sans text-5xl font-bold" : "font-display text-4xl font-semibold"}`}>{title}</h1>
      {children && <div className="mt-4 text-base leading-relaxed text-body">{children}</div>}
    </header>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 pb-16 text-body [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">{children}</div>;
}
