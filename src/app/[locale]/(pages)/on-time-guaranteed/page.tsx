import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Logo } from "@/components/brand/logo";
import { OnTimeCircles } from "@/components/marketing/on-time-circles";
import { getSiteSettings } from "@/lib/data/settings";
import { linesOf } from "@/lib/cms/registry";
import { requirePageContent } from "@/lib/data/pages";


function Asterisk() {
  return (
    <div className="absolute -right-1 top-0 lg:-right-8 lg:-top-6" aria-hidden>
      <div className="relative">
        <div className="absolute left-0 top-0 h-6 w-1.5 rotate-[60deg] bg-white lg:h-16 lg:w-3.5" />
        <div className="absolute top-0 h-6 w-1.5 -rotate-[60deg] bg-white lg:h-16 lg:w-3.5" />
        <div className="absolute left-0 top-0 h-6 w-1.5 bg-white lg:h-16 lg:w-3.5" />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/on-time-guaranteed", { en: "On Time Guaranteed", ar: "في الموعد" });
}

export default async function OnTimePage() {
  const [content, settings] = await Promise.all([requirePageContent("on-time-guaranteed"), getSiteSettings()]);
  const bands = [
    { title: content.band1Title, body: content.band1Body },
    { title: content.band2Title, body: content.band2Body },
    { title: content.band3Title, body: content.band3Body },
  ];
  const missed = linesOf(content.cases).map((parts) => [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""]);
  return (
    <div className="bg-[#fbf0e1]">
      <OnTimeCircles />
      <section className="relative z-10 overflow-x-hidden bg-blue-600 px-8">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-end pb-12 pt-40 lg:pb-20">
          <div className="mb-8 flex items-center gap-1.5 text-white">
            <Logo name={settings.name} src={settings.logoUrl} className="text-white" />
            <span className="text-[8px] leading-[1.05] font-bold tracking-[0.12em] uppercase">
              Visas on
              <br />
              time
            </span>
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-8xl lg:text-9xl">{content.hero1}</h1>
          <div className="relative pr-4">
            <h1 className="text-5xl font-black leading-tight tracking-tight text-white md:text-8xl lg:-mt-3 lg:text-9xl">
              {content.hero2}
            </h1>
            <Asterisk />
          </div>
          <p className="mt-8 max-w-[718px] text-center text-2xl leading-8 font-medium text-white">{content.heroBody}</p>
        </div>
      </section>

      {bands.map((band) => (
        <section key={band.title} data-ontime-band className="relative z-10 bg-transparent px-8">
          <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center py-60">
            <h2 className="text-center text-3xl leading-tight font-black tracking-tight text-blue-600 md:text-5xl lg:text-[5.5rem]">
              {band.title}
            </h2>
            <h3 className="mt-8 text-center text-xl font-semibold text-blue-600 lg:mt-14 lg:text-2xl">{band.body}</h3>
          </div>
        </section>
      ))}

      <section data-ontime-band className="relative z-10 bg-transparent px-8">
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center py-24">
          <h2 className="text-center text-4xl leading-tight font-black tracking-tight text-blue-600 lg:text-[5.5rem]">
            {content.missedTitle}
          </h2>
          <h3 className="mt-8 text-center text-xl font-semibold text-blue-600 lg:mt-14 lg:text-2xl">{content.missed1}</h3>
          <h3 className="mt-6 text-center text-xl font-semibold text-blue-600 lg:text-2xl">{content.missed2}</h3>
        </div>
        <div className="mx-auto flex max-w-md flex-col pb-24">
          {missed.map(([name, late, reason], i) => (
            <div
              key={name}
              className={
                i === 0
                  ? "relative z-30 mt-20 flex h-24 flex-col justify-center rounded-2xl bg-blue-500 p-3 text-white"
                  : i === 1
                    ? "relative z-20 -mt-20 flex h-24 scale-90 flex-col justify-center rounded-2xl bg-blue-400 p-3 text-white"
                    : "relative z-10 -mt-20 flex h-24 scale-[0.8] flex-col justify-center rounded-2xl bg-blue-300 p-3 text-white"
              }
            >
              <p className="text-sm font-semibold tracking-wide uppercase">{name}</p>
              <p className="text-sm">{late}</p>
              <p className="text-xs text-white/80">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-ontime-band className="relative z-10 bg-blue-600 px-8 py-24 text-center text-white">
        <h2 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl">On Time</h2>
        <p className="-mt-1 text-4xl font-black tracking-tight md:text-5xl lg:-mt-3 lg:text-7xl">Guaranteed!</p>
      </section>
    </div>
  );
}
