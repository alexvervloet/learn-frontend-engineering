/**
 * Every lesson in this module is a pair: some metadata, and a `mount` that is
 * handed an empty element and returns its own cleanup.
 *
 * That shape is not arbitrary. It is the smallest honest version of what a
 * component is: something that puts nodes into the document and knows how to
 * take them out again. React's job is to run thousands of these for you and get
 * the ordering right. Writing four by hand makes the rest of the repo make more
 * sense.
 */
export type Lesson = {
  id: string;
  title: string;
  summary: string;
  file: string;
  /** Returns a teardown function. Forgetting to detach listeners here is the leak. */
  mount: (root: HTMLElement) => () => void;
};

/**
 * `querySelector` that throws instead of returning `null`.
 *
 * Every `mount` writes its own markup a few lines earlier, so a miss here means
 * the markup and the selector disagree, which is a bug in the lesson and not
 * something to handle. Throwing also keeps the non-null type, which matters:
 * TypeScript does not always carry an `if (!el) throw` narrowing into the
 * closures that follow, so the alternative is a `!` on every single use.
 */
export function must<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (found === null) throw new Error(`no element matches ${selector}`);
  return found;
}
