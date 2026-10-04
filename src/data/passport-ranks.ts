export type PassportRank = {
  rank: number;
  name: string;
  region: "Europe" | "Asia" | "Americas" | "Africa" | "Oceania" | "Middle East";
  score: number;
  visaFree: number;
};

/** Public mobility ranking used to render the passport index layout. */
export const passportRanks: PassportRank[] = [
  { rank: 1, name: "United Arab Emirates", region: "Middle East", score: 182, visaFree: 137 },
  { rank: 2, name: "Singapore", region: "Asia", score: 175, visaFree: 138 },
  { rank: 2, name: "Spain", region: "Europe", score: 175, visaFree: 132 },
  { rank: 3, name: "Denmark", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "Finland", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "France", region: "Europe", score: 174, visaFree: 132 },
  { rank: 3, name: "Germany", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "Ireland", region: "Europe", score: 174, visaFree: 126 },
  { rank: 3, name: "Italy", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "Austria", region: "Europe", score: 174, visaFree: 129 },
  { rank: 3, name: "Belgium", region: "Europe", score: 174, visaFree: 132 },
  { rank: 3, name: "Luxembourg", region: "Europe", score: 174, visaFree: 132 },
  { rank: 3, name: "Netherlands", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "Norway", region: "Europe", score: 174, visaFree: 127 },
  { rank: 3, name: "Portugal", region: "Europe", score: 174, visaFree: 130 },
  { rank: 3, name: "Sweden", region: "Europe", score: 174, visaFree: 131 },
  { rank: 3, name: "Greece", region: "Europe", score: 174, visaFree: 130 },
  { rank: 3, name: "Switzerland", region: "Europe", score: 174, visaFree: 130 },
  { rank: 3, name: "Malaysia", region: "Asia", score: 174, visaFree: 129 },
  { rank: 4, name: "Japan", region: "Asia", score: 173, visaFree: 125 },
  { rank: 4, name: "South Korea", region: "Asia", score: 173, visaFree: 125 },
  { rank: 4, name: "Malta", region: "Europe", score: 173, visaFree: 132 },
  { rank: 4, name: "Poland", region: "Europe", score: 173, visaFree: 129 },
  { rank: 4, name: "Latvia", region: "Europe", score: 173, visaFree: 128 },
  { rank: 5, name: "Czechia", region: "Europe", score: 172, visaFree: 128 },
  { rank: 5, name: "Estonia", region: "Europe", score: 172, visaFree: 127 },
  { rank: 5, name: "Croatia", region: "Europe", score: 172, visaFree: 128 },
  { rank: 5, name: "Slovakia", region: "Europe", score: 172, visaFree: 128 },
  { rank: 5, name: "Slovenia", region: "Europe", score: 172, visaFree: 128 },
  { rank: 5, name: "Romania", region: "Europe", score: 172, visaFree: 129 },
];

export const passportRegions = ["All", "Europe", "Asia", "Americas", "Africa", "Oceania", "Middle East"] as const;
