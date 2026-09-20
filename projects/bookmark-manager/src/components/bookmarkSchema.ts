import * as z from "zod";

/**
 * One schema, two jobs: the runtime check and the type the submit handler
 * receives. The server validates the same rules in
 * `src/api/handlers.ts`, because the client's copy is a courtesy to the
 * person typing and not the check.
 *
 * In its own file so the form component exports only a component, and so
 * these can be tested without rendering anything.
 */
export const BookmarkSchema = z.object({
  title: z.string().trim().min(2, "Give it a title of at least two characters"),
  url: z.url("Enter a full URL, starting with http:// or https://"),
  description: z.string().trim().max(280, "Keep the description under 280 characters"),
  // A comma-separated field in the UI, an array of names on the wire.
  tags: z.string().trim(),
});

export type BookmarkFormValues = z.infer<typeof BookmarkSchema>;

export function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0),
    ),
  ];
}
