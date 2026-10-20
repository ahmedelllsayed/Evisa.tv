import "server-only";

export function reservationKeys() {
  return {
    rapidapi: process.env.RAPIDAPI_KEY?.trim() || "",
    gemini: process.env.GEMINI_API_KEY?.trim() || "",
  };
}
