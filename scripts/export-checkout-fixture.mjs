// Backend contract jobs consume real frontend serialization, not a hand-written payload.
import { prepareCheckout } from "../lib/checkout.ts";
const productId = "33333333-3333-4333-8333-333333333333";
const base = {
  productId,
  nameAr: "برجر",
  nameEn: "Burger",
  price: 99.75,
  quantity: 1,
};
const { items, note, issues } = prepareCheckout(
  [
    { ...base, id: "plain" },
    {
      ...base,
      id: "custom",
      quantity: 2,
      itemNote: "No onion",
      selectedAttributes: [{ id: "sauce", labelAr: "صلصة", labelEn: "Sauce" }],
    },
  ],
  "Water please",
  false,
);
if (issues.length) throw new Error("Fixture failed frontend validation");
process.stdout.write(
  JSON.stringify({
    branchId: "11111111-1111-4111-8111-111111111111",
    tableId: "22222222-2222-4222-8222-222222222222",
    items,
    note,
  }),
);
