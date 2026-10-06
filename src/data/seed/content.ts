// Editorial seed content. "{country}" is replaced with the destination name at render time.

export type SeedFaq = { scope: "visa" | "home" | "refunds" | "emergency"; category: string; question: string; answer: string };
export type SeedReview = {
  scope: "visa" | "home" | "refunds" | "wall";
  author: string;
  location?: string;
  title?: string;
  body: string;
  rating?: number;
  product?: string;
  publishedAt?: string;
};

export const faqCategories = [
  "General Information",
  "Eligibility & Requirements",
  "Application Process",
  "Status Tracking",
  "Refunds, Rejections & Reapplications",
  "Visa Extension & Overstays",
] as const;

export const faqs: SeedFaq[] = [
  { scope: "visa", category: "General Information", question: "Do Egyptian citizens need a visa for {country}?", answer: "Yes. Egyptian passport holders need a valid visa to enter {country}. This page shows the visa type, the fee, and the date we aim to finish by before you pay." },
  { scope: "visa", category: "General Information", question: "What type of {country} visa should I apply for?", answer: "For tourism and short visits, apply for the visa type listed on this page. If you are travelling for work, study or residence, talk to a visa expert on live video call to pick the right category." },
  { scope: "visa", category: "General Information", question: "How much does the {country} visa cost?", answer: "The total shown on this page is the government fee plus our service fee. Fee changes made in the admin console are listed in the fee change audit." },
  { scope: "visa", category: "Eligibility & Requirements", question: "Which documents do I need for a {country} visa?", answer: "The required documents are listed on this page. Most applicants need a passport and a recent photo. Our team checks the files after you pay. Nothing is sent to an authority automatically." },
  { scope: "visa", category: "Eligibility & Requirements", question: "How long must my passport be valid?", answer: "Your passport should be valid for at least 6 months from your date of arrival in {country} and have at least two blank pages." },
  { scope: "visa", category: "Eligibility & Requirements", question: "Can I apply for my family in one application?", answer: "Yes. Add every traveller to a single application. You upload once, pay once, and get one guaranteed date for the whole group." },
  { scope: "visa", category: "Application Process", question: "How do I apply for a {country} visa online?", answer: "Pick your departure date, add travellers, upload the passport and photo, review, and pay. Our team then reviews the file. Filing with the authority is a manual step in the admin console, not an automatic government submission." },
  { scope: "visa", category: "Application Process", question: "How early should I apply?", answer: "Apply as soon as your travel dates are fixed. The guaranteed date is shown before you pay, so you can make sure your visa arrives before you fly." },
  { scope: "visa", category: "Status Tracking", question: "How can I track my {country} visa application?", answer: "Sign in and open your application. You will see the status our team sets, including document checks. There is no live feed from the government." },
  { scope: "visa", category: "Status Tracking", question: "Will I be notified when my visa is approved?", answer: "Yes. You receive an email the moment your visa is approved, and the visa is available to download from your account." },
  { scope: "visa", category: "Refunds, Rejections & Reapplications", question: "What happens if my {country} visa is late?", answer: "If the file is still open after the guaranteed date, request a refund from your account. A staff member reviews the request. It is not issued automatically." },
  { scope: "visa", category: "Refunds, Rejections & Reapplications", question: "What if my {country} visa is rejected?", answer: "A refusal does not automatically refund the fee. Request a review from your account. Rejection notes appear on a destination only when they have been entered for that country." },
  { scope: "visa", category: "Visa Extension & Overstays", question: "Can I extend my {country} visa?", answer: "Extensions depend on the immigration rules of {country}. Contact support before your visa expires and our experts will guide you through the options." },
  { scope: "visa", category: "Visa Extension & Overstays", question: "What happens if I overstay?", answer: "Overstaying can lead to fines, deportation and future visa refusals. Always leave before the permitted length of stay ends." },

  { scope: "home", category: "General", question: "Do I need a visa for my destination?", answer: "Choose your passport and destination above. We instantly show whether you need a visa, an eTA or nothing at all, plus the fee and processing time." },
  { scope: "home", category: "General", question: "What does “Visas on time, guaranteed” mean?", answer: "Every visa shows a target date before you pay. If that date passes while the file is still open, you can request a refund from your account. Staff review the request." },
  { scope: "home", category: "General", question: "How long does it take to get my visa?", answer: "It depends on the destination: from minutes for an arrival card to a few days for most e-visas. The exact guaranteed date is shown on each visa before you start." },
  { scope: "home", category: "General", question: "What happens if my visa is denied?", answer: "A refusal does not automatically refund the fee. You can request a review from your account, and a staff member decides." },
  { scope: "home", category: "General", question: "Can I apply for my whole family in one go?", answer: "Yes. Add every traveller to a single application: one upload, one payment and one guaranteed date for the whole group." },
  { scope: "home", category: "General", question: "Which documents do I need?", answer: "For most visas, a passport and a photo. Anything extra is listed on the visa page before you pay. Our team checks the files after payment." },

  { scope: "refunds", category: "Refunds", question: "Do you give refunds?", answer: "You can request a refund from your account before the application is marked filed. A staff member approves or declines it. There is no automatic refund." },
  { scope: "refunds", category: "Refunds", question: "Do I get a refund if my visa is rejected?", answer: "A rejection does not by itself refund the government or service fee. Request a review from your account and our team decides." },
  { scope: "refunds", category: "Refunds", question: "Can I get a refund if I cancel my application?", answer: "Request a refund from your account before the application is marked filed. There is no instant account credit. After a person marks the file as filed, the fee is no longer refunded from this site." },
  { scope: "refunds", category: "Refunds", question: "What if you cancel my application?", answer: "If we cancel the application before it is marked filed, you can request a refund and a staff member can send it back to the card." },
  { scope: "refunds", category: "Refunds", question: "How long does a refund take?", answer: "After a staff member approves the request, a card refund depends on the payment provider and can take several working days. Nothing is credited instantly inside the account." },
  { scope: "refunds", category: "Refunds", question: "Are there hidden fees?", answer: "The amount you pay is the government fee plus the service fee shown before checkout." },

  { scope: "emergency", category: "Emergency", question: "What is the emergency visa helpline?", answer: "A dedicated phone line for travellers facing urgent, time-sensitive visa situations that cannot wait for standard support channels." },
  { scope: "emergency", category: "Emergency", question: "When should I call the emergency helpline?", answer: "Call when you have imminent travel for a medical, family or work emergency and your visa is not yet in hand." },
  { scope: "emergency", category: "Emergency", question: "What information should I have ready?", answer: "Your passport, travel dates, destination and, if you already applied, your application reference." },
  { scope: "emergency", category: "Emergency", question: "Is there a fee for the helpline?", answer: "Calling the helpline is free. If an express service is needed, the fee is shown to you before anything is charged." },
  { scope: "emergency", category: "Emergency", question: "What if my case is not an emergency?", answer: "We will guide you to the standard application flow on the website or app, where most visas are delivered within days." },
];

