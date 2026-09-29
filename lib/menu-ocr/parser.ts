// Pure, conservative transcription helpers. OCR confidence is not a correctness guarantee.
export type OcrLine = {
  text: string;
  confidence: number;
  column?: number;
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
  bbox?: OcrLine["bbox"];
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
      .replace(/^[\s;:؛،”"'()]+|[\s;:؛،”"'()]+$/g, "")
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
  "(?:kcal|calories?|cal|كالور[يى]?(?:ز)?|كانور[يى]?|كلوري|سعرة(?:\\s*حرارية)?|سعرات(?:\\s*حرارية)?)";
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
  if (/كالور(?![يى])|كانور/.test(rest)) warnings.push("text");
  const calories: string[] = [];
  const prices: string[] = [];
  const collect = (pattern: RegExp, target: string[]) => {
    rest = rest.replace(pattern, (_match, before: string, after: string) => {
      target.push(before || after);
      return " ";
    });
  };
  // In RTL OCR, `كالوري 200 ريال 16.00` puts the calorie count beside
  // the currency too. Reserve explicitly labelled decimals before integers.
  collect(
    new RegExp(
      `(?<![\\d.,])(${numberToken}[.,]\\d{2})\\s*${currency}(?![\\p{L}])|(?<![\\p{L}])${currency}\\s*[:：]?\\s*(${numberToken}[.,]\\d{2})(?![\\d.,])`,
      "giu",
    ),
    prices,
  );
  // Unit-qualified numbers are removed before considering any unlabelled price.
  collect(
    new RegExp(
      `(${numberToken})\\s*${energy}(?![\\p{L}])|(?<![\\p{L}])${energy}\\s*[:：”"؟]?\\s*(${numberToken})`,
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
    const loneDecimal = numbers.length === 1 && /^\d+[.,]\d{2}$/.test(numbers[0][0]) ? numbers[0] : undefined;
    if (
      numbers.length === 1 &&
      (tail || loneDecimal) &&
      !/[%٪]|\b(?:g|kg|ml|l|oz|kj)\b|جرام|غرام|مل|كيلو|سعر|حراري|[–—]|\d\s*-\s*\d/i.test(
        rest,
      )
    ) {
      price = decimal(tail?.[1] ?? loneDecimal![0]);
      if (price) rest = tail ? rest.slice(0, tail.index)
        : rest.slice(0, loneDecimal!.index) + rest.slice(loneDecimal!.index + loneDecimal![0].length);
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

function isHeading(line: OcrLine, existing: ExistingCategory[]) {
  const name = normalizeName(line.text.replace(/[:：]$/, ""));
  if (/\bmenu\s*$/i.test(name) && !parseItemLine(name).price) return true;
  return !/\d/.test(normalizeDigits(name)) && (
    !!categoryMatch(name, existing) ||
    CATEGORY_NAMES.some((pair) => pair.some((n) => normalizeName(n) === name)) ||
    /^قائمة\s/.test(name) ||
    /^(?:وجبات(?: الدجاج المشوي)?|ساندوي?تشات|سندويشات|باستا|سلطات)\s+كن\s*صحي$/.test(name)
  );
}

function unionBox(lines: OcrLine[]): OcrLine["bbox"] {
  const boxes = lines.flatMap((l) => l.bbox ? [l.bbox] : []);
  if (boxes.length !== lines.length) return undefined;
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

function aligned(a: NonNullable<OcrLine["bbox"]>, b: NonNullable<OcrLine["bbox"]>) {
  const overlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  return overlap > Math.min(a.x1 - a.x0, b.x1 - b.x0) * 0.3;
}

function isPortionLine(source: string) {
  const normalized = normalizeDigits(source);
  return (normalized.match(/\d+/g)?.length ?? 0) >= 2 &&
    (/بروتين|كارب|\d\s*(?:gr|g|kg|ml)\b/i.test(normalized) ||
      (/\+/.test(normalized) && /^\s*[\u200e\u200f]*\d/.test(normalized)));
}

// Work with physical rows, not Tesseract's block reading order. A block can
// contain all English titles while another contains their Arabic translations.
function groupLines(lines: OcrLine[]): OcrLine[][] {
  const ordered = [...lines].sort((a, b) => a.bbox && b.bbox
    ? a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0 : 0);
  const groups: OcrLine[][] = [];
  const numeric: OcrLine[] = [];
  for (const line of ordered) {
    const parsed = parseItemLine(line.text);
    // Quantity / portion lines remain source evidence, never a product name.
    const hasName = /[\p{L}]/u.test(
      `${parsed.nameAr} ${parsed.nameEn}`.replace(/\b(?:g|gr|kg|ml|oz|protein|carbs)\b|جرام|غرام|بروتين|كارب/gi, ""),
    );
    if (!hasName || isPortionLine(line.text)) { numeric.push(line); continue; }
    const matches = groups.flatMap((group, index) => {
      const last = group[group.length - 1];
      if (last.column !== line.column) return [];
      const prior = parseItemLine(group.map((l) => l.text).join("\n"));
      if (prior.price && parsed.price) return [];
      const script = (name: { nameAr: string; nameEn: string }) => {
        const ar = (name.nameAr.match(/[\u0621-\u064a]/g) ?? []).length;
        const en = (name.nameEn.match(/[a-z]/gi) ?? []).length;
        return ar > en * 1.2 ? "ar" : en > ar * 1.2 ? "en" : "mixed";
      };
      const complementary = script(prior) !== "mixed" && script(parsed) !== "mixed" && script(prior) !== script(parsed);
      if (!last.bbox || !line.bbox) {
        // Without geometry only combine an immediately adjacent translation,
        // with one complete price-bearing row as evidence.
        return complementary && ordered.indexOf(last) === ordered.indexOf(line) - 1 &&
          !!prior.price !== !!parsed.price ? [{ index, score: 0 }] : [];
      }
      if (!aligned(last.bbox, line.bbox)) return [];
      const height = Math.max(last.bbox.y1 - last.bbox.y0, line.bbox.y1 - line.bbox.y0, 1);
      const gap = line.bbox.y0 - last.bbox.y1;
      const sameScript = (!!prior.nameAr && !prior.nameEn && !!parsed.nameAr && !parsed.nameEn) ||
        (!!prior.nameEn && !prior.nameAr && !!parsed.nameEn && !parsed.nameAr);
      const wrapped = sameScript && !prior.price && !parsed.price && gap <= height * 0.65;
      return gap >= -height * 0.35 && gap <= height * 1.3 && (complementary || wrapped)
        ? [{ index, score: gap / height }] : [];
    }).sort((a, b) => a.score - b.score);
    if (matches.length && (matches.length === 1 || matches[1].score - matches[0].score > 0.35))
      groups[matches[0].index].push(line);
    else groups.push([line]);
  }
  // Attach price/calorie lines only to a nearby, unambiguous title. Multiple
  // portion rows stay together and the parser flags their conflicting prices.
  for (const line of numeric) {
    const box = line.bbox;
    if (!box) { groups.push([line]); continue; }
    const matches = groups.flatMap((group, index) => {
      if (group[0].column !== line.column) return [];
      const b = unionBox(group);
      if (!b) return [];
      const height = Math.max(box.y1 - box.y0, ...group.map((l) => l.bbox ? l.bbox.y1 - l.bbox.y0 : 0), 1);
      const dy = Math.max(b.y0 - box.y1, box.y0 - b.y1, 0);
      const dx = Math.max(b.x0 - box.x1, box.x0 - b.x1, 0);
      if (dy > height * 1.6 || dx > height * 10) return [];
      return [{ index, score: dy / height * 3 + dx / height }];
    }).sort((a, b) => a.score - b.score);
    if (matches.length && (matches.length === 1 || matches[1].score - matches[0].score > 0.8))
      groups[matches[0].index].push(line);
    else groups.push([line]);
  }
  return groups;
}

export function parseMenuLines(
  lines: OcrLine[],
  existing: ExistingCategory[],
  prefix = "scan",
) {
  const categories: ImportCategory[] = [];
  const items: ImportItem[] = [];
  const nonempty = lines.filter((l) => l.text.trim());
  const headings = nonempty.filter((l) => isHeading(l, existing));
  const categoryRegions: { key: string; lines: OcrLine[] }[] = [];
  for (const [index, group] of groupLines(headings).entries()) {
    const source = group.map((l) => l.text.trim()).join("\n");
    const heading = normalizeName(source.replace(/[:：]$/, ""));
    const existingHeading = group.map((l) => categoryMatch(l.text, existing)).find(Boolean);
    const known = CATEGORY_NAMES.find((pair) =>
      pair.some((n) => normalizeName(n) === heading),
    );
    {
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
      categoryRegions.push({ key: prior?.key ?? key, lines: group });
      if (!prior)
        categories.push({
          key,
          ...names,
          existingId: existingHeading?.id ?? "",
        });
    }
  }
  for (const [index, group] of groupLines(nonempty.filter((l) => !headings.includes(l))).entries()) {
    const source = group.map((l) => l.text.trim()).join("\n");
    const bbox = unionBox(group);
    const region = categoryRegions.filter((r) => {
      if (r.lines[0].column !== group[0].column) return false;
      const b = unionBox(r.lines);
      return bbox && b ? b.y1 <= bbox.y0 && aligned(b, bbox)
        : nonempty.indexOf(r.lines[0]) < nonempty.indexOf(group[0]);
    }).sort((a, b) => (unionBox(b.lines)?.y1 ?? nonempty.indexOf(b.lines[0])) -
      (unionBox(a.lines)?.y1 ?? nonempty.indexOf(a.lines[0])))[0];
    const parsed = parseItemLine(source);
    const nameLines = group.filter((l) => !isPortionLine(l.text));
    const parts = nameLines.map((l) => parseItemLine(l.text));
    if (nameLines.length !== group.length) {
      const names = parseItemLine(nameLines.map((l) => l.text).join("\n"));
      parsed.nameAr = names.nameAr;
      parsed.nameEn = names.nameEn;
    }
    const english = parts.filter((p) => p.nameEn && !p.nameAr);
    const arabic = parts.filter((p) => p.nameAr && (p.nameAr.match(/[\u0621-\u064a]/g)?.length ?? 0) > (p.nameEn.match(/[a-z]/gi)?.length ?? 0) * 1.2);
    if (english.length && arabic.length) {
      // A stray Latin OCR token on an Arabic row is not an English translation.
      // Keep it in source evidence instead of appending it to a complete title.
      parsed.nameEn = english.map((p) => p.nameEn).join(" ");
      parsed.nameAr = arabic.map((p) => p.nameAr).join(" ");
    }
    const confidence = Math.min(...group.map((l) => l.confidence));
    items.push({
      key: `${prefix}-item-${index}`,
      categoryKey: region?.key ?? "",
      ...parsed,
      source,
      confidence,
      bbox,
      descriptionAr: "",
      descriptionEn: "",
      selected: true,
      reviewed: false,
      warnings: [...new Set([...parsed.warnings, ...(confidence < 80 ? ["text"] : [])])],
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
