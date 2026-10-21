import { z } from "zod";
import { MAX_HORIZON_DAYS, MAX_STAY_NIGHTS, nightsBetween, todayIso } from "./limits";

const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const title = z.enum(["mr", "mrs", "ms"]);

const services = z
  .object({
    flight: z.boolean(),
    hotel: z.boolean(),
    itinerary: z.boolean(),
    insurance: z.boolean(),
  })
  .refine((value) => value.flight || value.hotel || value.itinerary || value.insurance, "Choose at least one service");

const companion = z.object({
  title,
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  gender: z.enum(["m", "f"]),
  bornOn: isoDate,
});

export const reservationInput = z
  .object({
    locale: z.enum(["en-EG", "ar-EG"]),
    services,
    email: z.string().trim().email().max(120),
    phone: z.string().trim().min(8, "Enter a phone number").max(20),
    title,
    firstName: z.string().trim().min(1, "Enter the name as in the passport").max(60),
    lastName: z.string().trim().min(1, "Enter the name as in the passport").max(60),
    gender: z.enum(["m", "f"]),
    bornOn: isoDate.or(z.literal("")),
    passportNo: z.string().trim().max(20),
    nationality: z.string().trim().regex(/^[A-Za-z]{2}$/),
    adults: z.number().int().min(1).max(4),
    companions: z.array(companion).max(3),
    fromIata: z.string().trim().regex(/^[A-Za-z]{3}$/).or(z.literal("")),
    toIata: z.string().trim().regex(/^[A-Za-z]{3}$/).or(z.literal("")),
    tripType: z.enum(["oneway", "roundtrip"]),
    departDate: isoDate.or(z.literal("")),
    returnDate: isoDate.or(z.literal("")),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
    policyNo: z.string().trim().max(40),
  })
  .superRefine((value, ctx) => {
    const needsRoute = value.services.flight || value.services.hotel || value.services.itinerary;
    if (needsRoute && (!value.toIata || !value.departDate)) {
      ctx.addIssue({ code: "custom", message: "Destination and travel dates are required", path: ["toIata"] });
    }
    if (value.services.flight && !value.fromIata) {
      ctx.addIssue({ code: "custom", message: "Choose the departure airport", path: ["fromIata"] });
    }
    if (value.services.flight && value.tripType === "roundtrip" && !value.returnDate) {
      ctx.addIssue({ code: "custom", message: "Choose the return date", path: ["returnDate"] });
    }
    if (value.services.hotel && !value.returnDate) {
      ctx.addIssue({ code: "custom", message: "Choose the hotel checkout date", path: ["returnDate"] });
    }
    if (value.services.insurance && (!value.policyNo || !value.passportNo)) {
      ctx.addIssue({ code: "custom", message: "Policy number and passport number are required", path: ["policyNo"] });
    }
    if (!value.departDate) return;
    const horizon = nightsBetween(todayIso(), value.departDate);
    if (horizon > MAX_HORIZON_DAYS || horizon < 0) {
      ctx.addIssue({ code: "custom", message: "Choose a nearer departure date", path: ["departDate"] });
    }
    if (value.tripType === "roundtrip" && value.returnDate) {
      const stay = nightsBetween(value.departDate, value.returnDate);
      if (stay < 1 || stay > MAX_STAY_NIGHTS) {
        ctx.addIssue({ code: "custom", message: "The stay must be between 1 and 30 nights", path: ["returnDate"] });
      }
    }
  });

export type ReservationInput = z.infer<typeof reservationInput>;
