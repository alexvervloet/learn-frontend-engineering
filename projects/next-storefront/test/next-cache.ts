/**
 * `cacheLife` is a compiler-level marker. Outside a Next build it has no
 * runtime to talk to, so it is a no-op here. The caching behaviour itself
 * is checked in the browser suite, against the build's route table.
 */
export function cacheLife(_profile: string): void {
  // Intentionally empty.
}

export function revalidatePath(_path: string, _type?: string): void {
  // Intentionally empty.
}
