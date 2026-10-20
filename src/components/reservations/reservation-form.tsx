"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { quoteReservation, startReservationCheckout } from "@/app/actions/reservations";
import { easeOut, Reveal } from "@/components/motion/frame";
import { track } from "@/lib/analytics";
import { reservationTotal, type ReservationFees, type ReservationServices } from "@/lib/reservations/pricing";
import { cn } from "@/lib/utils";

type ServiceKey = keyof ReservationServices;

type Airport = { iata: string; city: string; name: string; country: string };

type Quote = {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  destination: string;
  flight: string[];
  hotel: string;
};

const fieldClass = "mt-1 h-12 w-full rounded-2xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand";

export function ReservationForm({
  locale,
  arabic,
  fees,
  open,
}: {
  locale: string;
  arabic: boolean;
  fees: ReservationFees;
  open: ReservationServices;
}) {
  const copy = arabic ? ar : en;
  const [services, setServices] = useState<ReservationServices>(() => {
    const first = (["flight", "hotel", "itinerary", "insurance"] as ServiceKey[]).find((key) => open[key]);
    return {
      flight: first === "flight",
      hotel: first === "hotel",
      itinerary: first === "itinerary",
      insurance: first === "insurance",
    };
  });
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState<"mr" | "mrs" | "ms">("mr");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"m" | "f">("m");
  const [bornOn, setBornOn] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [nationality, setNationality] = useState("EG");
  const [adults, setAdults] = useState(1);
  const [companions, setCompanions] = useState<{ title: "mr" | "mrs" | "ms"; firstName: string; lastName: string; gender: "m" | "f"; bornOn: string }[]>([]);
  const [fromIata, setFromIata] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [toIata, setToIata] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("roundtrip");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [cabin, setCabin] = useState<"economy" | "premium_economy" | "business" | "first">("economy");
  const [policyNo, setPolicyNo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"check" | "pay" | null>(null);

  useEffect(() => {
    track("view_reservations", { item_id: "travel-reservations" });
  }, []);

  const total = reservationTotal(services, fees);
  const needsRoute = services.flight || services.hotel || services.itinerary;
  const needsPeople = services.flight || services.hotel;
  const cards = (Object.keys(open) as ServiceKey[]).filter((key) => open[key]);

  function toggle(key: ServiceKey) {
    setQuote(null);
    setServices((current) => ({ ...current, [key]: !current[key] }));
  }

  function setAdultCount(next: number) {
    const count = Math.min(4, Math.max(1, next));
    setAdults(count);
    setCompanions((current) => Array.from({ length: count - 1 }, (_, index) => current[index] ?? { title: "mr", firstName: "", lastName: "", gender: "m", bornOn: "" }));
    setQuote(null);
  }

  async function checkAvailability() {
    setError("");
    setPending("check");
    const result = await quoteReservation({
      locale,
      services,
      email,
      phone,
      title,
      firstName,
      lastName,
      gender,
      bornOn,
      passportNo,
      nationality,
      adults: needsPeople ? adults : 1,
      companions: needsPeople ? companions : [],
      fromIata: services.flight ? fromIata : "",
      toIata: needsRoute ? toIata : "",
      tripType,
      departDate: needsRoute ? departDate : "",
      returnDate: services.hotel || tripType === "roundtrip" ? returnDate : "",
      cabin,
      policyNo,
    });
    setPending(null);
    if (!result.ok) {
      setQuote(null);
      setError(translate(result.error, arabic));
      return;
    }
    setQuote(result);
  }

  async function pay() {
    if (!quote) return;
    setPending("pay");
    setError("");
    const result = await startReservationCheckout(quote.id, locale);
    if (!result.ok) {
      setPending(null);
      setError(translate(result.error, arabic));
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="pb-44 lg:pb-16">
        <section className="relative overflow-hidden bg-[#16182b] text-white">
          <div className="mx-auto grid max-w-site items-center gap-10 px-5 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-20">
            <Reveal>
              <p className="text-sm font-medium text-[#ffd873]">{copy.eyebrow}</p>
              <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">{copy.hero}</h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">{copy.heroBody}</p>
            </Reveal>
            <Plane />
          </div>
        </section>

        <div className="mx-auto max-w-site px-5">
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((key, index) => {
              const on = services[key];
              return (
                <motion.button
                  key={key}
                  type="button"
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.4, ease: easeOut }}
                  onClick={() => toggle(key)}
                  aria-pressed={on}
                  aria-label={copy.services[key]}
                  className={cn(
                    "rounded-[24px] border p-5 text-start transition-colors",
                    on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink",
                  )}
                >
                  <span className="block text-sm font-medium">{copy.services[key]}</span>
                  <span className={cn("mt-2 block text-2xl font-semibold", on ? "text-[#ffd873]" : "text-ink")}>{fees[key]} {copy.egp}</span>
                  <span className={cn("mt-2 block text-xs", on ? "text-white/80" : "text-muted-ink")}>{copy.serviceNotes[key]}</span>
                </motion.button>
              );
            })}
          </div>

          <form
            className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]"
            onSubmit={(event) => {
              event.preventDefault();
              void checkAvailability();
            }}
          >
            <div className="space-y-4 rounded-[28px] border border-line bg-white p-5 md:p-7">
              <h2 className="text-lg font-semibold">{copy.details}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={copy.email} type="email" value={email} onChange={(value) => { setEmail(value); setQuote(null); }} />
                <Field label={copy.phone} value={phone} onChange={(value) => { setPhone(value); setQuote(null); }} />
                <label className="text-sm">
                  {copy.title}
                  <select className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value as typeof title)}>
                    <option value="mr">{copy.mr}</option>
                    <option value="mrs">{copy.mrs}</option>
                    <option value="ms">{copy.ms}</option>
                  </select>
                </label>
                <Field label={copy.first} value={firstName} onChange={setFirstName} />
                <Field label={copy.last} value={lastName} onChange={setLastName} />
              </div>

              <AnimatePresence initial={false}>
                {needsRoute && (
                  <motion.div key="route" layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-3 overflow-hidden sm:grid-cols-2">
                    {services.flight && <AirportField label={copy.from} selected={fromLabel} onPick={(iata, label) => { setFromIata(iata); setFromLabel(label); setQuote(null); }} />}
                    <AirportField label={services.flight ? copy.to : copy.destination} selected={toLabel} onPick={(iata, label) => { setToIata(iata); setToLabel(label); setQuote(null); }} />
                    <Field label={services.hotel && !services.flight ? copy.checkIn : copy.depart} type="date" value={departDate} onChange={(value) => { setDepartDate(value); setQuote(null); }} />
                    {(services.hotel || tripType === "roundtrip") && (
                      <Field label={services.hotel ? copy.checkOut : copy.returnDate} type="date" value={returnDate} onChange={(value) => { setReturnDate(value); setQuote(null); }} />
                    )}
                    {services.flight && (
                      <label className="text-sm">
                        {copy.trip}
                        <select className={fieldClass} value={tripType} onChange={(event) => { setTripType(event.target.value as typeof tripType); setQuote(null); }}>
                          <option value="roundtrip">{copy.roundtrip}</option>
                          <option value="oneway">{copy.oneway}</option>
                        </select>
                      </label>
                    )}
                    {services.flight && (
                      <label className="text-sm">
                        {copy.cabin}
                        <select className={fieldClass} value={cabin} onChange={(event) => setCabin(event.target.value as typeof cabin)}>
                          <option value="economy">{copy.economy}</option>
                          <option value="premium_economy">{copy.premium}</option>
                          <option value="business">{copy.business}</option>
                          <option value="first">{copy.firstCabin}</option>
                        </select>
                      </label>
                    )}
                  </motion.div>
                )}
                {needsPeople && (
                  <motion.div key="people" layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-3 overflow-hidden sm:grid-cols-2">
                    <label className="text-sm">
                      {copy.adults}
                      <input className={fieldClass} type="number" min={1} max={4} value={adults} onChange={(event) => setAdultCount(Number(event.target.value))} />
                    </label>
                    <Field label={copy.nationality} value={nationality} onChange={(value) => setNationality(value.toUpperCase().slice(0, 2))} />
                  </motion.div>
                )}
                {services.flight && (
                  <motion.div key="identity" layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid gap-3 overflow-hidden sm:grid-cols-2">
                    <label className="text-sm">
                      {copy.gender}
                      <select className={fieldClass} value={gender} onChange={(event) => setGender(event.target.value as typeof gender)}>
                        <option value="m">{copy.male}</option>
                        <option value="f">{copy.female}</option>
                      </select>
                    </label>
                    <Field label={copy.born} type="date" value={bornOn} onChange={setBornOn} />
                  </motion.div>
                )}
                {(services.flight || services.insurance) && (
                  <motion.div key="passport" layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Field label={copy.passport} value={passportNo} onChange={setPassportNo} />
                  </motion.div>
                )}
                {services.insurance && (
                  <motion.div key="policy" layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <Field label={copy.policy} value={policyNo} onChange={setPolicyNo} />
                  </motion.div>
                )}
                {needsPeople && companions.map((person, index) => (
                  <motion.div key={`companion-${index}`} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 rounded-2xl bg-[#f6f7fb] p-4 sm:grid-cols-2">
                    <p className="text-sm font-medium sm:col-span-2">{copy.traveller} {index + 2}</p>
                    <Field label={copy.first} value={person.firstName} onChange={(value) => setCompanions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, firstName: value } : item))} />
                    <Field label={copy.last} value={person.lastName} onChange={(value) => setCompanions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, lastName: value } : item))} />
                    <Field label={copy.born} type="date" value={person.bornOn} onChange={(value) => setCompanions((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, bornOn: value } : item))} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {error && <p className="text-sm text-[#b42318]">{error}</p>}
              <AnimatePresence>
                {quote && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-[#f6f7fb] p-4 text-sm">
                    <p className="font-semibold">{copy.ready} · {quote.reference}</p>
                    {quote.flight.map((leg) => <p key={leg} className="mt-1">{leg}</p>)}
                    {quote.hotel && <p className="mt-1">{quote.hotel}</p>}
                    <p className="mt-2 text-muted-ink">{copy.holdNote}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <aside className="h-fit rounded-[28px] border border-line bg-white p-5 lg:sticky lg:top-24">
              <p className="text-sm text-muted-ink">{copy.serviceFee}</p>
              <motion.p key={total} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-1 text-4xl font-semibold text-[#16182b]">
                {total} <span className="text-lg">{copy.egp}</span>
              </motion.p>
              <button disabled={pending !== null || total <= 0} className="mt-5 hidden h-12 w-full rounded-full bg-brand text-sm font-medium text-white disabled:opacity-60 lg:block">
                {pending === "check" ? copy.checking : copy.check}
              </button>
              {quote && (
                <button type="button" disabled={pending !== null} onClick={() => void pay()} className="mt-3 hidden h-12 w-full rounded-full bg-[#16182b] text-sm font-medium text-white disabled:opacity-60 lg:block">
                  {pending === "pay" ? copy.redirecting : copy.pay}
                </button>
              )}
              {pending === "check" && <Checking label={copy.checking} />}
            </aside>
          </form>

          <section className="mt-14 grid gap-4 md:grid-cols-3">
            {copy.steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08} className="rounded-[24px] border border-line bg-white p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#ffd873] text-sm font-semibold text-[#16182b]">{index + 1}</span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{step.body}</p>
              </Reveal>
            ))}
          </section>

          <section className="mt-10 space-y-3">
            {copy.faq.map((item) => (
              <details key={item.q} className="rounded-2xl border border-line bg-white px-5 py-4">
                <summary className="cursor-pointer font-medium">{item.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-body">{item.a}</p>
              </details>
            ))}
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-24 z-40 border-t border-line bg-white/95 px-5 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-site items-center justify-between gap-3">
            <p className="text-lg font-semibold">{total} {copy.egp}</p>
            {quote ? (
              <button type="button" disabled={pending !== null} onClick={() => void pay()} className="h-11 rounded-full bg-[#16182b] px-5 text-sm font-medium text-white disabled:opacity-60">
                {pending === "pay" ? copy.redirecting : copy.pay}
              </button>
            ) : (
              <button type="button" disabled={pending !== null || total <= 0} onClick={() => void checkAvailability()} className="h-11 rounded-full bg-brand px-5 text-sm font-medium text-white disabled:opacity-60">
                {pending === "check" ? copy.checking : copy.check}
              </button>
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="text-sm">
      {label}
      <input className={fieldClass} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AirportField({ label, selected, onPick }: { label: string; selected: string; onPick: (iata: string, label: string) => void }) {
  const [query, setQuery] = useState(selected);
  const [hits, setHits] = useState<Airport[]>([]);
  const latest = useRef(selected);
  function search(value: string) {
    setQuery(value);
    latest.current = value;
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    window.setTimeout(() => {
      if (latest.current !== value) return;
      void fetch(`/api/airports?q=${encodeURIComponent(value)}`)
        .then((response) => response.json())
        .then((body: { airports?: Airport[] }) => {
          if (latest.current === value) setHits(body.airports ?? []);
        })
        .catch(() => {
          if (latest.current === value) setHits([]);
        });
    }, 180);
  }
  return (
    <label className="relative text-sm">
      {label}
      <input className={fieldClass} value={query} onChange={(event) => search(event.target.value)} />
      {hits.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-line bg-white p-1 shadow-lg">
          {hits.map((airport) => (
            <li key={airport.iata}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-[#f6f7fb]"
                onClick={() => {
                  const label = `${airport.city} (${airport.iata})`;
                  latest.current = label;
                  setQuery(label);
                  onPick(airport.iata, label);
                  setHits([]);
                }}
              >
                {airport.city} · {airport.iata}
                <span className="block text-xs text-muted-ink">{airport.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  );
}

function Plane() {
  return (
    <div className="relative h-40 overflow-hidden rounded-[28px] bg-white/5" aria-hidden>
      <svg viewBox="0 0 360 140" className="h-full w-full">
        <path d="M20 100 C 90 100, 120 30, 180 40 S 280 110, 340 50" fill="none" stroke="#ffd873" strokeWidth="2" strokeDasharray="6 6" />
      </svg>
      <motion.span
        className="absolute top-8 text-2xl"
        animate={{ offsetDistance: ["0%", "100%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        style={{ offsetPath: "path('M20 100 C 90 100, 120 30, 180 40 S 280 110, 340 50')" }}
      >
        ✈
      </motion.span>
    </div>
  );
}

function Checking({ label }: { label: string }) {
  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-muted-ink">
      {label}
      {[0, 1, 2].map((dot) => (
        <motion.span key={dot} className="size-1.5 rounded-full bg-brand" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }} />
      ))}
    </p>
  );
}

function translate(message: string, arabic: boolean) {
  if (!arabic) return message;
  const known: Record<string, string> = {
    "Enter a phone number": "أدخل رقم الهاتف",
    "Enter the name as in the passport": "أدخل الاسم كما في الجواز",
    "Destination and travel dates are required": "الوجهة وتواريخ السفر مطلوبة",
    "Choose the departure airport": "اختر مطار المغادرة",
    "Choose the return date": "اختر تاريخ العودة",
    "Choose the hotel checkout date": "اختر تاريخ الخروج من الفندق",
    "Passport number is required for a flight hold": "رقم الجواز مطلوب لحجز الطيران",
    "Date of birth is required for a flight hold": "تاريخ الميلاد مطلوب لحجز الطيران",
    "Enter every traveller": "أدخل بيانات كل المسافرين",
    "Policy number and passport number are required": "رقم الوثيقة ورقم الجواز مطلوبان",
    "Choose a nearer departure date": "اختر تاريخ مغادرة أقرب",
    "The stay must be between 1 and 30 nights": "مدة الإقامة بين ليلة و30 ليلة",
    "One of the selected services is not available.": "إحدى الخدمات المختارة غير متاحة",
    "Choose a service with a price.": "اختر خدمة لها سعر",
    "No airline can hold this route without immediate payment.": "لا توجد شركة طيران تحجز هذا المسار دون دفع فوري. جرّب تاريخاً آخر.",
    "No hotel with free cancellation was found for these dates.": "لا يوجد فندق بإلغاء مجاني في هذه التواريخ. جرّب تاريخاً آخر.",
    "No refundable hotel was found for these dates.": "لا يوجد فندق قابل للإلغاء في هذه التواريخ. جرّب تاريخاً آخر.",
  };
  return known[message] ?? message;
}

const en = {
  eyebrow: "For visa files",
  hero: "A real reservation, held before you travel.",
  heroBody: "Choose a flight hold, a refundable hotel, an itinerary, or an existing insurance policy. You pay the service fee first. The booking is created only after payment.",
  egp: "EGP",
  details: "Traveller details",
  email: "Email",
  phone: "Phone",
  title: "Title",
  mr: "Mr",
  mrs: "Mrs",
  ms: "Ms",
  first: "First name, as in the passport",
  last: "Last name, as in the passport",
  from: "From",
  to: "To",
  destination: "Destination airport",
  depart: "Departure",
  returnDate: "Return",
  checkIn: "Check-in",
  checkOut: "Check-out",
  trip: "Trip",
  roundtrip: "Round trip",
  oneway: "One way",
  cabin: "Cabin",
  economy: "Economy",
  premium: "Premium economy",
  business: "Business",
  firstCabin: "First",
  adults: "Adults",
  nationality: "Nationality (ISO code)",
  gender: "Gender",
  male: "Male",
  female: "Female",
  born: "Date of birth",
  passport: "Passport number",
  policy: "Existing policy number",
  traveller: "Traveller",
  serviceFee: "Service fee",
  check: "Check availability",
  checking: "Checking",
  pay: "Pay and book",
  redirecting: "Opening payment",
  ready: "Available",
  holdNote: "The airline hold stays unpaid. A hotel is booked only on a free-cancellation rate.",
  services: { flight: "Flight hold", hotel: "Refundable hotel", itinerary: "Itinerary", insurance: "Insurance file" },
  serviceNotes: {
    flight: "Real airline reference, not ticketed",
    hotel: "Real confirmation, free to cancel",
    itinerary: "A day-by-day plan",
    insurance: "An existing policy, fetched by number",
  },
  steps: [
    { title: "Choose", body: "Pick one service or several. The form shows only the fields that service needs." },
    { title: "Check", body: "We look for a holdable flight or a refundable hotel before any payment." },
    { title: "Receive", body: "After payment, the real booking is created and the files are emailed." },
  ],
  faq: [
    { q: "Is the flight ticketed?", a: "No. It is a real hold with the airline reference and a hold-until date. It is not a ticket." },
    { q: "Will the hotel charge me?", a: "The stay is booked on a rate that can be cancelled for free before the deadline shown in your file." },
    { q: "What if nothing is available?", a: "We do not take payment. Try different dates." },
  ],
};

const ar = {
  eyebrow: "لملف التأشيرة",
  hero: "حجز حقيقي معلّق قبل السفر.",
  heroBody: "اختر حجز طيران معلّقاً أو فندقاً قابلاً للإلغاء أو برنامج رحلة أو وثيقة تأمين موجودة. تدفع رسوم الخدمة أولاً، ولا يُنشأ الحجز إلا بعد الدفع.",
  egp: "جنيه",
  details: "بيانات المسافر",
  email: "البريد",
  phone: "الهاتف",
  title: "اللقب",
  mr: "السيد",
  mrs: "السيدة",
  ms: "الآنسة",
  first: "الاسم الأول كما في الجواز",
  last: "اسم العائلة كما في الجواز",
  from: "من",
  to: "إلى",
  destination: "مطار الوجهة",
  depart: "تاريخ الذهاب",
  returnDate: "تاريخ العودة",
  checkIn: "تاريخ الدخول",
  checkOut: "تاريخ الخروج",
  trip: "الرحلة",
  roundtrip: "ذهاب وعودة",
  oneway: "ذهاب فقط",
  cabin: "الدرجة",
  economy: "اقتصادية",
  premium: "اقتصادية مميزة",
  business: "رجال أعمال",
  firstCabin: "أولى",
  adults: "عدد البالغين",
  nationality: "الجنسية (رمز من حرفين)",
  gender: "الجنس",
  male: "ذكر",
  female: "أنثى",
  born: "تاريخ الميلاد",
  passport: "رقم الجواز",
  policy: "رقم وثيقة التأمين الموجودة",
  traveller: "مسافر",
  serviceFee: "رسوم الخدمة",
  check: "فحص التوفر",
  checking: "جارٍ الفحص",
  pay: "ادفع وأنشئ الحجز",
  redirecting: "جارٍ فتح الدفع",
  ready: "متاح",
  holdNote: "حجز الطيران معلّق وغير مدفوع. الفندق يُحجز فقط بسعر يمكن إلغاؤه مجاناً.",
  services: { flight: "حجز طيران", hotel: "فندق قابل للإلغاء", itinerary: "برنامج الرحلة", insurance: "ملف التأمين" },
  serviceNotes: {
    flight: "رقم حجز حقيقي من شركة الطيران، دون تذكرة",
    hotel: "رقم تأكيد حقيقي، وإلغاء مجاني",
    itinerary: "خطة يوم بيوم",
    insurance: "وثيقة موجودة تُستخرج برقمها",
  },
  steps: [
    { title: "اختر", body: "خدمة واحدة أو أكثر. تظهر فقط الخانات التي تحتاجها الخدمة." },
    { title: "افحص", body: "نبحث عن رحلة تقبل الحجز المعلّق أو فندق بإلغاء مجاني قبل أي دفع." },
    { title: "استلم", body: "بعد الدفع يُنشأ الحجز الحقيقي وتصل الملفات على البريد." },
  ],
  faq: [
    { q: "هل التذكرة صادرة؟", a: "لا. الحجز معلّق برقم حقيقي وموعد انتهاء، من غير إصدار تذكرة." },
    { q: "هل يُخصم ثمن الفندق؟", a: "الإقامة على سعر يمكن إلغاؤه مجاناً قبل الموعد المكتوب في الملف." },
    { q: "ماذا لو لم يوجد حجز؟", a: "لا نأخذ المبلغ. جرّب تواريخ أخرى." },
  ],
};
