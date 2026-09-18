import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@lab/lesson-shell/styles.css";

import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) throw new Error("#root is missing from index.html");

/**
 * The mock network has to be running before the first request, so the app is
 * rendered after `worker.start()` resolves rather than alongside it. Render
 * first and the initial queries race the Service Worker registration, and lose
 * about half the time.
 *
 * `onUnhandledRequest: "bypass"` here, unlike the tests, where it is "error".
 * In the browser the worker also sees Vite's own module and asset requests, and
 * failing on those would make the page unusable.
 */
async function start(): Promise<void> {
  const { worker } = await import("./api/browser");
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });

  createRoot(container!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
