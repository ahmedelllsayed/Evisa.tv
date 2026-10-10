export type AccountStats = {
  open: number;
  done: number;
  gaps: number;
  visas: number;
};

export type UserPaymentRow = {
  id: string;
  applicationId: string;
  reference: string;
  destinationName: string;
  destinationSlug: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  createdAt: string;
  merchantOrderId: string | null;
};

export type IssuedVisaRow = {
  id: string;
  applicationId: string;
  reference: string;
  destinationName: string;
  destinationSlug: string;
  fileName: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type UserFileRow = {
  id: string;
  applicationId: string;
  reference: string;
  destinationName: string;
  travelerName: string | null;
  kind: string;
  fileName: string;
  storagePath: string;
  status: "uploaded" | "verified" | "rejected";
  rejectReason: string | null;
  createdAt: string;
};

export type AccountNotification = {
  id: string;
  applicationId: string | null;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AccountProfileSummary = {
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};
