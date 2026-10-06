export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

/** Supabase Auth/Storage/Realtime are used when the public Supabase keys are present. */
export const supabaseEnabled = Boolean(env.supabaseUrl && env.supabaseAnonKey);
