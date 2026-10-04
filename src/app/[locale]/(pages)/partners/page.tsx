import { linesOf } from "@/lib/cms/registry";
import { requirePageContent } from "@/lib/data/pages";

export const metadata = { title: "Partners" };

export default async function PartnersPage() {
  const content = await requirePageContent("partners");
  const groups = linesOf(content.groups).map((parts) => ({
    title: parts[0] ?? "",
    brands: (parts[1] ?? "").split(",").map((name) => name.trim()).filter(Boolean),
  }));
  const [first, ...rest] = content.title.split("\n");
  return (
    <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
      <div className="grid items-end gap-6 md:grid-cols-[1.2fr_1fr]">
        <h1 className="font-serif text-5xl leading-[0.95] font-medium tracking-tight md:text-7xl">
          {first}
          {rest.length > 0 && (
            <>
              <br />
              {rest.join(" ")}
            </>
          )}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-ink md:pb-2">{content.intro}</p>
      </div>
      <div className="mt-12 space-y-10">
        {groups.map((group) => (
          <section key={group.title} className="border-t border-line pt-8">
            <div className="grid items-start gap-6 md:grid-cols-[180px_1fr]">
              <h2 className="font-serif text-2xl">{group.title}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.brands.map((name) => (
                  <li key={name} className="flex h-28 flex-col items-center justify-center rounded-2xl border border-line text-center">
                    <p className="px-3 font-semibold">{name}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
