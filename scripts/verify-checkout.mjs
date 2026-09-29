import assert from "node:assert/strict";
import {
  prepareCheckout,
  checkoutMessage,
  trackingPathIsValid,
} from "../lib/checkout.ts";
import { useCartStore as store } from "../store/cart-store.ts";
const storage = new Map();
globalThis.sessionStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
};
const branchId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";
const item = { productId, nameAr: "برجر", nameEn: "Burger", price: 99.75 };
const context = `${branchId}:${tableId}`;
store.getState().setContext(context);
assert(store.getState().addItem({ ...item, itemNote: "No onion" }));
assert(
  store.getState().addItem({ ...item, itemNote: "Extra sauce", quantity: 2 }),
);
assert(store.getState().addItem(item));
let prepared = prepareCheckout(store.getState().items, "Water please", false);
assert.deepEqual(prepared.issues, []);
assert.deepEqual(prepared.items, [
  { productId, quantity: 4, expectedUnitPrice: 99.75 },
]);
assert.match(prepared.note, /1× Burger: Special note: No onion/);
assert.match(prepared.note, /2× Burger: Special note: Extra sauce/);
assert.match(prepared.note, /1× Burger: Standard preparation/);
assert.match(prepared.note, /General notes: Water please/);
assert(store.getState().addItem({ ...item, isTakeaway: true }));
prepared = prepareCheckout(store.getState().items, "Water please", false);
assert.deepEqual(prepared.items, [
  { productId, quantity: 5, expectedUnitPrice: 99.75 },
]);
assert.match(prepared.note, /1× Burger: Takeaway/);
assert.equal(
  store.getState().items.filter((line) => line.productId === productId).length,
  4,
);
const takeawayId = store.getState().items.find((line) => line.isTakeaway).id;
store.getState().setContext("takeaway-persistence-check");
store.getState().setContext(context);
assert.equal(
  store.getState().items.find((line) => line.id === takeawayId).isTakeaway,
  true,
);
assert.match(
  prepareCheckout(
    [store.getState().items.find((line) => line.id === takeawayId)],
    "",
    true,
  ).note,
  /1× برجر: سفري/,
);
store.getState().removeItem(takeawayId);
assert.equal(store.getState().totalAmount(), 399);
assert.equal(store.getState().addItem({ ...item, quantity: 96 }), false);
assert.equal(store.getState().totalItems(), 4);
for (const quantity of [NaN, Infinity, 0, -1, 0.5, 100])
  assert.equal(store.getState().addItem({ ...item, quantity }), false);
store.getState().setNote("saved");
store.getState().setContext("another-table");
assert.equal(store.getState().items.length, 0);
store.getState().setContext(context);
assert.equal(store.getState().note, "saved");
assert.equal(store.getState().items.length, 3);
store.getState().syncPrices([{ id: productId, price: 100 }]);
assert(
  prepareCheckout(store.getState().items, "", false).issues.some(
    (i) => i.code === "PRICE_CHANGED",
  ),
);
store.getState().acceptPrices();
assert.equal(
  prepareCheckout(store.getState().items, "", false).issues.length,
  0,
);
store.getState().syncPrices([]);
assert.equal(store.getState().items.length, 3);
assert(
  prepareCheckout(store.getState().items, "", false).issues.some(
    (i) => i.code === "UNAVAILABLE",
  ),
);
store.getState().syncPrices([{ id: productId, price: 100 }]);
store.getState().removeItem(store.getState().items[0].id);
store.getState().undoRemove();
assert.equal(store.getState().items.length, 3);
prepared = prepareCheckout(store.getState().items, "saved", true);
const pending = {
  key: "checkout_test_key_123456",
  payload: { branchId, tableId, items: prepared.items, note: prepared.note },
};
assert(store.getState().beginSubmission(pending));
assert.equal(store.getState().addItem(item), false);
store.getState().clearCart();
assert.equal(store.getState().items.length, 3);
store.getState().resolveSubmission("unknown");
store.getState().setContext("another-table");
store.getState().setContext(context);
assert.deepEqual(store.getState().pending, pending);
assert.equal(store.getState().phase, "unknown");
assert(store.getState().beginSubmission(pending));
store
  .getState()
  .resolveSubmission("confirmed", "/order/verified_tracking_token_123");
assert.equal(store.getState().items.length, 0);
assert.equal(store.getState().pending, null);
assert.equal(
  store.getState().trackingPath,
  "/order/verified_tracking_token_123",
);
assert(!trackingPathIsValid("/order/../../admin"));
assert(!checkoutMessage("arbitrary backend error", true).includes("backend"));
store
  .getState()
  .addItem({
    ...item,
    selectedAttributes: [{ id: "option", labelAr: "حار", labelEn: "Spicy" }],
  });
store
  .getState()
  .addItem({
    ...item,
    selectedAttributes: [{ id: "option", labelAr: "حار", labelEn: "Hot" }],
  });
assert.equal(store.getState().items.length, 1);
assert.equal(store.getState().items[0].quantity, 2);
const line = { ...item, id: "x", quantity: 1 };
assert(
  prepareCheckout([line], "x".repeat(1001), false).issues.some(
    (i) => i.code === "NOTE",
  ),
);
assert(
  prepareCheckout(
    [{ ...line, itemNote: "x".repeat(501) }],
    "",
    false,
  ).issues.some((i) => i.code === "NOTE"),
);
assert(
  prepareCheckout(
    Array.from({ length: 12 }, (_, i) => ({
      ...line,
      id: String(i),
      itemNote: "x".repeat(490),
    })),
    "",
    false,
  ).issues.some((i) => i.code === "NOTE"),
);
assert(
  prepareCheckout(
    Array.from({ length: 101 }, (_, i) => ({ ...line, productId: String(i) })),
    "",
    false,
  ).issues.some((i) => i.code === "PRODUCT_LIMIT"),
);
assert(
  prepareCheckout([{ ...line, price: NaN }], "", false).issues.some(
    (i) => i.code === "PRICE",
  ),
);
store.getState().setContext("different-active-table");
store.getState().addItem(item);
store
  .getState()
  .resolveSubmission("confirmed", "/order/late_tracking_token_123", context);
assert.equal(
  store.getState().items.length,
  1,
  "late confirmation must not clear another table",
);
store.getState().setContext(context);
assert.equal(store.getState().trackingPath, "/order/late_tracking_token_123");
const realStorage = globalThis.sessionStorage;
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {
    throw new Error("Storage blocked");
  },
};
store.getState().setContext(`${branchId}:${tableId}`);
assert.equal(store.getState().beginSubmission(pending), false);
globalThis.sessionStorage = realStorage;
console.log(
  "PASS: aggregation, notes, limits, options, context recovery, prices, unavailable retention, undo, durable retry, confirmation.",
);
