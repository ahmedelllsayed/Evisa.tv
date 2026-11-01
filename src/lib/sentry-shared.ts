/** Shared Sentry options. Reporting stays off until NEXT_PUBLIC_SENTRY_DSN is set. */
export function sentrySharedOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  };
}
