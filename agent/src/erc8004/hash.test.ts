import { describe, expect, it } from "vitest";
import { hashResult } from "./client.js";

describe("hashResult (provenance commitment)", () => {
  it("is deterministic regardless of key order", () => {
    const a = { asset: "MI4", composite: 15, headlines: ["gated"] };
    const b = { headlines: ["gated"], composite: 15, asset: "MI4" };
    expect(hashResult(a)).toBe(hashResult(b));
  });

  it("changes when any field changes", () => {
    const base = { asset: "MI4", composite: 15 };
    expect(hashResult(base)).not.toBe(hashResult({ asset: "MI4", composite: 16 }));
  });

  it("returns a 0x 32-byte hash", () => {
    const h = hashResult({ x: 1 });
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("distinguishes nested order-insensitive structures", () => {
    const a = { sub: [{ id: "a", v: 1 }, { id: "b", v: 2 }], n: { p: 1, q: 2 } };
    const b = { n: { q: 2, p: 1 }, sub: [{ v: 1, id: "a" }, { v: 2, id: "b" }] };
    expect(hashResult(a)).toBe(hashResult(b));
  });
});
