import type { BookmarkWire, TagWire, UserWire } from "./types";

/**
 * The in-memory database behind the mock API.
 *
 * It exists so the app runs, and its tests pass, with no backend at all. The
 * handlers in `handlers.ts` implement the same routes the Express app does,
 * so pointing `VITE_API_PROXY` at a real server changes nothing in the app.
 */
const SEED_USER: UserWire = { id: 1, email: "ada@example.com", username: "ada" };

const SEED_TAGS: TagWire[] = [
  { id: 1, name: "react" },
  { id: 2, name: "css" },
  { id: 3, name: "testing" },
];

function seedBookmarks(): BookmarkWire[] {
  const at = (days: number) => new Date(Date.UTC(2026, 0, 20 - days)).toISOString();

  return [
    {
      id: 1,
      url: "https://react.dev/learn/you-might-not-need-an-effect",
      title: "You Might Not Need an Effect",
      description: "The single most useful page in the React docs.",
      favorite: true,
      click_count: 12,
      category_id: null,
      created_at: at(0),
      updated_at: at(0),
      tags: [SEED_TAGS[0] as TagWire],
    },
    {
      id: 2,
      url: "https://tanstack.com/query/latest",
      title: "TanStack Query",
      description: "Server state is not client state.",
      favorite: false,
      click_count: 4,
      category_id: null,
      created_at: at(1),
      updated_at: at(1),
      tags: [SEED_TAGS[0] as TagWire, SEED_TAGS[2] as TagWire],
    },
    {
      id: 3,
      url: "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade_layers",
      title: "Cascade layers",
      description: "Layer order is resolved before specificity.",
      favorite: false,
      click_count: 2,
      category_id: null,
      created_at: at(2),
      updated_at: at(2),
      tags: [SEED_TAGS[1] as TagWire],
    },
    {
      id: 4,
      url: "https://testing-library.com/docs/queries/about",
      title: "Which query should I use?",
      description: "The ranking is an accessibility argument.",
      favorite: true,
      click_count: 7,
      category_id: null,
      created_at: at(3),
      updated_at: at(3),
      tags: [SEED_TAGS[2] as TagWire],
    },
    {
      id: 5,
      url: "https://web.dev/articles/inp",
      title: "Interaction to Next Paint",
      description: "The metric that replaced first input delay.",
      favorite: false,
      click_count: 1,
      category_id: null,
      created_at: at(4),
      updated_at: at(4),
      tags: [],
    },
    {
      id: 6,
      url: "https://vitejs.dev/guide/",
      title: "Vite guide",
      description: null,
      favorite: false,
      click_count: 0,
      category_id: null,
      created_at: at(5),
      updated_at: at(5),
      tags: [],
    },
  ];
}

let bookmarks = seedBookmarks();
let tags = [...SEED_TAGS];
let nextBookmarkId = 7;
let nextTagId = 4;
let failNextWrite = false;

export const db = {
  user: (): UserWire => ({ ...SEED_USER }),

  tags: (): TagWire[] => tags.map((tag) => ({ ...tag })),

  all: (): BookmarkWire[] => structuredClone(bookmarks),

  find(id: number): BookmarkWire | undefined {
    return structuredClone(bookmarks.find((bookmark) => bookmark.id === id));
  },

  filter(options: { tag?: string | null; favorite?: boolean | null }): BookmarkWire[] {
    return structuredClone(
      bookmarks.filter((bookmark) => {
        if (options.tag != null && !bookmark.tags.some((tag) => tag.name === options.tag)) {
          return false;
        }
        if (options.favorite != null && bookmark.favorite !== options.favorite) return false;
        return true;
      }),
    );
  },

  create(input: {
    url: string;
    title: string;
    description: string | null;
    tags: string[];
  }): BookmarkWire {
    const now = new Date().toISOString();

    const attached = input.tags.map((name) => {
      const existing = tags.find((tag) => tag.name === name);
      if (existing !== undefined) return { ...existing };
      const created = { id: nextTagId++, name };
      tags = [...tags, created];
      return created;
    });

    const bookmark: BookmarkWire = {
      id: nextBookmarkId++,
      url: input.url,
      title: input.title,
      description: input.description,
      favorite: false,
      click_count: 0,
      category_id: null,
      created_at: now,
      updated_at: now,
      tags: attached,
    };

    bookmarks = [bookmark, ...bookmarks];
    return structuredClone(bookmark);
  },

  update(
    id: number,
    patch: Partial<Pick<BookmarkWire, "title" | "url" | "description" | "favorite">>,
  ) {
    const index = bookmarks.findIndex((bookmark) => bookmark.id === id);
    if (index === -1) return undefined;

    const current = bookmarks[index] as BookmarkWire;
    const updated: BookmarkWire = { ...current, ...patch, updated_at: new Date().toISOString() };
    bookmarks = bookmarks.map((bookmark, position) => (position === index ? updated : bookmark));

    return structuredClone(updated);
  },

  remove(id: number): boolean {
    const before = bookmarks.length;
    bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
    return bookmarks.length < before;
  },

  /** Set by a test, or by the demo, to make the next write fail once. */
  failNextWrite(shouldFail: boolean): void {
    failNextWrite = shouldFail;
  },

  takeFailure(): boolean {
    if (!failNextWrite) return false;
    failNextWrite = false;
    return true;
  },

  reset(): void {
    bookmarks = seedBookmarks();
    tags = [...SEED_TAGS];
    nextBookmarkId = 7;
    nextTagId = 4;
    failNextWrite = false;
  },
};
