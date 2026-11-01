import * as Sentry from "@sentry/nextjs";
import { sentrySharedOptions } from "@/lib/sentry-shared";

Sentry.init({
  ...sentrySharedOptions(),
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ["evisa"],
      behaviour: "drop-error-if-exclusively-contains-third-party-frames",
    }),
  ],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
