// Pure, conservative transcription helpers. OCR confidence is not a correctness guarantee.
export type OcrLine = {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};
export type ExistingCategory = {
  id: string;
  name?: string;
  nameAr?: string;
  nameEn?: string;
};
export type ImportCategory = {
  key: string;
  nameAr: string;
  nameEn: string;
  existingId: string;
};
export type ImportItem = {
  key: string;
  categoryKey: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: string;
  calories: string;
  source: string;
  confidence: number;
  warnings: string[];
  selected: boolean;
  reviewed: boolean;
};
export const CATEGORY_NAMES = [
  ["مشروبات", "Drinks", "المشروبات", "Beverages"],
  ["مشروبات باردة", "Cold drinks", "المشروبات الباردة"],
  ["مشروبات ساخنة", "Hot drinks", "المشروبات الساخنة"],
  ["برجر", "Burgers"],
  ["بيتزا", "Pizza"],
  ["حلويات", "Desserts", "الحلويات"],
  ["مقبلات", "Appetizers", "المقبلات"],
  ["سلطات", "Salads", "السلطات"],
  ["ساندويتشات", "Sandwiches"],
  ["أطباق رئيسية", "Main courses"],
  ["عصائر", "Juices", "العصائر"],
  ["قهوة", "Coffee", "القهوة"],
] as const;

