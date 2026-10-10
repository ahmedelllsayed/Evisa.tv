import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PhotoMaker } from "@/components/tools/photo-maker";
import { docHint } from "@/lib/localize";
import { getCurrentUser } from "@/lib/auth";
import { listApplicationsForUser, listTravelers } from "@/lib/data/applications";
import { requirePageContent } from "@/lib/data/pages";
import { isArabicLocale } from "@/lib/i18n";

function copy(ar: boolean) {
  if (!ar) {
    return {
      cta: "Make my Photo",
      how: "How the photo maker tool works",
      howBody: "A usable visa photo is a small, standardised portrait. Countries differ on size and background, and a rejected photo delays the whole application. Upload once and download a crop you can attach to the form.",
      what: "What is a passport-size photo?",
      whatBody: "It is the portrait immigration officers use to match you to the passport. The usual print size is 35 by 45 millimetres, with the face filling most of the frame.",
      reqs: "General passport-size visa photo requirements",
      questions: "Questions",
      steps: [
        ["Upload Your Photo", "Pick a photo from your phone or computer (JPEG, JPG, or PNG). A fresh selfie works too."],
        ["Adjust & Resize", "The tool crops and sizes the portrait so it matches common visa photo guidelines."],
        ["Download & Use", "Save the visa-ready photo and attach it to your application."],
      ],
      rules: [
        ["Size", "Most visas ask for 35mm × 45mm. A few countries publish their own crop."],
        ["Background", "Plain white or a light solid colour, with no pattern and no shadow."],
        ["Expression", "Neutral face, mouth closed, looking straight at the camera."],
        ["Lighting", "Even light, no red-eye, no glare on glasses."],
        ["Head", "Face centred, filling most of the frame."],
        ["Glasses", "Allowed when the eyes stay visible and the lenses do not reflect."],
        ["Coverings", "Religious head coverings are fine when the face is fully visible. Hats are not."],
      ],
      faqs: [
        ["Is the photo maker free?", "Yes. Upload, crop, and download without an account."],
        ["Can I use a selfie?", "Yes. A front-facing photo with even light is enough for the crop."],
        ["How recent should the photo be?", "Take it within the last six months, and match how you look now."],
        ["Why was my upload rejected?", "Use a JPEG or PNG under a few megabytes, with your face clearly in frame."],
      ],
    };
  }
  return {
    cta: "أنشئ صورتي",
    how: "كيف تعمل أداة الصورة",
    howBody: "صورة التأشيرة الصالحة بورتريه صغير وموحّد. تختلف الدول في المقاس والخلفية، والصورة المرفوضة تؤخر الطلب كله. ارفعها مرة ونزّل قصاً يمكن إرفاقه بالنموذج.",
    what: "ما صورة بحجم جواز السفر؟",
    whatBody: "هي الصورة التي يطابق بها موظف الهجرة وجهك مع الجواز. المقاس المعتاد 35 في 45 مليمتراً، والوجه يملأ معظم الإطار.",
    reqs: "متطلبات صورة التأشيرة بحجم الجواز",
    questions: "أسئلة",
    steps: [
      ["ارفع صورتك", "اختر صورة من الهاتف أو الحاسوب (JPEG أو JPG أو PNG). سيلفي حديث يصلح أيضاً."],
      ["اضبط المقاس", "تقصّ الأداة الصورة وتضبطها لتطابق إرشادات صور التأشيرة الشائعة."],
      ["نزّلها واستخدمها", "احفظ الصورة الجاهزة وأرفقها بطلبك."],
    ],
    rules: [
      ["المقاس", "أغلب التأشيرات تطلب 35 مم × 45 مم. بعض الدول تنشر قصاً خاصاً."],
      ["الخلفية", "أبيض سادة أو لون فاتح ثابت، بلا نقش وبلا ظل."],
      ["التعبير", "وجه محايد، والفم مغلق، والنظر مباشرة إلى الكاميرا."],
      ["الإضاءة", "ضوء متساوٍ، بلا عين حمراء، وبلا انعكاس على النظارة."],
      ["الرأس", "الوجه في الوسط ويملأ معظم الإطار."],
      ["النظارات", "مسموحة إذا بقيت العينان ظاهرتين ولم تعكس العدسات."],
      ["أغطية الرأس", "غطاء الرأس الديني مقبول إذا بقي الوجه ظاهراً بالكامل. القبعة ليست كذلك."],
    ],
    faqs: [
      ["هل أداة الصورة مجانية؟", "نعم. ارفع واقصّ ونزّل بدون حساب."],
      ["هل يمكن استخدام سيلفي؟", "نعم. صورة أمامية بإضاءة متساوية تكفي للقص."],
      ["كم يجب أن تكون الصورة حديثة؟", "خلال آخر ستة أشهر، ومطابقة لمظهرك الحالي."],
      ["لماذا رُفض الرفع؟", "استخدم JPEG أو PNG بحجم بضعة ميغابايت، ووجهك واضح داخل الإطار."],
    ],
  };
}

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/tools/visa-photo-maker", { en: "Visa Photo Creator", ar: "صورة التأشيرة" });
}

export default async function VisaPhotoPage({ params }: Page) {
  const { locale } = await params;
  const c = copy(isArabicLocale(locale));
  const content = await requirePageContent("tools/visa-photo-maker");
  const user = await getCurrentUser();
  const openApps = user
    ? (await listApplicationsForUser(user.id)).filter((app) => app.status === "draft" || app.status === "payment_pending")
    : [];
  const targets = (
    await Promise.all(
      openApps.map(async (app) => {
        const travelers = await listTravelers(app.id);
        const spec = app.documentsRequired.includes("photo") ? docHint("photo", locale) : null;
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
          {c.cta}
        </a>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-16 md:grid-cols-3">
        {c.steps.map(([title, body], i) => (
          <article key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs tracking-[0.16em] text-white/40">0{i + 1}</p>
            <h2 className="mt-3 font-display text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-3xl space-y-4 px-4 pb-10 text-sm leading-relaxed text-white/70">
        <h2 className="font-serif text-3xl text-white">{c.how}</h2>
        <p>{c.howBody}</p>
        <h2 className="font-serif pt-4 text-3xl text-white">{c.what}</h2>
        <p>{c.whatBody}</p>
      </section>

      <section id="photo-tool" className="mx-auto max-w-xl px-4 pb-16">
        <div className="rounded-3xl bg-white px-2 py-8 text-ink">
          <PhotoMaker locale={locale} targets={targets} />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10">
        <h2 className="font-serif text-3xl">{c.reqs}</h2>
        <ul className="mt-6 space-y-4">
          {c.rules.map(([title, body]) => (
            <li key={title}>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-white/65">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="font-serif text-3xl">{c.questions}</h2>
        <Accordion className="mt-4">
          {c.faqs.map(([q, a]) => (
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
