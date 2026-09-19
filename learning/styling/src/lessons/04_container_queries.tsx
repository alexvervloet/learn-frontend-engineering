/**
 * Container queries, and the ResizeObserver you no longer need
 * ============================================================
 * A media query asks about the viewport. That is the wrong question almost
 * every time: a card does not care how wide the window is, it cares how much
 * room *it* has been given. The same card in a sidebar and in a main column
 * wants two different layouts at one viewport width, and a media query cannot
 * express that.
 *
 *   .card-host { container-type: inline-size; }
 *   @container (min-width: 22rem) { .card { flex-direction: row; } }
 *
 * `container-type: inline-size` says "measure my width and let descendants ask
 * about it". The element becomes a containment context, and `@container` rules
 * inside it resolve against its width rather than the viewport's.
 *
 * In Tailwind 4 this is built in, with no plugin:
 *
 *   <div class="@container">
 *     <div class="flex flex-col @md:flex-row">
 *
 * `@md` is a named container size from the theme, so `--container-card: 22rem`
 * in `@theme` gives you `@card:` as a variant.
 *
 * **What people did before.** Measure the element with a `ResizeObserver`, put
 * the width in state, and branch in the render. The demo runs both so you can
 * compare. The JS version costs a subscription per card, a state update and a
 * re-render per resize, and it renders the wrong layout for one frame on first
 * paint because the measurement only exists after the commit. The CSS version
 * costs nothing and is right on the first frame.
 *
 * Keep the ResizeObserver only when JavaScript genuinely needs the number:
 * virtualising a list, sizing a canvas, deciding how many items fit. Layout is
 * not one of those.
 *
 * **Two things that catch people out.** A container cannot query itself, so the
 * `@container` element and the element that responds to it must be different
 * elements. And `container-type: inline-size` applies size containment on the
 * inline axis, which means the container no longer sizes itself from its
 * contents in that direction.
 */
import { useEffect, useRef, useState } from "react";

export type Layout = "stacked" | "side-by-side";

/** The branch the JS version has to make by hand. The CSS version needs none of this. */
export function layoutFor(width: number): Layout {
  return width >= 352 ? "side-by-side" : "stacked";
}

function CssCard({ title }: { title: string }) {
  return (
    // @container turns this into a containment context. The child queries it.
    <div className="@container" data-testid="css-host">
      <div
        className="flex flex-col @md:flex-row gap-gutter rounded-lg border border-brand-200 p-gutter"
        data-testid="css-card"
      >
        <div className="rounded bg-brand-100 p-4 text-sm">thumbnail</div>
        <div>
          <strong>{title}</strong>
          <p className="text-sm">
            Stacked when this card is narrow, side by side when it is wide. The window is not
            involved.
          </p>
        </div>
      </div>
    </div>
  );
}

function ObservedCard({ title }: { title: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(entry.contentRect.width);
    });
    observer.observe(host);

    return () => observer.disconnect();
  }, []);

  // null on the first render, because the element has not been measured yet.
  // That is the frame of wrong layout the CSS version does not have.
  const layout = width === null ? "stacked" : layoutFor(width);

  return (
    <div ref={hostRef} data-testid="observed-host">
      <div
        data-testid="observed-card"
        data-layout={layout}
        style={{
          display: "flex",
          flexDirection: layout === "side-by-side" ? "row" : "column",
          gap: "var(--spacing-gutter)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "0.625rem",
          padding: "var(--spacing-gutter)",
        }}
      >
        <div style={{ background: "var(--surface-sunken)", padding: "1rem", borderRadius: "5px" }}>
          thumbnail
        </div>
        <div>
          <strong>{title}</strong>
          <p className="text-sm">
            Same result, via a subscription, a state update and a re-render per resize.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContainerQueries() {
  const [width, setWidth] = useState(480);

  return (
    <div className="stack">
      <label className="row">
        Container width: {width}px
        <input
          type="range"
          min={220}
          max={640}
          value={width}
          aria-label="Container width"
          onChange={(event) => setWidth(Number(event.target.value))}
        />
      </label>

      <div style={{ width, maxWidth: "100%", display: "grid", gap: "1rem" }}>
        <CssCard title="Container query" />
        <ObservedCard title="ResizeObserver" />
      </div>

      <p className="note">
        Drag the slider. Both flip at the same point; only one of them runs any JavaScript to do it.
        Narrow the browser window instead and neither changes, which is the difference from a media
        query.
      </p>
    </div>
  );
}