export const reviews: SeedReview[] = [
  { scope: "visa", author: "Ryan Mitchell", location: "Egypt", title: "{country} visa without the hassle", body: "Applied on the website and my {country} visa was approved in a few days. Much easier than the official portal." },
  { scope: "visa", author: "Hana Suzuki", location: "Egypt", title: "Perfect for our trip", body: "Clear instructions and quick processing. Our {country} visas arrived well before the flight." },
  { scope: "visa", author: "Oscar Nilsson", location: "Egypt", title: "Great experience", body: "The {country} form was long, but it was broken into simple steps. Approved without any queries." },
  { scope: "visa", author: "Laura Romero", location: "Egypt", title: "Approved right on schedule", body: "I was worried about holiday delays, but my {country} visa came through exactly when promised." },
  { scope: "visa", author: "James Whitfield", location: "Egypt", title: "Smooth and predictable", body: "They set the right expectations on {country} processing time and delivered exactly on it." },
  { scope: "visa", author: "Nina Petrova", location: "Egypt", title: "Couple's trip made easy", body: "Two {country} visas, one simple application. Both approved together." },
  { scope: "visa", author: "Adam Nowak", location: "Egypt", title: "No more embassy queues", body: "Did everything online for my {country} visa. The approval landed in my inbox in a few days." },
  { scope: "visa", author: "Mia Johansson", location: "Egypt", title: "Five stars", body: "Everything from upload to approval was seamless. {country} visa in hand within days." },

  { scope: "home", author: "Louis B.", location: "Montgomery", product: "India E-Visa", body: "This process was a huge improvement over completing the application on my own. I entered my departure date, my full name, and uploaded a photo with my passport. Three quick steps: smooth, efficient and stress-free." },
  { scope: "home", author: "Salma K.", location: "Cairo", product: "Vietnam E-Visa", body: "Fast and easy, and the visa actually came earlier than expected." },
  { scope: "home", author: "Omar H.", location: "Alexandria", product: "UK Visa", body: "The team helped with every document and I completed my trip exactly as planned." },
  { scope: "home", author: "Nour A.", location: "Giza", product: "Türkiye E-Visa", body: "Got my Türkiye e-visa the same evening. The live tracking made it stress-free." },
  { scope: "home", author: "Karim M.", location: "Cairo", product: "Thailand E-Visa", body: "Uploaded my passport, paid, and forgot about it. The visa arrived on the guaranteed date." },
  { scope: "home", author: "Yasmin R.", location: "Mansoura", product: "Georgia E-Visa", body: "Clear prices, no hidden fees and a real person answered my questions at midnight." },

  { scope: "refunds", author: "Rahul Mehta", publishedAt: "2024-12-23", body: "My visa could not be processed due to a delay, and the refund was handled very smoothly. Support explained the reason clearly and refunded the service fee without back and forth." },
  { scope: "refunds", author: "Neha Agarwal", publishedAt: "2024-11-08", body: "My visa didn't go through because of external factors, but my eligible refund was processed exactly as promised." },
  { scope: "refunds", author: "Karthik Reddy", publishedAt: "2024-10-15", body: "I was worried when my application couldn't move forward, but the refund experience was stress-free." },
  { scope: "refunds", author: "Pooja Singh", publishedAt: "2025-01-02", body: "What I appreciated most was the clarity around refunds. They proactively guided me through the steps." },

  { scope: "wall", author: "Taneka C.", product: "UAE Visa", publishedAt: "2026-09-12", title: "Great experience", body: "The team guided me and expedited my visa process. I was stressed about getting the visa on time and it arrived early." },
  { scope: "wall", author: "Deepa", product: "Schengen Visa", publishedAt: "2026-09-08", title: "Super smooth process", body: "This is my second visa through this service and the process was smooth. Support answered all my questions." },
  { scope: "wall", author: "Bhuvanesh P.", product: "Singapore Visa", publishedAt: "2026-09-05", title: "Responsive support", body: "I'm happy with how quickly the team contacted me about my concerns. A central hub for travel information." },
  { scope: "wall", author: "Gerald T.", product: "Australia Visa", publishedAt: "2026-09-02", title: "Very helpful staff", body: "My wife's passport was an issue due to the reflective page. It all worked out and we received our visas the day before we travelled." },
  { scope: "wall", author: "Mandar K.", product: "UAE Visa", publishedAt: "2026-08-30", title: "Fast visa service", body: "We applied at the last moment for an express visa. It came on the promised time." },
  { scope: "wall", author: "Pratyay B.", product: "Vietnam Visa", publishedAt: "2026-08-21", title: "Fastest visa app", body: "Simple to submit applications. All background work is done by the team; you just wait for the visa on time." },
  { scope: "wall", author: "Aarti S.", product: "UK Visa", publishedAt: "2026-08-14", title: "Wonderful service", body: "Got my UK visa in a week. Highly recommend to anyone looking for a stress-free visa." },
  { scope: "wall", author: "Preeti", product: "Georgia Visa", publishedAt: "2026-08-03", title: "Great app", body: "I have always been anxious about visas, but this was so easy that I already planned two more countries." },
];

