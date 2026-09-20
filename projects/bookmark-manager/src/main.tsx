import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) throw new Error("#root is missing from index.html");

/**
 * With no backend running, the Service Worker answers instead, so `npm run
 * dev` works on its own. Point `VITE_API_PROXY` at a running
 * Practice-Backends bookmark-manager and set `VITE_USE_MOCK=false` to talk to
 * the real thing.
 *
 * The app is rendered *after* the worker starts. Render first and the initial
 * queries race the Service Worker registration, and lose about half the time.
 */
async function start(): Promise<void> {
  if (import.meta.env["VITE_USE_MOCK"] !== "false") {
    const { worker } = await import("./api/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }

  createRoot(container!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
