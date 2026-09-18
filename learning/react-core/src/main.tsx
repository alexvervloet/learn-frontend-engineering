import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@lab/lesson-shell/styles.css";

import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) throw new Error("#root is missing from index.html");

// StrictMode is on deliberately. In development it renders every component
// twice and runs every effect twice (mount, unmount, mount) to surface
// components that are not pure and effects that do not clean up after
// themselves. Several lessons here only make sense with it on, and two of them
// look broken without it.
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
