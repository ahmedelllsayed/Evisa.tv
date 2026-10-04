export const profileDocumentKinds = ["passport", "photo", "bank_statements", "income_tax_returns", "us_uk_schengen_visa"] as const;

export type ProfileDocument = {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storagePath: string;
};

export type ProfileVault = {
  firstName: string;
  lastName: string;
  sex: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  phone: string;
  documents: ProfileDocument[];
};
