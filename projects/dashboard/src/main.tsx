import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles.css";

import { App } from "./App";

const container = document.querySelector("#root");
if (container === null) throw new Error("#root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
