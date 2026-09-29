import assert from "node:assert/strict";
import { prepareCheckout } from "../lib/checkout.ts";
import { parseOrderNote } from "../lib/staff-order-note.ts";

for (const ar of [false, true]) {
  const result = prepareCheckout(
    [
      {
        id: "1",
        productId: "p",
        nameAr: "برجر",
        nameEn: "Burger",
        price: 25,
        quantity: 1,
        isTakeaway: true,
        selectedAttributes: [{ id: "a", labelEn: "Cheese", labelAr: "جبن" }],
        itemNote: "No onion\nSauce on the side — please",
      },
      {
        id: "2",
        productId: "p",
        nameAr: "برجر",
        nameEn: "Burger",
        price: 25,
        quantity: 2,
      },
    ],
    "Water please\nThank you",
    ar,
  );
  const parsed = parseOrderNote(result.note);
  assert.equal(parsed.preparation.length, 2);
  assert.equal(parsed.preparation[0].isTakeaway, true);
  assert.equal(parsed.preparation[1].isTakeaway, false);
  assert.equal(
    parsed.preparation[0].specialNote,
    "No onion\nSauce on the side — please",
  );
  assert.deepEqual(parsed.preparation[0].modifiers, [ar ? "جبن" : "Cheese"]);
  assert.equal(parsed.generalNote, "Water please\nThank you");
}
assert.equal(
  parseOrderNote("An older unstructured note").generalNote,
  "An older unstructured note",
);
const legacy = parseOrderNote(
  "Preparation details:\n• 1× Burger: Takeaway — ketchup — No onion\n\nGeneral notes: Water",
);
assert.deepEqual(legacy.preparation[0].details, ["ketchup", "No onion"]);
assert.equal(legacy.preparation[0].specialNote, "");
assert.equal(legacy.generalNote, "Water");
assert.deepEqual(legacy.preparation[0].modifiers, []);
const priorFormat = parseOrderNote(
  "Preparation details:\n• 1× Burger: Takeaway — Cheese — Special note: No onion",
);
assert.deepEqual(priorFormat.preparation[0].modifiers, ["Cheese"]);
assert.deepEqual(priorFormat.preparation[0].details, []);
assert.equal(priorFormat.preparation[0].specialNote, "No onion");
const optionsOnly = parseOrderNote(
  "Preparation details:\n• 1× Burger: Selected option: Cheese — Selected option: Extra sauce",
);
assert.deepEqual(optionsOnly.preparation[0].modifiers, [
  "Cheese",
  "Extra sauce",
]);
assert.equal(optionsOnly.preparation[0].specialNote, "");
const written = parseOrderNote(
  "Preparation details:\n• 1× Burger: Special note: Ask before packing — Takeaway",
);
assert.deepEqual(written.preparation[0].modifiers, []);
assert.equal(written.preparation[0].isTakeaway, false);
assert.equal(
  written.preparation[0].specialNote,
  "Ask before packing — Takeaway",
);
console.log(
  "PASS: Arabic/English notes, takeaway portions, multiline special/general notes, and legacy orders.",
);
