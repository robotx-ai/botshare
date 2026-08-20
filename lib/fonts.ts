import { Barlow_Condensed } from "next/font/google";

/**
 * Single shared display face. Importing `next/font/google` once instead of
 * per-component keeps one font instance across the app (and one build-time
 * fetch of the Google Fonts asset, which is the flaky step in Netlify CI).
 */
export const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});
