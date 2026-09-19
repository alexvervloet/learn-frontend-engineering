/** Shared fake data and a fake network delay, so the lessons stay about routing. */
export type Article = {
  id: string;
  slug: string;
  title: string;
  tag: string;
  body: string;
};

const ARTICLES: Article[] = [
  {
    id: "1",
    slug: "render-and-commit",
    title: "Render and commit",
    tag: "react",
    body: "A render is React calling your function. A commit is the DOM changing.",
  },
  {
    id: "2",
    slug: "keys-in-lists",
    title: "Keys in lists",
    tag: "react",
    body: "A key says which item in the new list is the same item as one in the old list.",
  },
  {
    id: "3",
    slug: "cascade-layers",
    title: "Cascade layers",
    tag: "css",
    body: "Layer order is resolved before specificity, and unlayered CSS beats every layer.",
  },
  {
    id: "4",
    slug: "container-queries",
    title: "Container queries",
    tag: "css",
    body: "A component asks how much room it was given, not how wide the window is.",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listArticles(tag?: string | null, signal?: AbortSignal): Promise<Article[]> {
  await sleep(120);
  if (signal?.aborted) throw new Error("aborted");
  return tag === undefined || tag === null || tag === ""
    ? ARTICLES
    : ARTICLES.filter((article) => article.tag === tag);
}

export async function getArticle(slug: string): Promise<Article | null> {
  await sleep(120);
  return ARTICLES.find((article) => article.slug === slug) ?? null;
}

export const TAGS = ["react", "css"] as const;
