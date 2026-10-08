import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PhotoMaker } from "@/components/tools/photo-maker";
import { documentLabels } from "@/data/seed/content";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsForUser, listTravelers } from "@/lib/data/applications";
import { requirePageContent } from "@/lib/data/pages";


const steps = [
  ["Upload Your Photo", "Pick a photo from your phone or computer (JPEG, JPG, or PNG). A fresh selfie works too."],
  ["Adjust & Resize", "The tool crops and sizes the portrait so it matches common visa photo guidelines."],
  ["Download & Use", "Save the visa-ready photo and attach it to your application."],
];

const rules = [
  ["Size", "Most visas ask for 35mm × 45mm. A few countries publish their own crop."],
  ["Background", "Plain white or a light solid colour, with no pattern and no shadow."],
  ["Expression", "Neutral face, mouth closed, looking straight at the camera."],
  ["Lighting", "Even light, no red-eye, no glare on glasses."],
  ["Head", "Face centred, filling most of the frame."],
  ["Glasses", "Allowed when the eyes stay visible and the lenses do not reflect."],
  ["Coverings", "Religious head coverings are fine when the face is fully visible. Hats are not."],
];

const faqs = [
  ["Is the photo maker free?", "Yes. Upload, crop, and download without an account."],
  ["Can I use a selfie?", "Yes. A front-facing photo with even light is enough for the crop."],
  ["How recent should the photo be?", "Take it within the last six months, and match how you look now."],
  ["Why was my upload rejected?", "Use a JPEG or PNG under a few megabytes, with your face clearly in frame."],
];

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/tools/visa-photo-maker", { en: "Visa Photo Creator", ar: "صورة التأشيرة" });
}

export default async function VisaPhotoPage({ params }: Page) {
  const { locale } = await params;
  const content = await requirePageContent("tools/visa-photo-maker");
  const user = await getCurrentUser();
  const openApps = user
    ? (await listApplicationsForUser(user.id)).filter((app) => app.status === "draft" || app.status === "payment_pending")
    : [];
  const targets = (
    await Promise.all(
      openApps.map(async (app) => {
        const travelers = await listTravelers(app.id);
        const spec = app.documentsRequired.includes("photo") ? documentLabels.photo.hint : null;
        return travelers.map((traveler) => ({
          applicationId: app.id,
          travelerId: traveler.id,
          label: `${app.destinationName} · ${traveler.firstName} ${traveler.lastName}`.trim(),
          spec,
        }));
      }),
    )
  ).flat();
  return (
    <div className="bg-black text-white">
      <section className="mx-auto max-w-3xl px-4 pt-20 pb-12 text-center">
        <h1 className="mx-auto max-w-[558px] font-sans text-3xl leading-tight font-medium md:text-[40px]">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/65">{content.intro}</p>
        <a href="#photo-tool" className="mt-8 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black">
          Make my Photo
        </a>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 md:grid-cols-3">
        {steps.map(([title, body], i) => (
          <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs tracking-[0.16em] text-white/40">0{i + 1}</p>
            <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-4 pb-10 text-sm leading-relaxed text-white/70">
        <h2 className="font-serif text-3xl text-white">How the photo maker tool works</h2>
        <p>
          A usable visa photo is a small, standardised portrait. Countries differ on size and background, and a rejected
          photo delays the whole application. Upload once and download a crop you can attach to the form.
        </p>
        <h2 className="font-serif pt-4 text-3xl text-white">What is a passport-size photo?</h2>
        <p>
          It is the portrait immigration officers use to match you to the passport. The usual print size is 35 by 45
          millimetres, with the face filling most of the frame.
        </p>
      </section>

      <section id="photo-tool" className="mx-auto max-w-xl px-4 pb-16">
        <div className="rounded-3xl bg-white px-2 py-8 text-ink">
          <PhotoMaker locale={locale} targets={targets} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10">
        <h2 className="font-serif text-3xl">General passport-size visa photo requirements</h2>
        <ul className="mt-6 space-y-4">
          {rules.map(([title, body]) => (
            <li key={title}>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-white/65">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="font-serif text-3xl">Questions</h2>
        <Accordion className="mt-4">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-white/10">
              <AccordionTrigger className="text-white">{q}</AccordionTrigger>
              <AccordionContent className="text-white/65">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
