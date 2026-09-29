import assert from "node:assert/strict";
import {
  parseItemLine,
  parseMenuLines,
  normalizeDigits,
  categoryMatch,
  itemErrors,
} from "../lib/menu-ocr/parser.ts";

assert.equal(normalizeDigits("٢٥٫٥٠ ۶۵۰"), "25.50 650");
for (const source of [
  "Beef Burger SAR 25 650 kcal",
  "Beef Burger 25 SAR Calories: 650",
  "برجر لحم ٢٥ ر.س ٦٥٠ سعرة حرارية",
]) {
  const item = parseItemLine(source);
  assert.equal(item.price, "25", source);
  assert.equal(item.calories, "650", source);
}
assert.equal(parseItemLine("برجر لحم ٢٥٫٥٠ ريال ٦٥٠ سعرات").price, "25.50");
assert.equal(parseItemLine("Burger 650 kcal").price, "");
assert.equal(parseItemLine("Burger 25").price, "25");
assert.ok(parseItemLine("Burger 25").warnings.includes("unlabelled"));
for (const source of [
  "Burger 200 g",
  "Juice 250 ml",
  "Burger 25 35 45",
  "Burger 25-35",
  "Burger 20% 25",
  "Burger SAR 25 / SAR 35",
  "Burger 1,250",
  "Burger -25 SAR",
  "Burger 25-35 SAR",
  "Burger 25/35 SAR",
  "Burger S 25 L 35 SAR",
  "Burger $ 25",
  "Burger 25 AED",
]) {
  assert.equal(parseItemLine(source).price, "", source);
}
assert.equal(parseItemLine("Burger 25 SAR -650 kcal").calories, "");
assert.equal(parseItemLine("Burger SAR 25").calories, "");
assert.equal(parseItemLine("Water 0 SAR 0 kcal").calories, "0");
assert.equal(parseItemLine("Burger 25 SAR 600 kcal / 800 kcal").calories, "");
assert.equal(parseItemLine("Burger 25,50 SAR").price, "25.50");
assert.equal(parseItemLine("Burger").nameAr, "");
assert.equal(parseItemLine("برجر لحم").nameAr, "برجر لحم");
assert.equal(
  parseItemLine("برجر لحم 25 SAR 650 سعرةحرارية").nameAr,
  "برجر لحم",
);
assert.equal(parseItemLine("Local25").calories, "");
const existing = [{ id: "drinks", nameAr: "مشروبات", nameEn: "Drinks" }];
assert.equal(categoryMatch("Drinks", existing)?.id, "drinks");
assert.equal(categoryMatch("مشروبات", existing)?.id, "drinks");
assert.equal(categoryMatch("المشروبات", existing)?.id, "drinks");
assert.equal(
  categoryMatch("Drinks", [{ id: "arabic", nameAr: "المشروبات" }])?.id,
  "arabic",
);
assert.equal(
  categoryMatch("Cold drinks", existing),
  undefined,
  "Do not collapse distinct categories",
);
assert.equal(
  categoryMatch("Drinks", [...existing, { id: "another", nameEn: "Drinks" }]),
  undefined,
);
const draft = parseMenuLines(
  [
    { text: "Drinks", confidence: 95 },
    { text: "عصير 15 SAR 120 kcal", confidence: 60 },
  ],
  existing,
);
assert.equal(draft.categories[0].existingId, "drinks");
assert.equal(draft.items[0].categoryKey, draft.categories[0].key);
assert.equal(draft.items[0].reviewed, false);
assert.ok(draft.items[0].warnings.includes("text"));
assert.equal(draft.items[0].calories, "120");
assert.equal(itemErrors(draft.items[0]).length, 0);
assert.ok(itemErrors({ ...draft.items[0], price: "-1" }).includes("price"));
assert.ok(
  itemErrors({ ...draft.items[0], calories: "12.5" }).includes("calories"),
);
assert.ok(itemErrors({ ...draft.items[0], nameAr: " " }).includes("nameAr"));
console.log(
  "Menu OCR parser: Arabic/English text, digits, prices, calories, units, ranges, category matching and validation passed.",
);
