import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";

import { BookmarkSchema, parseTags, type BookmarkFormValues } from "./bookmarkSchema";
import { Button } from "./Ui";

export type BookmarkFormProps = {
  defaultValues?: Partial<BookmarkFormValues>;
  submitLabel: string;
  serverError?: string | null;
  onSubmit: (values: {
    url: string;
    title: string;
    description: string | null;
    tags: string[];
  }) => void;
  isSubmitting: boolean;
};

export function BookmarkForm({
  defaultValues,
  submitLabel,
  serverError,
  onSubmit,
  isSubmitting,
}: BookmarkFormProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const ids = { title: useId(), url: useId(), description: useId(), tags: useId() };

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<BookmarkFormValues>({
    resolver: zodResolver(BookmarkSchema),
    defaultValues: { title: "", url: "", description: "", tags: "", ...defaultValues },
  });

  type Problem = { field: string; message: string; id: string };

  const problems: Problem[] = [
    { field: "title", message: errors.title?.message, id: ids.title },
    { field: "url", message: errors.url?.message, id: ids.url },
    { field: "description", message: errors.description?.message, id: ids.description },
  ].filter((entry): entry is Problem => typeof entry.message === "string");

  const hasSummary = problems.length > 0 || (serverError ?? null) !== null;

  /**
   * Focus the summary once it exists.
   *
   * Two things make this harder than it looks, and both produce the same
   * silent failure: the errors appear, focus stays on the button, and a
   * keyboard user is told nothing.
   *
   * `handleSubmit`'s error callback runs *before* React re-renders, so the
   * summary does not exist yet and `summaryRef.current?.focus()` is a no-op.
   * That rules out the obvious place.
   *
   * And `submitCount` alone is not enough either, because the resolver is
   * async: `submitCount` increments one render before Zod's errors land, so
   * an effect keyed only on it runs while the summary still is not there.
   * `hasSummary` is what makes it fire on the render that creates it. The
   * forms module's version gets away with `submitCount` because its
   * validation is synchronous.
   */
  useEffect(() => {
    if (submitCount === 0 || !hasSummary) return;
    summaryRef.current?.focus();
  }, [submitCount, hasSummary]);

  function describedBy(field: keyof typeof ids, hasHint = false): string | undefined {
    const parts = [
      hasHint ? `${ids[field]}-hint` : null,
      errors[field as keyof BookmarkFormValues] ? `${ids[field]}-error` : null,
    ].filter((part): part is string => part !== null);

    // Built from what is rendered: a dangling id makes some screen readers
    // read nothing at all.
    return parts.length === 0 ? undefined : parts.join(" ");
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) =>
        onSubmit({
          url: values.url,
          title: values.title,
          description: values.description === "" ? null : values.description,
          tags: parseTags(values.tags),
        }),
      )}
    >
      {hasSummary && (
        <div
          ref={summaryRef}
          role="alert"
          tabIndex={-1}
          data-testid="form-errors"
          className="rounded-xl border-2 border-red-500 p-4"
        >
          <h2 className="font-semibold">
            {serverError != null
              ? "The server rejected it"
              : problems.length === 1
                ? "There is 1 problem"
                : `There are ${problems.length} problems`}
          </h2>
          {serverError != null && <p className="mt-1 text-sm">{serverError}</p>}
          {problems.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {problems.map((problem) => (
                <li key={problem.field}>
                  {/* A link per problem, straight to the field. The GOV.UK
                      pattern, and the best-tested error UI there is. */}
                  <a className="underline" href={`#${problem.id}`}>
                    {problem.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor={ids.title} className="block text-sm font-medium">
          Title
        </label>
        <input
          id={ids.title}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy("title")}
          {...register("title")}
        />
        {errors.title && (
          <p id={`${ids.title}-error`} className="text-sm text-red-600">
            ✕ {errors.title.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={ids.url} className="block text-sm font-medium">
          URL
        </label>
        <input
          id={ids.url}
          inputMode="url"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
          aria-invalid={errors.url ? true : undefined}
          aria-describedby={describedBy("url")}
          {...register("url")}
        />
        {errors.url && (
          <p id={`${ids.url}-error`} className="text-sm text-red-600">
            ✕ {errors.url.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={ids.description} className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id={ids.description}
          rows={3}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describedBy("description")}
          {...register("description")}
        />
        {errors.description && (
          <p id={`${ids.description}-error`} className="text-sm text-red-600">
            ✕ {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor={ids.tags} className="block text-sm font-medium">
          Tags
        </label>
        <p id={`${ids.tags}-hint`} className="text-sm text-[var(--text-muted)]">
          Separated by commas.
        </p>
        <input
          id={ids.tags}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
          aria-describedby={`${ids.tags}-hint`}
          {...register("tags")}
        />
      </div>

      <Button type="submit" tone="primary" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
