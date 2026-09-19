import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";
import type { i18n as I18n } from "i18next";

import { createI18n, direction, formatMoney, formatRelative } from "../lib/i18n";
import { Internationalisation } from "./06_i18n";

let i18n: I18n;

beforeAll(async () => {
  i18n = await createI18n("en");
});

describe("plural categories", () => {
  it("uses two forms in English", async () => {
    await i18n.changeLanguage("en");

    expect(i18n.t("items", { count: 1 })).toBe("1 item");
    expect(i18n.t("items", { count: 2 })).toBe("2 items");
    expect(i18n.t("items", { count: 5 })).toBe("5 items");
  });

  it("uses three in Polish, which a ternary cannot express", async () => {
    await i18n.changeLanguage("pl");

    // The exact bug in `count === 1 ? singular : plural`: everything past the
    // first is wrong, and an English-speaking team never sees it.
    expect(i18n.t("items", { count: 1 })).toBe("1 produkt");
    expect(i18n.t("items", { count: 2 })).toBe("2 produkty");
    expect(i18n.t("items", { count: 5 })).toBe("5 produktów");
    expect(i18n.t("items", { count: 22 })).toBe("22 produkty");
  });

  it("agrees with the browser's own plural rules", () => {
    // i18next is not inventing these. They are CLDR, and Intl knows them too.
    const polish = new Intl.PluralRules("pl");

    expect(polish.select(1)).toBe("one");
    expect(polish.select(2)).toBe("few");
    expect(polish.select(5)).toBe("many");
    expect(new Intl.PluralRules("en").select(5)).toBe("other");
  });
});

describe("interpolation", () => {
  it("puts the value into a whole sentence", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("greeting", { name: "Ada" })).toBe("Hello, Ada");

    await i18n.changeLanguage("pl");
    // A different sentence, not a translated fragment glued to a name.
    expect(i18n.t("greeting", { name: "Ada" })).toBe("Cześć, Ada");
  });

  it("does not double-escape, because React already escapes", async () => {
    await i18n.changeLanguage("en");

    // With escapeValue on, this renders as Ada&#39;s on screen.
    expect(i18n.t("greeting", { name: "Ada's" })).toBe("Hello, Ada's");
  });
});

describe("Intl rather than the translation file", () => {
  it("formats currency per locale", () => {
    const british = formatMoney(1234.56, "en-GB", "GBP");
    const polish = formatMoney(1234.56, "pl", "PLN");

    // The decimal separator and the symbol's position both differ, and
    // neither should be written by hand anywhere in an app.
    expect(british).toBe("£1,234.56");
    expect(polish).toMatch(/1234,56/);
    expect(polish.trimEnd().endsWith("zł")).toBe(true);

    // Deliberately not asserting Polish's thousands separator. CLDR says a
    // narrow no-break space, and what you actually get depends on the ICU
    // data the runtime was built with: this Node prints no grouping at all.
    // Worth knowing before a snapshot of formatted output fails only on CI.
  });

  it("says yesterday rather than 1 day ago", () => {
    expect(formatRelative(-86_400, "en")).toBe("yesterday");
    expect(formatRelative(-3600, "en")).toBe("1 hour ago");
  });
});

describe("direction", () => {
  it("knows which languages are right to left", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("he-IL")).toBe("rtl");
    expect(direction("en")).toBe("ltr");
    expect(direction("pl")).toBe("ltr");
  });
});

describe("the lesson", () => {
  it("switches language and repluralises", async () => {
    render(<Internationalisation />);
    await screen.findByTestId("greeting");

    expect(screen.getByTestId("greeting")).toHaveTextContent("Hello, Ada");

    await userEvent.click(screen.getByRole("button", { name: "pl" }));

    expect(screen.getByTestId("greeting")).toHaveTextContent("Cześć, Ada");
    const plurals = within(screen.getByTestId("plurals")).getAllByRole("listitem");
    expect(plurals[2]).toHaveTextContent("5 produktów");
  });
});
