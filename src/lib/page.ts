export type SearchParams = Record<string, string | string[] | undefined>;

export type Page<P extends Record<string, string> = { locale: string }> = {
  params: Promise<P>;
  searchParams: Promise<SearchParams>;
};

export type Layout<P extends Record<string, string> = { locale: string }> = {
  children: React.ReactNode;
  params: Promise<P>;
};