export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}
export function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
export function splitName(value: string) {
  const clean = value.replace(/^[\s:|/•.\-–]+|[\s:|/•.\-–]+$/g, "").trim();
  if (!/[\u0600-\u06ff]/.test(clean)) return { nameAr: "", nameEn: clean };
  if (!/[a-z]/i.test(clean)) return { nameAr: clean, nameEn: "" };
  // Never transliterate, reverse Arabic, or invent a missing translation.
  return {
    nameAr: clean
      .replace(/[a-z][a-z\s&'’\-]*/gi, "")
      .replace(/[|/]+/g, " ")
      .trim(),
    nameEn: clean
      .replace(/[\u0600-\u06ff]+/g, "")
      .replace(/[|/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}
export function categoryMatch(
  name: string,
  categories: ExistingCategory[],
): ExistingCategory | undefined {
  const normalized = normalizeName(name);
  const aliases = CATEGORY_NAMES.find((pair) =>
    pair.some((n) => normalizeName(n) === normalized),
  );
  const names = new Set([normalized, ...(aliases ?? []).map(normalizeName)]);
  const matches = categories.filter((c) =>
    [c.name, c.nameAr, c.nameEn].some((n) => n && names.has(normalizeName(n))),
  );
  return matches.length === 1 ? matches[0] : undefined;
}
const numberToken = "\\d+(?:[.,]\\d+)*";
const currency = "(?:SAR|SR|ر\\s*\\.\\s*س\\.?|ريال(?:اً|ا)?|﷼)";
const energy =
  "(?:kcal|calories?|cal|سعرة(?:\\s*حرارية)?|سعرات(?:\\s*حرارية)?)";
function decimal(value: string): string {
  // Commas with three trailing digits are ambiguous, never silently remove them.
  if (/^\d+,\d{1,2}$/.test(value)) return value.replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(value) ? value : "";
}
export function parseItemLine(source: string) {
  let rest = normalizeDigits(source).replace(
    /[\u200e\u200f\u202a-\u202e]/g,
    "",
  );
  const unsafeNumericContext =
    /(?:^|\s)[-−]\s*\d|\d\s*[-–—/]\s*\d|[$€£¥]|\b(?:USD|AED|EUR|KWD|BHD|QAR|OMR)\b/i.test(
      rest,
    );
  const warnings: string[] = [];
  const calories: string[] = [];
  const prices: string[] = [];
  const collect = (pattern: RegExp, target: string[]) => {
    rest = rest.replace(pattern, (_match, before: string, after: string) => {
      target.push(before || after);
      return " ";
    });
  };
  // Unit-qualified numbers are removed before considering any unlabelled price.
  collect(
    new RegExp(
      `(${numberToken})\\s*${energy}(?![\\p{L}])|(?<![\\p{L}])${energy}\\s*[:：]?\\s*(${numberToken})`,
      "giu",
    ),
    calories,
  );
  collect(
    new RegExp(
      `(${numberToken})\\s*${currency}(?![\\p{L}])|(?<![\\p{L}])${currency}\\s*[:：]?\\s*(${numberToken})`,
      "giu",
    ),
    prices,
  );
  let price = prices.length === 1 ? decimal(prices[0]) : "";
  let calorie =
    calories.length === 1 && /^\d+$/.test(calories[0]) ? calories[0] : "";
  if (calories.length > 1 || (calories.length === 1 && !calorie))
    warnings.push("calories");
  if (prices.length > 1 || (prices.length === 1 && !price))
    warnings.push("prices");
  if (!prices.length) {
    const numbers = [...rest.matchAll(/\d+(?:[.,]\d+)*/g)];
    // Suggest only a single trailing number. Quantities, discounts, leading IDs,
    // ranges, and multi-size prices are deliberately not guessed.
    const tail = /\s(\d+(?:[.,]\d+)*)\s*$/.exec(rest);
    if (
      numbers.length === 1 &&
      tail &&
      !/[%٪]|\b(?:g|kg|ml|l|oz|kj)\b|جرام|غرام|مل|كيلو|سعر|حراري|[–—]|\d\s*-\s*\d/i.test(
        rest,
      )
    ) {
      price = decimal(tail[1]);
      if (price) rest = rest.slice(0, tail.index);
      warnings.push("unlabelled");
    } else if (numbers.length) warnings.push("numbers");
  }
  if (unsafeNumericContext) {
    price = "";
    calorie = "";
    warnings.push("numbers");
  }
  if (prices.length && /\d/.test(rest)) {
    // A partly labelled size table must not become a single guessed price.
    price = "";
    warnings.push("numbers");
  }
  if (!price) warnings.push("missingPrice");
  return {
    ...splitName(rest.replace(/\s+/g, " ").trim()),
    price,
    calories: calorie,
    warnings,
  };
}

export function parseMenuLines(
  lines: OcrLine[],
  existing: ExistingCategory[],
  prefix = "scan",
) {
  const categories: ImportCategory[] = [];
  const items: ImportItem[] = [];
  let categoryKey = "";
  for (const [index, line] of lines.entries()) {
    const source = line.text.trim();
    if (!source) continue;
    const heading = normalizeName(source.replace(/[:：]$/, ""));
    const existingHeading = categoryMatch(heading, existing);
    const known = CATEGORY_NAMES.find((pair) =>
      pair.some((n) => normalizeName(n) === heading),
    );
    if (!/\d/.test(normalizeDigits(source)) && (existingHeading || known)) {
      const key = `${prefix}-category-${index}`;
      const names = known
        ? { nameAr: known[0], nameEn: known[1] }
        : splitName(source);
      const prior = categories.find((c) =>
        existingHeading
          ? c.existingId === existingHeading.id
          : normalizeName(c.nameAr || c.nameEn) ===
            normalizeName(names.nameAr || names.nameEn),
      );
      categoryKey = prior?.key ?? key;
      if (!prior)
        categories.push({
          key,
          ...names,
          existingId: existingHeading?.id ?? "",
        });
      continue;
    }
    const parsed = parseItemLine(source);
    items.push({
      key: `${prefix}-item-${index}`,
      categoryKey,
      ...parsed,
      source,
      confidence: line.confidence,
      descriptionAr: "",
      descriptionEn: "",
      selected: true,
      reviewed: false,
      warnings: [...parsed.warnings, ...(line.confidence < 80 ? ["text"] : [])],
    });
  }
  return { categories, items };
}

export function itemErrors(item: ImportItem): string[] {
  const errors: string[] = [];
  if (!item.nameAr.trim() || item.nameAr.trim().length > 120)
    errors.push("nameAr");
  if (item.nameEn.trim().length > 120) errors.push("nameEn");
  if (!/^\d+(?:\.\d{1,2})?$/.test(item.price) || Number(item.price) > 999999.99)
    errors.push("price");
  if (
    item.calories !== "" &&
    (!/^\d+$/.test(item.calories) || Number(item.calories) > 100000)
  )
    errors.push("calories");
  if (!item.categoryKey) errors.push("category");
  if (item.descriptionAr.length > 1000 || item.descriptionEn.length > 1000)
    errors.push("description");
  return errors;
}
