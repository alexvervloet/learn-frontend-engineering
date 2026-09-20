import { CATEGORIES, type Filters } from "@/lib/catalogue";

/**
 * A plain GET form, and a Server Component.
 *
 * Submitting it puts the fields in the query string, which is exactly the
 * state the page reads. That is the whole mechanism: no handler, no router
 * call, no client JavaScript at all. It works before hydration and it works
 * without it.
 */
export function SearchForm({ filters }: { filters: Filters }) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className="flex flex-wrap items-end gap-3"
      data-testid="search-form"
    >
      <label className="text-sm">
        <span className="block">Find</span>
        <input
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="lamp, walnut, …"
          className="mt-1 rounded-lg px-3 py-2"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        />
      </label>

      <label className="text-sm">
        <span className="block">Category</span>
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          className="mt-1 rounded-lg px-3 py-2"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <option value="">Any</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="block">Sort by</span>
        <select
          name="sort"
          defaultValue={filters.sort ?? "name"}
          className="mt-1 rounded-lg px-3 py-2"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <option value="name">Name</option>
          <option value="price-asc">Price, low first</option>
          <option value="price-desc">Price, high first</option>
          <option value="rating">Rating</option>
        </select>
      </label>

      <button
        type="submit"
        className="rounded-lg px-4 py-2 font-medium"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        Search
      </button>
    </form>
  );
}
