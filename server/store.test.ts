import { beforeAll, describe, expect, it } from "vitest";
import { loadStore, toCartResponse } from "./store.js";

beforeAll(async () => {
  await loadStore();
});

describe("cart totals", () => {
  it("calculates subtotal, coupon discount, free shipping, and total", () => {
    const cart = {
      id: "test-cart",
      userId: "demo-user",
      items: [
        { id: "item-1", productId: "havic-gamepad", quantity: 2, selectedColor: "#db4444", selectedSize: "M" },
        { id: "item-2", productId: "rgb-cooler", quantity: 1, selectedColor: "#111111", selectedSize: "" }
      ]
    };

    const result = toCartResponse(cart, "EXCLUSIVE10");

    expect(result.subtotal).toBe(400);
    expect(result.discount).toBe(40);
    expect(result.shipping).toBe(16);
    expect(result.total).toBe(376);
    expect(result.items).toHaveLength(2);
  });
});
