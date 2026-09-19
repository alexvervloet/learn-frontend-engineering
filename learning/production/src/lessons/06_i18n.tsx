/**
 * Internationalisation
 * ====================
 * **Never build a sentence by concatenation.** `"Hello, " + name` and
 * `count + " items"` assume English word order and English grammar. Word
 * order differs, and so does everything about number agreement. Interpolate
 * into a whole sentence that a translator can rearrange:
 *
 *   t("greeting", { name })        "Hello, {{name}}"
 *
 * **Plural rules are not singular-or-plural.** English has two categories.
 * Polish has four (one, few, many, other), Arabic six, Japanese one. Any code
 * shaped like `count === 1 ? "item" : "items"` is wrong in most of the world,
 * and it is wrong invisibly: an English-speaking team never sees it.
 *
 * i18next uses the CLDR categories, so you provide `items_one`, `items_few`,
 * `items_many`, `items_other` for Polish and it picks. The demo shows 1, 2, 5
 * and 22 in both languages, and Polish uses three different forms.
 *
 * **Dates, numbers and currency go through `Intl`, not the translation
 * file.** A translator should not be maintaining date formats, and `Intl`
 * already knows that 1,234.56 is 1 234,56 in Polish and that currency symbols
 * move. `Intl.RelativeTimeFormat` gives you "yesterday" rather than "1 day
 * ago" with `numeric: "auto"`.
 *
 * **Right-to-left is a layout problem, not a text problem.** Set `dir` on
 * `<html>` and use CSS logical properties: `margin-inline-start` rather than
 * `margin-left`, `padding-block` rather than `padding-top`. Get that right
 * and Arabic mostly works; get it wrong and every margin is on the wrong
 * side.
 *
 * **Load languages lazily.** Shipping every translation to everyone is a
 * bundle that grows with each language you add. i18next's backend plugins
 * fetch a namespace on demand, and the language the user needs is knowable
 * from `navigator.language` before anything renders.
 *
 * **Leave room.** German runs 30% longer than English, and a button sized to
 * fit "Save" exactly will not fit "Speichern". Test with a long language, not
 * just with English.
 */
import { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { i18n as I18n } from "i18next";

import { createI18n, direction, formatDate, formatMoney, formatRelative } from "../lib/i18n";

const COUNTS = [1, 2, 5, 22];

function Inside() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  return (
    <div className="stack" dir={direction(locale)}>
      <div className="row">
        {["en", "pl"].map((language) => (
          <button
            key={language}
            onClick={() => void i18n.changeLanguage(language)}
            aria-pressed={locale === language}
          >
            {language}
          </button>
        ))}
      </div>

      <p data-testid="greeting">{t("greeting", { name: "Ada" })}</p>

      <h3>Plural categories</h3>
      <ul data-testid="plurals">
        {COUNTS.map((count) => (
          <li key={count}>
            <code>{count}</code> → {t("items", { count })}
          </li>
        ))}
      </ul>
      <p className="note">
        Switch to Polish. One, two, five and twenty-two use three different forms. A ternary on{" "}
        <code>count === 1</code> gets all but the first wrong.
      </p>

      <h3>Intl, not the translation file</h3>
      <ul data-testid="intl">
        <li>money: {formatMoney(1234.56, locale, locale === "pl" ? "PLN" : "GBP")}</li>
        <li>date: {formatDate(new Date("2026-03-14T00:00:00Z"), locale)}</li>
        <li>relative: {formatRelative(-86_400, locale)}</li>
      </ul>
    </div>
  );
}

export function Internationalisation() {
  const [instance, setInstance] = useState<I18n | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createI18n("en").then((created) => {
      if (!cancelled) setInstance(created);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (instance === null) return <p>loading translations…</p>;

  return (
    <I18nextProvider i18n={instance}>
      <Inside />
    </I18nextProvider>
  );
}
