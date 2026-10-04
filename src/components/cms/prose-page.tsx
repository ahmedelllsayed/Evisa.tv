import { PageHero, Prose } from "@/components/layout/page-hero";

export function CmsProse({ title, intro, body }: { title: string; intro?: string; body?: string }) {
  const blocks = (body ?? "").split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return (
    <>
      <PageHero title={title}>{intro ? <p>{intro}</p> : null}</PageHero>
      <Prose>
        {blocks.map((block) =>
          block.startsWith("## ") ? <h2 key={block}>{block.slice(3)}</h2> : <p key={block}>{block}</p>,
        )}
      </Prose>
    </>
  );
}
