import { useEffect, useState } from "react";

/**
 * Reports whether it has hydrated, so the tests can tell a rendered island
 * from a live one.
 *
 * A server-rendered island produces the "not hydrated" markup and then never
 * changes, because the effect only runs in the browser. That difference is
 * exactly what `client:visible` and `client:idle` are controlling.
 */
export function HydrationBadge({ name }: { name: string }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // The one pattern where "setState in an effect" is the whole point: the
    // component needs to know it is running in a browser, and the only way to
    // know that is that an effect ran. The same trick is the fix for a
    // hydration mismatch in the rendering-strategies module.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  return (
    <p data-testid={`badge-${name}`} data-hydrated={hydrated}>
      {name}: {hydrated ? "hydrated" : "server HTML only"}
    </p>
  );
}
