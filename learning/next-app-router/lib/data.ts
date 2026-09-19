/**
 * Stands in for a database. Every function here runs on the server only, and
 * the point of the module is that nothing needs to change for that to be true:
 * a Server Component simply imports it and calls it.
 *
 * In a real app this is where a database client, an API key or a secret would
 * live. None of it reaches the browser, and that is enforced by the bundler
 * rather than by convention.
 */
export type Product = {
  slug: string;
  name: string;
  price: number;
  description: string;
  stock: number;
};

const PRODUCTS: Product[] = [
  {
    slug: "keyboard",
    name: "Mechanical keyboard",
    price: 80,
    description: "Clicky, heavy, and louder than your colleagues would like.",
    stock: 12,
  },
  {
    slug: "mouse",
    name: "Trackball mouse",
    price: 40,
    description: "Takes a week to get used to and then you cannot go back.",
    stock: 3,
  },
  {
    slug: "monitor",
    name: "Ultrawide monitor",
    price: 260,
    description: "Two windows side by side, forever.",
    stock: 0,
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listProducts(): Promise<Product[]> {
  await sleep(60);
  return structuredClone(PRODUCTS);
}

export async function getProduct(slug: string): Promise<Product | null> {
  await sleep(60);
  return structuredClone(PRODUCTS.find((product) => product.slug === slug) ?? null);
}

/** Deliberately slow, so the streaming lesson has something to wait for. */
export async function getReviews(slug: string): Promise<string[]> {
  await sleep(700);
  return [`A review of the ${slug}.`, `Another review of the ${slug}.`];
}

const reviewsAdded = new Map<string, string[]>();

export async function addReview(slug: string, text: string): Promise<void> {
  await sleep(120);
  reviewsAdded.set(slug, [...(reviewsAdded.get(slug) ?? []), text]);
}

export function addedReviews(slug: string): string[] {
  return reviewsAdded.get(slug) ?? [];
}

export function resetReviews(): void {
  reviewsAdded.clear();
}
