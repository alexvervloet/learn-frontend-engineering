import { Navigate, type RouteObject } from "react-router";

import { BookmarkDetail } from "./routes/BookmarkDetail";
import { BookmarkList } from "./routes/BookmarkList";
import { EditBookmark } from "./routes/EditBookmark";
import { NewBookmark } from "./routes/NewBookmark";
import { NotFound } from "./routes/NotFound";
import { Root } from "./routes/Root";

/**
 * One route table, used by the app and by every test.
 *
 * The app builds a browser router over it; tests build a memory router with
 * `initialEntries`. That way a test starts on any page with no mocking, and
 * the routes under test are the routes that ship.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <Navigate to="/bookmarks" replace /> },
      { path: "bookmarks", Component: BookmarkList },
      // `new` before `:id`, or "new" is matched as an id and the detail page
      // asks the API for bookmark NaN.
      { path: "bookmarks/new", Component: NewBookmark },
      { path: "bookmarks/:id", Component: BookmarkDetail },
      { path: "bookmarks/:id/edit", Component: EditBookmark },
      { path: "*", Component: NotFound },
    ],
  },
];
