/**
 * CSS modules
 * ===========
 * Name a file `something.module.css` and the bundler rewrites every class name
 * in it to something unique, then gives you an object mapping the names you
 * wrote to the names that shipped:
 *
 *   import styles from "./card.module.css";
 *   styles.card    // "_card_1f3a9"
 *
 * That is the entire feature, and it solves the only genuinely hard problem in
 * plain CSS: two files, written months apart, both defining `.title`. Here they
 * both do, and neither wins, because neither is called `title` by the time the
 * browser sees it.
 *
 * **`composes` is not `@extend`.** It copies the class *reference*, so the
 * element gets two class names rather than a copy of the declarations:
 *
 *   <div class="_base_8c21 _card_1f3a9">
 *
 * No duplicated rules in the output, and specificity stays flat, which is the
 * thing Sass's `@extend` got wrong. It only works inside a module, and only at
 * the top of a rule.
 *
 * **What you give up.** No co-location with the markup, so a small component is
 * two files. No way to compute a class from a prop without string concatenation
 * or a lookup object. And the class names in devtools are hashed, which is
 * mildly annoying until you turn on readable names in development.
 *
 * **When to reach for it.** When the CSS is genuinely component-specific and
 * you want plain CSS rather than a utility vocabulary: a layout, a bit of
 * `grid-template-areas`, an animation. It composes perfectly well with
 * Tailwind, and a codebase using both for different jobs is not confused, it is
 * being sensible.
 *
 * Vitest ignores CSS by default, so an import like the one above yields `{}` and
 * `styles.card` is `undefined` with no error. This module's vitest.config.ts
 * turns processing on for `.module.css`, which is what lets the test below tell
 * a real class name from a typo.
 */
import bannerStyles from "./01_banner.module.css";
import cardStyles from "./01_card.module.css";

export function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className={cardStyles.card} data-testid="card">
      <h4 className={cardStyles.title}>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

export function Warning({ title, body }: { title: string; body: string }) {
  return (
    <div className={cardStyles.warning} data-testid="warning">
      <h4 className={cardStyles.title}>{title}</h4>
      <p>{body}</p>
    </div>
  );
}

export function Banner({ children }: { children: string }) {
  // A different module's `.title`. Same name in the source, different name in
  // the output.
  return (
    <p className={bannerStyles.title} data-testid="banner">
      {children}
    </p>
  );
}

export const classNames = {
  cardTitle: cardStyles.title,
  bannerTitle: bannerStyles.title,
  card: cardStyles.card,
  warning: cardStyles.warning,
};

export function CssModules() {
  return (
    <div className="stack">
      <Banner>A banner, whose .title is small and uppercase</Banner>

      <Card title="A card" body="Its .title is a normal heading. Same name, different file." />
      <Warning title="A warning" body="Composes the same base, with its own background." />

      <p className="note">
        Inspect the two headings. Both were written as <code>.title</code>; neither is called that
        now. The warning carries two classes, because <code>composes</code> adds a reference rather
        than copying declarations.
      </p>
    </div>
  );
}