export const events = [
  { name: "Baku City Circuit Grand Prix", city: "Baku", country: "AZ", startsOn: "2027-09-19" },
  { name: "Songkran Water Festival", city: "Bangkok", country: "TH", startsOn: "2027-04-13" },
  { name: "Sydney New Year's Eve Fireworks", city: "Sydney", country: "AU", startsOn: "2026-12-31" },
  { name: "Tết Lunar New Year", city: "Hanoi", country: "VN", startsOn: "2027-02-06" },
  { name: "Qatar Grand Prix", city: "Doha", country: "QA", startsOn: "2026-11-29" },
  { name: "Wimbledon Championships", city: "London", country: "GB", startsOn: "2027-06-28" },
  { name: "Hong Kong Sevens", city: "Hong Kong", country: "HK", startsOn: "2027-03-26" },
  { name: "Istanbul Marathon", city: "Istanbul", country: "TR", startsOn: "2026-11-08" },
  { name: "Marrakech International Film Festival", city: "Marrakesh", country: "MA", startsOn: "2026-11-27" },
  { name: "Bali Arts Festival", city: "Bali", country: "ID", startsOn: "2027-06-12" },
  { name: "Toronto International Film Festival", city: "Toronto", country: "CA", startsOn: "2027-09-09" },
  { name: "US Open Tennis", city: "New York", country: "US", startsOn: "2027-08-30" },
];

