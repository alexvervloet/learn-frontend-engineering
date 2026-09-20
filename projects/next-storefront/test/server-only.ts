/**
 * A stand-in for the real `server-only`, which throws when it is bundled
 * for a browser. That guard is the point of the package in the app; in a
 * Node test process there is nothing to guard against.
 */
export {};
