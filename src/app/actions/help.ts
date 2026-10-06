"use server";

import { searchHelp } from "@/lib/data/catalog";

export async function searchHelpAction(query: string, locale = "en-EG") {
  const text = query.trim();
  if (text.length < 2) return { faqs: [], destinations: [] };
  return searchHelp(text, locale);
}
