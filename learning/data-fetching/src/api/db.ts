/**
 * The data the fake API serves. Module state, reset between tests, so no test
 * depends on the order the others ran in.
 */
export type Bookmark = {
  id: string;
  title: string;
  url: string;
  tag: string;
  votes: number;
};

const SEED: Bookmark[] = [
  { id: "1", title: "Rules of React", url: "https://react.dev", tag: "react", votes: 12 },
  {
    id: "2",
    title: "You Might Not Need an Effect",
    url: "https://react.dev",
    tag: "react",
    votes: 30,
  },
  { id: "3", title: "TanStack Query docs", url: "https://tanstack.com", tag: "data", votes: 21 },
  { id: "4", title: "MDN: fetch", url: "https://developer.mozilla.org", tag: "platform", votes: 8 },
  { id: "5", title: "Web Vitals", url: "https://web.dev", tag: "performance", votes: 15 },
  { id: "6", title: "MSW docs", url: "https://mswjs.io", tag: "testing", votes: 9 },
  {
    id: "7",
    title: "Testing Library",
    url: "https://testing-library.com",
    tag: "testing",
    votes: 25,
  },
];

let bookmarks: Bookmark[] = structuredClone(SEED);
let nextId = SEED.length + 1;

/** Set by a lesson to make the next write fail, so rollback can be shown. */
let failNextWrite = false;

export const db = {
  all(): Bookmark[] {
    return structuredClone(bookmarks);
  },

  byTag(tag: string | null): Bookmark[] {
    const all = this.all();
    return tag === null || tag === "" ? all : all.filter((item) => item.tag === tag);
  },

  page(offset: number, limit: number): { items: Bookmark[]; total: number } {
    return { items: this.all().slice(offset, offset + limit), total: bookmarks.length };
  },

  add(title: string, url: string, tag: string): Bookmark {
    const created: Bookmark = { id: String(nextId++), title, url, tag, votes: 0 };
    bookmarks = [...bookmarks, created];
    return structuredClone(created);
  },

  vote(id: string): Bookmark | null {
    const found = bookmarks.find((item) => item.id === id);
    if (found === undefined) return null;
    found.votes += 1;
    return structuredClone(found);
  },

  failNextWrite(shouldFail: boolean): void {
    failNextWrite = shouldFail;
  },

  takeFailure(): boolean {
    if (!failNextWrite) return false;
    failNextWrite = false;
    return true;
  },

  reset(): void {
    bookmarks = structuredClone(SEED);
    nextId = SEED.length + 1;
    failNextWrite = false;
  },
};