export const holidays = [
  { country: "EG", date: "2026-10-06", name: "Armed Forces Day" },
  { country: "EG", date: "2027-01-07", name: "Coptic Christmas" },
  { country: "EG", date: "2027-01-25", name: "Revolution Day (January 25)" },
  { country: "EG", date: "2027-03-09", name: "Eid al-Fitr" },
  { country: "EG", date: "2027-03-10", name: "Eid al-Fitr holiday" },
  { country: "EG", date: "2027-04-25", name: "Sinai Liberation Day" },
  { country: "EG", date: "2027-05-01", name: "Labour Day" },
  { country: "EG", date: "2027-05-03", name: "Sham el-Nessim" },
  { country: "EG", date: "2027-05-16", name: "Arafat Day" },
  { country: "EG", date: "2027-05-17", name: "Eid al-Adha" },
  { country: "EG", date: "2027-06-06", name: "Islamic New Year" },
  { country: "EG", date: "2027-06-30", name: "June 30 Revolution" },
  { country: "EG", date: "2027-07-23", name: "Revolution Day (July 23)" },
  { country: "EG", date: "2027-08-15", name: "Prophet's Birthday" },
];

export const defaultRejectionReasons = [
  { title: "Expired Passport", body: "Applying with a passport that has expired or expires within 6 months" },
  { title: "Criminal Record", body: "Having a criminal history that disqualifies you from obtaining a visa." },
  { title: "Previous Visa Violations", body: "Having overstayed or violated the terms of a previous visa." },
];

export const documentLabels: Record<string, { label: string; hint: string; labelAr: string; hintAr: string }> = {
  passport: { label: "Passport", hint: "The photo page of the passport.", labelAr: "جواز السفر", hintAr: "صفحة الصورة في الجواز." },
  photo: { label: "Photo", hint: "A recent photo on a plain, light background.", labelAr: "صورة", hintAr: "صورة حديثة على خلفية فاتحة سادة." },
  bank_statements: { label: "Bank Statements", hint: "Last 6 months, stamped by your bank.", labelAr: "كشوف الحساب", hintAr: "آخر 6 أشهر، مختومة من البنك." },
  income_tax_returns: { label: "Income Tax Returns", hint: "Most recent tax return or salary certificate.", labelAr: "إقرارات ضريبية", hintAr: "أحدث إقرار أو شهادة راتب." },
  us_uk_schengen_visa: { label: "US/UK/Schengen Visa", hint: "A valid visa or residence permit from the US, UK or Schengen area.", labelAr: "تأشيرة أمريكا أو بريطانيا أو شنغن", hintAr: "تأشيرة أو إقامة سارية من أمريكا أو بريطانيا أو شنغن." },
};
