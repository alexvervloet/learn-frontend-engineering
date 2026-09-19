import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@lab/lesson-shell/styles.css";
// After the shell's stylesheet, so Tailwind's utilities layer is emitted last
// and its utilities win on equal specificity.
import "./tailwind.css";
// Semantic tokens last: they reference the primitives @theme declared.
import "./tokens.css";

import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) throw new Error("#root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
