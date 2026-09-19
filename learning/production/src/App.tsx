import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { EnvAndConfig } from "./lessons/01_env_and_config";
import { Security } from "./lessons/02_security";
import { AuthInTheBrowser } from "./lessons/03_auth_in_the_browser";
import { ErrorsAndMonitoring } from "./lessons/04_errors_and_monitoring";
import { FeatureFlags } from "./lessons/05_feature_flags";
import { Internationalisation } from "./lessons/06_i18n";
import { Shipping } from "./lessons/07_shipping";

const lessons = defineLessons([
  {
    id: "01-env-and-config",
    group: "Shipping it",
    title: "Environment configuration",
    summary: "VITE_ means public. A build cannot be promoted between environments.",
    file: "src/lessons/01_env_and_config.tsx",
    Component: EnvAndConfig,
  },
  {
    id: "02-security",
    group: "Keeping it safe",
    title: "XSS and CSP",
    summary: "React escapes text. The holes are dangerouslySetInnerHTML and a URL.",
    file: "src/lessons/02_security.tsx",
    Component: Security,
  },
  {
    id: "03-auth",
    group: "Keeping it safe",
    title: "Where a token can live",
    summary: "Four places, four trades, and one that XSS genuinely cannot read.",
    file: "src/lessons/03_auth_in_the_browser.tsx",
    Component: AuthInTheBrowser,
  },
  {
    id: "04-errors",
    group: "Knowing it works",
    title: "Errors and monitoring",
    summary: "A boundary catches less than you think. Scrub before sending.",
    file: "src/lessons/04_errors_and_monitoring.tsx",
    Component: ErrorsAndMonitoring,
  },
  {
    id: "05-feature-flags",
    group: "Knowing it works",
    title: "Feature flags",
    summary:
      "Deterministic buckets, a chosen default when the service is down, and a removal date.",
    file: "src/lessons/05_feature_flags.tsx",
    Component: FeatureFlags,
  },
  {
    id: "06-i18n",
    group: "Reaching everyone",
    title: "Internationalisation",
    summary: "Polish has four plural forms. Your ternary has two.",
    file: "src/lessons/06_i18n.tsx",
    Component: Internationalisation,
  },
  {
    id: "07-shipping",
    group: "Shipping it",
    title: "Docker and nginx",
    summary: "Two build stages, and the four nginx rules that are not optional.",
    file: "src/lessons/07_shipping.tsx",
    Component: Shipping,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Production"
      subtitle="Config, security, auth, monitoring, flags, i18n"
      lessons={lessons}
    />
  );
}
