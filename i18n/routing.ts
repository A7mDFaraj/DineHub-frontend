import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // All supported locales
  locales: ["ar", "en"],

  // Used when no locale matches (DineHub is Arabic-first)
  defaultLocale: "ar",

  // Omit the prefix for the default locale: '/' stays '/', English is '/en'
  localePrefix: "as-needed",

  // Do not automatically redirect based on browser headers to avoid unintended redirects
  localeDetection: false,
});
