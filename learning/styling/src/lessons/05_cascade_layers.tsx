/**
 * Cascade layers
 * ==============
 * `@layer` adds a step to the cascade that runs *before* specificity. Within a
 * layer, specificity decides as usual. Between layers, the later layer wins
 * outright, and a selector with three classes in a low layer loses to a single
 * class in a high one.
 *
 *   @layer reset, components, utilities;
 *
 * That one line declares the order. Layers rank in the order they are first
 * named, so naming them all up front means nothing later can reorder them by
 * happening to load earlier. Without it, bundler output order decides your
 * cascade, and that changes when someone adds an import.
 *
 * **Unlayered CSS beats every layer.** This is the rule people get backwards. An
 * unlayered stylesheet is not "layer zero"; it sits above all of them. Which is
 * exactly why the trick below is worth knowing:
 *
 *   @import "some-library.css" layer(vendor);
 *
 * The library's CSS is now in a layer, and everything of yours that is
 * unlayered beats it, at any specificity, with no `!important` anywhere. That
 * single line replaces most of the specificity wars a design system gets into
 * with a component library.
 *
 * It is how this module loads Tailwind, too. `tailwind.css` imports the theme
 * and utilities into named layers and declares the order first, which is why a
 * Tailwind utility reliably beats the `.panel` component class regardless of
 * which file the bundler emitted first.
 *
 * **`!important` inverts everything.** Important declarations are resolved in
 * *reverse* layer order, so an `!important` in your lowest layer beats an
 * `!important` in your highest. That is deliberate, and it is deep enough water
 * that the practical advice is simply not to mix the two.
 *
 * jsdom does not implement layers, so the tests beside this file check the
 * declared order in the stylesheet rather than the computed colour. Watching
 * the weakest selector win is something to do in the browser, on this page.
 */
import "../layers.css";

export function CascadeLayers() {
  return (
    <div className="stack">
      <h3>The weakest selector wins</h3>

      <div className="demo-card demo-box demo-accent" data-testid="layered">
        <p style={{ margin: 0 }}>
          This element carries three classes:
          <br />
          <code>.demo-box.demo-box.demo-box</code> in <code>demo-reset</code> (specificity 0-3-0)
          <br />
          <code>.demo-card</code> in <code>demo-components</code> (0-1-0)
          <br />
          <code>.demo-accent</code> in <code>demo-utilities</code> (0-1-0)
        </p>
        <p style={{ marginBottom: 0 }}>
          The background comes from <code>.demo-accent</code>, the weakest of the three, because its
          layer is last.
        </p>
      </div>

      <h3>Unlayered beats everything</h3>
      <div className="demo-card demo-override" data-testid="unlayered">
        <code>.demo-override</code> is in no layer at all, so its outline wins without competing on
        specificity.
      </div>

      <p className="note">
        Open devtools and look at the Styles panel: the losing rules are struck through with their
        layer named. It is the clearest explanation of the cascade any tool has ever given.
      </p>
    </div>
  );
}
