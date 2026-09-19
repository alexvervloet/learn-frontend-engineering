import i18next, { type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * A minimal i18next setup, with the two resource bundles the lesson compares.
 *
 * Polish is chosen deliberately: it has four plural categories (one, few,
 * many, other) where English has two. Any pluralisation written as
 * `count === 1 ? singular : plural` is wrong in Polish, Russian, Arabic,
 * Welsh and many others, and it is wrong in a way that never shows up in an
 * English-speaking team's testing.
 */
export const RESOURCES = {
  en: {
    translation: {
      greeting: "Hello, {{name}}",
      // i18next's suffixes follow the CLDR plural categories for the language.
      items_one: "{{count}} item",
      items_other: "{{count}} items",
      lastSeen: "Last seen {{when}}",
    },
  },
  pl: {
    translation: {
      greeting: "Cześć, {{name}}",
      items_one: "{{count}} produkt",
      items_few: "{{count}} produkty",
      items_many: "{{count}} produktów",
      items_other: "{{count}} produktu",
      lastSeen: "Ostatnio widziano {{when}}",
    },
  },
} as const;

export async function createI18n(language = "en"): Promise<I18n> {
  const instance = i18next.createInstance();

  await instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    resources: RESOURCES,
    interpolation: {
      // React already escapes everything it renders. Escaping again turns an
      // apostrophe into &#39; on screen.
      escapeValue: false,
    },
  });

  return instance;
}

/**
 * Dates, numbers and currency go through Intl, not through the translation
 * file. A translator should not be maintaining date formats, and Intl already
 * knows every locale's conventions.
 */
export function formatMoney(amount: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
}

export function formatRelative(seconds: number, locale: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }

  return formatter.format(Math.round(seconds), "second");
}

/** Languages written right to left. */
const RTL = new Set(["ar", "he", "fa", "ur"]);

export function direction(language: string): "ltr" | "rtl" {
  return RTL.has(language.split("-")[0] ?? "") ? "rtl" : "ltr";
}
