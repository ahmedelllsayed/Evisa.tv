export type VisaType = "e-visa" | "sticker" | "eta" | "visa-free";

export type Destination = {
  id: string;
  code: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  region: string | null;
  visaRequired: boolean;
  visaType: VisaType;
  validity: string | null;
  validityAr?: string | null;
  stay: string | null;
  stayAr?: string | null;
  entry: string | null;
  entryAr?: string | null;
  acceptedAt: string | null;
  method: string | null;
  methodAr?: string | null;
  govFee: number;
  serviceFee: number;
  currency: string;
  processingHours: number | null;
  expressHours: number | null;
  expressFee: number | null;
  embassyVisit: boolean;
  documents: string[];
  image: string | null;
  heroImage: string | null;
  flag: string | null;
  videoUrl: string | null;
  lat: number | null;
  lng: number | null;
  cities: string[];
  sources: { label: string; url: string }[];
  rejectionReasons: { title: string; body: string; titleAr?: string; bodyAr?: string }[];
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

export type Faq = {
  id: string;
  destinationId: string | null;
  scope: string;
  category: string;
  categoryAr?: string | null;
  question: string;
  questionAr?: string | null;
  answer: string;
  answerAr?: string | null;
  sortOrder: number;
};

export type Review = {
  id: string;
  destinationId: string | null;
  scope: string;
  author: string;
  location: string | null;
  title: string | null;
  titleAr?: string | null;
  body: string;
  bodyAr?: string | null;
  rating: number;
  product: string | null;
  url: string | null;
  publishedAt: string;
  sortOrder: number;
};

export type TravelEvent = {
  id: string;
  destinationId: string | null;
  name: string;
  city: string;
  countryCode: string;
  startsOn: string;
  image: string | null;
};

export type Holiday = { id?: string; date: string; name: string; countryCode: string };

export type FeeChange = {
  id: string;
  destinationId: string;
  destinationName: string;
  oldTotal: number;
  newTotal: number;
  reason: string | null;
  changedAt: string;
};

export type ApplicationStatus =
  | "draft"
  | "payment_pending"
  | "submitted"
  | "in_review"
  | "filed"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded";

export type ApplicationStep = "travelers" | "documents" | "review" | "payment" | "done";

export type Application = {
  id: string;
  reference: string;
  userId: string;
  userEmail?: string;
  destinationId: string;
  destinationName: string;
  destinationSlug: string;
  destinationFlag: string | null;
  destinationImage: string | null;
  documentsRequired: string[];
  status: ApplicationStatus;
  step: ApplicationStep;
  departureDate: string | null;
  express: boolean;
  guaranteedAt: string | null;
  travelerCount: number;
  govFee: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
  paidAt: string | null;
  deliveredAt: string | null;
  assigneeId: string | null;
  assigneeEmail?: string | null;
  locale?: string;
  createdAt: string;
  updatedAt: string;
};

export type Traveler = {
  id: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  sortOrder: number;
};

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  travelerId: string | null;
  kind: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: "uploaded" | "verified" | "rejected";
  rejectReason: string | null;
  createdAt: string;
};

export type ApplicationEvent = {
  id: string;
  applicationId: string;
  status: string | null;
  title: string;
  description: string | null;
  onTime: boolean;
  internal: boolean;
  createdAt: string;
};

export type Payment = {
  id: string;
  applicationId: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  transactionId: string | null;
  checkoutUrl: string | null;
  merchantOrderId: string | null;
  paymobOrderId: string | null;
};

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "user" | "admin";
};
