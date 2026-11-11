export type VisaType = "e-visa" | "sticker" | "eta" | "visa-free";

// Admin Roles & Permissions
export type AdminRole = "super_admin" | "admin" | "manager" | "operator" | "support" | "viewer" | "user";

export type AdminPermissionAction = "view" | "create" | "edit" | "delete" | "assign" | "approve" | "refund" | "ban" | "change_role" | "publish" | "export" | "manage";

export type AdminResource = "applications" | "users" | "content" | "settings" | "reports" | "audit" | "staff";

export type AdminPermissions = {
  [key in AdminResource]: AdminPermissionAction[];
};

export type StaffProfile = {
  userId: string;
  department: string | null;
  specialty: string[];
  maxApplications: number;
  notes: string | null;
  active: boolean;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
  sourceUrl?: string | null;
  reviewedAt?: string | null;
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
  isSample?: boolean;
  verified?: boolean;
  source?: string | null;
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
  optionLabel: string | null;
  optionLabelAr: string | null;
  oldTotal: number;
  newTotal: number;
  reason: string | null;
  changedAt: string;
};

export type VisaDetails = {
  stay: string | null;
  stayAr: string | null;
  validity: string | null;
  validityAr: string | null;
  entry: string | null;
  entryAr: string | null;
  visaType: VisaType;
  method: string | null;
  methodAr: string | null;
  embassyVisit: boolean;
  processingHours: number | null;
  expressHours: number | null;
};

export type VisaOption = {
  id: string;
  destinationId: string;
  label: string;
  labelAr: string | null;
  visaType: VisaType;
  embassyVisit: boolean;
  method: string | null;
  methodAr: string | null;
  validity: string | null;
  validityAr: string | null;
  stay: string | null;
  stayAr: string | null;
  entry: string | null;
  entryAr: string | null;
  govFee: number;
  serviceFee: number;
  currency: string;
  processingHours: number | null;
  expressHours: number | null;
  expressFee: number | null;
  documents: string[] | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type VisaOptionInput = {
  id?: string | null;
  label: string;
  labelAr: string | null;
  visaType: VisaType;
  embassyVisit: boolean;
  method: string | null;
  methodAr: string | null;
  validity: string | null;
  validityAr: string | null;
  stay: string | null;
  stayAr: string | null;
  entry: string | null;
  entryAr: string | null;
  govFee: number;
  serviceFee: number;
  processingHours: number | null;
  expressHours: number | null;
  expressFee: number | null;
  documents: string[] | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  questions?: import("@/lib/visa-answers").QuestionInput[];
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

export type ApplicationStep = "travelers" | "documents" | "answers" | "review" | "payment" | "done";

export type Application = {
  id: string;
  reference: string;
  userId: string;
  userEmail?: string;
  destinationId: string;
  destinationName: string;
  destinationNameAr?: string | null;
  destinationCode?: string | null;
  destinationSlug: string;
  destinationFlag: string | null;
  destinationImage: string | null;
  documentsRequired: string[];
  visaOptionId: string | null;
  visaLabel: string | null;
  visaLabelAr: string | null;
  visaDetails: VisaDetails | null;
  status: ApplicationStatus;
  step: ApplicationStep;
  departureDate: string | null;
  express: boolean;
  guaranteedAt: string | null;
  travelerCount: number;
  govFee: number;
  serviceFee: number;
  discountAmount: number;
  couponCode: string | null;
  couponKind: "percent" | "fixed" | null;
  couponValue: number | null;
  couponAppliesTo: "service" | "total" | null;
  totalAmount: number;
  currency: string;
  paidAt: string | null;
  deliveredAt: string | null;
  assigneeId: string | null;
  assigneeEmail?: string | null;
  locale?: string;
  staffChecks: { passport: boolean; photo: boolean; documents: boolean };
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
  refundedAmount: number;
  receiptNo: string | null;
};

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: AdminRole;
};
