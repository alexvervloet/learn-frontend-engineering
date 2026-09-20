import { describe, expect, it } from "vitest";

import { DELIVERY, FREE_DELIVERY_THRESHOLD, deliveryFor, formatMoney } from "./money";

describe("formatting", () => {
  it("renders pence as pounds", () => {
    expect(formatMoney(6400)).toBe("£64.00");
    expect(formatMoney(0)).toBe("£0.00");
    expect(formatMoney(5)).toBe("£0.05");
  });
});

describe("delivery", () => {
  it("is free at the threshold, not just above it", () => {
    // Off-by-one at the boundary is the classic version of this bug, and
    // the customer who hits it exactly is the one who complains.
    expect(deliveryFor(FREE_DELIVERY_THRESHOLD - 1)).toBe(DELIVERY);
    expect(deliveryFor(FREE_DELIVERY_THRESHOLD)).toBe(0);
    expect(deliveryFor(FREE_DELIVERY_THRESHOLD + 1)).toBe(0);
  });

  it("costs nothing to deliver nothing", () => {
    expect(deliveryFor(0)).toBe(0);
  });
});
