# Google Analytics 4

The root route mounts `src/components/analytics/GoogleAnalytics.tsx` once.
The default measurement ID is `G-QRGEK14KFY`; override it at build time with
`VITE_GA4_MEASUREMENT_ID`. The tag runs only in production builds, loads
asynchronously, and guards against duplicate initialization on remount.

Page views use GA4 automatic measurement, not custom router events. In GA4,
open Admin > Data streams > Web > Enhanced measurement > Page views >
Show advanced settings and enable Page loads and Page changes based on
browser history events. Do not install a second GA4 tag through GTM.

After deployment, use Tag Assistant / GA4 DebugView to check the initial
page view and one page view per navigation, including browser back/forward.
The integration has not yet been verified against live GA4 collection.

Reference: https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
