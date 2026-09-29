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
for (const source of [
  "برجر اللحم المشوي 16.00 ريال 200 كالوري",
  "كالوري 200 ريال 16.00 برجر اللحم المشوي",
  "برجر اللحم المشوي ١٦٫٠٠ ريال ٢٠٠ كالوري",
  "Grilled Beef Burger SAR 16.00 Calories 200",
]) {
  const parsed = parseItemLine(source);
  assert.equal(parsed.price, "16.00", source);
  assert.equal(parsed.calories, "200", source);
  assert.ok(!parsed.nameAr.includes("200"), source);
}
const line = (text, x0, y0, x1, y1) => ({ text, confidence: 95, bbox: { x0, y0, x1, y1 } });
// Deliberately out of reading order, like separate Tesseract language blocks.
const bilingual = parseMenuLines([
  line("Grilled Beef Burger", 400, 100, 650, 125),
  line("Grilled Chicken Burger", 400, 220, 650, 245),
  line("برجر الدجاج المشوي 14.00 ريال 185 كالوري", 120, 250, 650, 275),
  line("برجر اللحم المشوي 16.00 ريال 200 كالوري", 120, 130, 650, 155),
  line("Be Healthy Sandwiches Menu", 120, 20, 650, 50),
], []);
assert.equal(bilingual.items.length, 2);
assert.equal(bilingual.items[0].nameEn, "Grilled Beef Burger");
assert.equal(bilingual.items[0].nameAr, "برجر اللحم المشوي");
assert.equal(bilingual.items[0].price, "16.00");
assert.equal(bilingual.items[0].calories, "200");
assert.equal(bilingual.items[1].price, "14.00");
assert.equal(bilingual.items[0].categoryKey, bilingual.categories[0].key);
const columns = parseMenuLines([
  line("Pasta Menu", 0, 0, 260, 25),
  line("Sandwiches Menu", 500, 0, 900, 25),
  line("Pasta with fresh", 0, 100, 260, 120),
  line("pesto sauce", 0, 125, 260, 145),
  line("Grilled Beef Burger", 650, 100, 900, 125),
  line("باستا بالبيستو", 0, 150, 260, 175),
  line("برجر لحم مشوي", 650, 130, 900, 155),
  line("16.00 ريال 200 كالوري", 500, 132, 630, 155),
  line("18 ريال 266 كالوري", 0, 180, 260, 205),
], []);
assert.equal(columns.items.length, 2);
assert.equal(columns.items[0].nameEn, "Pasta with fresh pesto sauce");
assert.equal(columns.items[0].price, "18");
assert.equal(columns.items[1].price, "16.00");
assert.notEqual(columns.items[0].categoryKey, columns.items[1].categoryKey);
assert.equal(parseMenuLines([
  line("Beef Burger 16.00 SAR", 0, 100, 250, 125),
  line("برجر دجاج 14.00 ريال", 0, 135, 250, 160),
], []).items.length, 2, "Never merge two independently priced products");
const portions = parseMenuLines([
  line("Grilled Chicken", 200, 100, 400, 120),
  line("دجاج مشوي", 250, 130, 400, 150),
  line("150gr بروتين + 150gr كارب 27 ريال 456 كالوري", 100, 165, 400, 185),
  line("100gr بروتين + 100gr كارب 18 ريال 379 كالوري", 100, 195, 400, 215),
], []);
assert.equal(portions.items.length, 1, "Portion rows are not separate invented products");
assert.equal(portions.items[0].nameAr, "دجاج مشوي");
assert.equal(portions.items[0].nameEn, "Grilled Chicken");
assert.equal(portions.items[0].price, "", "Never choose one price from a portion table");
assert.ok(portions.items[0].warnings.includes("prices"));
const noisy = parseItemLine('كالور” 175 Ju) 21.00 المشوي برجر');
assert.equal(noisy.price, "21.00");
assert.equal(noisy.calories, "175");
assert.ok(noisy.warnings.includes("text"));
const pasta = parseMenuLines([
  line("Pasta Menu", 0, 0, 500, 25),
  line("Panne Pasta With Fresh Pesto Sauce", 0, 100, 500, 125),
  line("باستا البنيني مع صوص كن صحي البيستو الطازج", 0, 130, 500, 155),
  line("150gr باستا + 50gr دجاج 18 ريال 266 كالوري", 0, 160, 500, 185),
], []);
assert.equal(pasta.categories.length, 1, "Pasta product names are not headings");
assert.equal(pasta.items.length, 1);
assert.equal(pasta.items[0].nameAr, "باستا البنيني مع صوص كن صحي البيستو الطازج");
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
