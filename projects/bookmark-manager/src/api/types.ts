/**
 * The API contract, transcribed from the Express app in Practice-Backends
 * (`backends/bookmark-manager/app/schemas/serializers.ts`).
 *
 * Note the snake_case: that is what the server sends, and this file is the
 * only place in the app that says so. Everything past `src/api/client.ts`
 * works in the camelCase shapes below, so a change to the wire format is one
 * file to edit rather than a search across components.
 */
export type TagWire = { id: number; name: string };

export type BookmarkWire = {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favorite: boolean;
  click_count: number;
  category_id: number | null;
  created_at: string;
  updated_at: string;
  tags: TagWire[];
};

export type TokenWire = { access_token: string; token_type: string };

export type UserWire = { id: number; email: string; username: string };

/** What the rest of the app works in. */
export type Tag = { id: number; name: string };

export type Bookmark = {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favorite: boolean;
  clickCount: number;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
};

export type User = { id: number; email: string; username: string };

export function toBookmark(wire: BookmarkWire): Bookmark {
  return {
    id: wire.id,
    url: wire.url,
    title: wire.title,
    description: wire.description,
    favorite: wire.favorite,
    clickCount: wire.click_count,
    categoryId: wire.category_id,
    createdAt: wire.created_at,
    updatedAt: wire.updated_at,
    tags: wire.tags.map((tag) => ({ id: tag.id, name: tag.name })),
  };
}

export type BookmarkFilters = {
  tag: string | null;
  favorite: boolean | null;
  page: number;
};

export const PAGE_SIZE = 5;
