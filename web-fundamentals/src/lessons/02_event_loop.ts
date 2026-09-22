/**
 * The event loop, microtasks, and why your UI freezes
 * ==================================================
 * JavaScript runs on one thread. Everything you do competes with painting.
 *
 * Three of the four things below are ordered by the spec. The fourth is the
 * one people get wrong, so it is worth separating them.
 *
 * **Guaranteed, always, everywhere:**
 *
 *   1. synchronous code    runs to completion first
 *   2. microtasks          promise callbacks, queueMicrotask
 *   3. macrotasks          setTimeout, even with 0ms
 *
 * The microtask queue is drained *completely* between macrotasks, and a
 * microtask that queues another microtask gets drained in the same pass. An
 * infinite chain of promises therefore starves the browser forever, while an
 * infinite chain of setTimeout(0) does not. `recordOrder` below asserts this
 * part, because it is assertable.
 *
 * **Not guaranteed: where requestAnimationFrame falls.**
 *
 * rAF is often taught as step three, between the microtasks and the timers.
 * It is not. rAF callbacks run in the "update the rendering" step, which the
 * browser performs when it decides to produce a frame, and a timer is an
 * ordinary task that runs whenever the task queue is next serviced. Queue
 * both at the same moment in Chrome and the timer almost always wins, because
 * it is due in about a millisecond and the next frame is up to sixteen away:
 *
 *   sync -> microtask -> setTimeout 0 -> rAF
 *
 * Almost always, not always. On a busy frame, in a background tab, at a
 * different refresh rate, or behind a timer the browser has clamped, it can
 * go the other way. `recordWithFrame` demonstrates the usual result and the
 * test asserts only what holds: that rAF lands after the synchronous code and
 * the microtasks. Anything stronger is a test that passes on your laptop.
 *
 * The practical version: rAF is not "a faster setTimeout" and not a queue you
 * can order work in. It is "just before the browser paints", which is the only
 * property worth relying on, and the only reason to use it.
 *
 * Why this matters in React: state updates are batched and flushed inside this
 * machinery. "Why is my state still the old value on the next line" is a
 * question about this diagram. So is every dropped frame: a synchronous 200ms
 * loop is 200ms of no painting, no scrolling and no clicking.
 *
 * And that last one has exactly one real fix, which is lesson 05. Chunking the
 * work with timers hands the thread back often enough to paint, which helps.
 * Moving the work to a worker takes it off this thread altogether, which is
 * the only thing that actually solves it.
 */
import { must, type Lesson } from "../types";

export type Tick = string;

/**
 * Records the order the three guaranteed queues fire in. Exported separately
 * from the DOM so the test can assert the order without a browser.
 */
export function recordOrder(): Promise<Tick[]> {
  const ticks: Tick[] = [];

  return new Promise((resolve) => {
    setTimeout(() => {
      ticks.push("macrotask: setTimeout 0");
      // By the time this runs, everything faster has already been drained.
      resolve(ticks);
    }, 0);

    queueMicrotask(() => ticks.push("microtask: queueMicrotask"));

    Promise.resolve().then(() => {
      ticks.push("microtask: promise.then");
      // Queued from inside a microtask, so it still runs before any macrotask.
      queueMicrotask(() => ticks.push("microtask: queued from a microtask"));
    });

    ticks.push("sync: end of the function body");
  });
}

/**
 * The same race with a frame in it, for the claim that cannot be pinned down.
 *
 * Resolves once all four have fired, however they ordered themselves, so the
 * caller can look at what actually happened rather than at what the diagram
 * says. In jsdom there is no frame loop at all, which is why the test for this
 * asserts a partial order and the browser demo prints the whole thing.
 */
export function recordWithFrame(): Promise<Tick[]> {
  const ticks: Tick[] = [];

  return new Promise((resolve) => {
    let remaining = 2;
    const settle = (): void => {
      remaining -= 1;
      if (remaining === 0) resolve(ticks);
    };

    setTimeout(() => {
      ticks.push("macrotask: setTimeout 0");
      settle();
    }, 0);

    requestAnimationFrame(() => {
      ticks.push("frame: requestAnimationFrame");
      settle();
    });

    queueMicrotask(() => ticks.push("microtask: queueMicrotask"));

    ticks.push("sync: end of the function body");
  });
}

/** Burns the main thread for real. This is what a dropped frame is made of. */
function blockFor(ms: number): void {
  const until = performance.now() + ms;
  while (performance.now() < until) {
    /* deliberately spinning */
  }
}

export function mountEventLoop(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      <div class="row">
        <button id="order">Show the ordering</button>
        <button id="frame">Add a frame to the race</button>
        <button id="block">Block the thread for 1.5s</button>
      </div>
      <p class="note">
        While the thread is blocked, try to select this text or click the other button.
        Nothing responds, including the spinner below.
      </p>
      <p id="spinner" style="font-size:1.6rem">◐</p>
      <pre id="out" class="log">Click a button.</pre>
    </div>
  `;

  const out = must<HTMLPreElement>(root, "#out");
  const spinner = must<HTMLParagraphElement>(root, "#spinner");
  const orderButton = must<HTMLButtonElement>(root, "#order");
  const frameButton = must<HTMLButtonElement>(root, "#frame");
  const blockButton = must<HTMLButtonElement>(root, "#block");

  const frames = ["◐", "◓", "◑", "◒"];
  let frame = 0;
  // A rAF loop paints once per frame. It is also the clearest possible proof
  // that a blocked thread paints nothing at all.
  let handle = requestAnimationFrame(function tick() {
    frame = (frame + 1) % frames.length;
    spinner.textContent = frames[frame] ?? "◐";
    handle = requestAnimationFrame(tick);
  });

  function render(ticks: Tick[], footer: string): void {
    const numbered = ticks.map((tick, index) => `${index + 1}. ${tick}`).join("\n");
    out.textContent = `${numbered}\n\n${footer}`;
  }

  async function showOrder(): Promise<void> {
    render(await recordOrder(), "This order is fixed by the spec.");
  }

  async function showFrameOrder(): Promise<void> {
    const ticks = await recordWithFrame();
    const timerIndex = ticks.indexOf("macrotask: setTimeout 0");
    const frameIndex = ticks.indexOf("frame: requestAnimationFrame");

    render(
      ticks,
      timerIndex < frameIndex
        ? "The timer beat the frame, which is the usual result: it was due in about a\n" +
            "millisecond and the next paint was up to sixteen away. Press it a few more\n" +
            "times. This one is not guaranteed, so it can come out the other way."
        : "The frame beat the timer this time. That is allowed: where rAF falls relative\n" +
            "to a timer is a scheduling decision, not a rule. Press again.",
    );
  }

  function block(): void {
    out.textContent = "Blocking… the spinner is frozen and clicks are queued.";
    blockFor(1500);
    out.textContent = "Done. Every click you made during those 1.5s fires now, at once.";
  }

  orderButton.addEventListener("click", showOrder);
  frameButton.addEventListener("click", showFrameOrder);
  blockButton.addEventListener("click", block);

  return () => {
    cancelAnimationFrame(handle);
    orderButton.removeEventListener("click", showOrder);
    frameButton.removeEventListener("click", showFrameOrder);
    blockButton.removeEventListener("click", block);
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "event-loop",
  title: "The event loop and microtasks",
  summary:
    "Sync, then microtasks, then timers, and a frame whenever the browser decides. Block any of it and the page stops.",
  file: "src/lessons/02_event_loop.ts",
  mount: mountEventLoop,
};
