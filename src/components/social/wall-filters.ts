export type WallFilters = {
  rating: "all" | "5" | "4" | "3";
  visa: string;
  verified: boolean;
  lang: "all" | "ar" | "en";
  sort: "newest" | "top";
  examples: boolean;
};

export const defaultWallFilters: WallFilters = { rating: "all", visa: "all", verified: false, lang: "all", sort: "newest", examples: true };
