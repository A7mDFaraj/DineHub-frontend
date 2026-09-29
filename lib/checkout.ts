export interface CartOption {
  id: string;
  labelAr: string;
  labelEn: string;
}
export interface CheckoutLine {
  id: string;
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  quantity: number;
  selectedAttributes?: CartOption[];
  itemNote?: string;
  isTakeaway?: boolean;
  unavailable?: boolean;
  previousPrice?: number;
}
export interface OrderPayload {
  branchId: string;
  tableId: string;
  note?: string;
  items: { productId: string; quantity: number; expectedUnitPrice: number }[];
}
export type CheckoutCode =
  | "EMPTY"
  | "QUANTITY"
  | "PRODUCT_LIMIT"
  | "PRICE"
  | "NOTE"
  | "UNAVAILABLE"
  | "PRICE_CHANGED"
  | "TABLE";
export interface CheckoutIssue {
  code: CheckoutCode;
  itemId?: string;
}
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validPrice = (price: number) =>
  Number.isFinite(price) &&
  price >= 0 &&
  Number.isSafeInteger(Math.round(price * 100)) &&
  Math.abs(price * 100 - Math.round(price * 100)) < 0.00001;
export const optionLabel = (option: CartOption, ar: boolean) =>
  ar ? option.labelAr || option.labelEn : option.labelEn || option.labelAr;
export function prepareCheckout(
  lines: CheckoutLine[],
  note: string,
  ar: boolean,
) {
  const issues: CheckoutIssue[] = [];
  const grouped = new Map<string, OrderPayload["items"][number]>();
  if (!lines.length) issues.push({ code: "EMPTY" });
  if (note.length > 1000) issues.push({ code: "NOTE" });
  const customized = new Set(
    lines
      .filter(
        (line) =>
          line.isTakeaway ||
          line.itemNote?.trim() ||
          line.selectedAttributes?.length,
      )
      .map((line) => line.productId),
  );
  const instructions: string[] = [];
  for (const line of lines) {
    const issue = (code: CheckoutCode) =>
      issues.push({ code, itemId: line.id });
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 99
    )
      issue("QUANTITY");
    if (!validPrice(line.price)) issue("PRICE");
    if ((line.itemNote?.length ?? 0) > 500) issue("NOTE");
    if (line.unavailable) issue("UNAVAILABLE");
    if (line.previousPrice !== undefined) issue("PRICE_CHANGED");
    const existing = grouped.get(line.productId);
    if (existing) {
      if (existing.expectedUnitPrice !== line.price) issue("PRICE");
      existing.quantity += line.quantity;
      if (existing.quantity > 99) issue("QUANTITY");
    } else
      grouped.set(line.productId, {
        productId: line.productId,
        quantity: line.quantity,
        expectedUnitPrice: line.price,
      });
    if (customized.has(line.productId)) {
      const name = ar ? line.nameAr || line.nameEn : line.nameEn || line.nameAr;
      const details = (line.selectedAttributes ?? []).map(
        (option) =>
          `${ar ? "إضافة مختارة" : "Selected option"}: ${optionLabel(option, ar)}`,
      );
      if (line.isTakeaway) details.unshift(ar ? "سفري" : "Takeaway");
      if (line.itemNote?.trim())
        details.push(
          `${ar ? "ملاحظة خاصة" : "Special note"}: ${line.itemNote.trim()}`,
        );
      instructions.push(
        `• ${line.quantity}× ${name}: ${details.join(" — ") || (ar ? "بدون تخصيص" : "Standard preparation")}`,
      );
    }
  }
  if (grouped.size > 100) issues.push({ code: "PRODUCT_LIMIT" });
  const formattedNote = [
    instructions.length
      ? `${ar ? "تفاصيل التحضير" : "Preparation details"}:\n${instructions.join("\n")}`
      : "",
    note.trim()
      ? `${ar ? "ملاحظات عامة" : "General notes"}: ${note.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (formattedNote.length > 5000) issues.push({ code: "NOTE" });
  return {
    issues,
    items: [...grouped.values()],
    note: formattedNote || undefined,
  };
}
export function checkoutMessage(code: string, ar: boolean): string {
  const messages: Record<string, [string, string]> = {
    EMPTY: ["أضف طبقاً إلى السلة أولاً.", "Add a dish to your order first."],
    QUANTITY: [
      "الحد الأقصى 99 من كل طبق، شاملاً جميع التخصيصات.",
      "Choose 1–99 portions per dish, including all customizations.",
    ],
    PRODUCT_LIMIT: [
      "الحد الأقصى 100 طبق مختلف في الطلب.",
      "An order can contain up to 100 different dishes.",
    ],
    PRICE: [
      "يرجى تحديث القائمة ومراجعة سعر هذا الطبق.",
      "Refresh the menu and review this dish’s price.",
    ],
    NOTE: [
      "اختصر الملاحظات: 500 حرف لكل تخصيص، و1000 للملاحظات العامة، و5000 لتفاصيل الطلب كاملة.",
      "Shorten your notes: 500 characters per preparation, 1,000 for general notes, and 5,000 for all preparation details combined.",
    ],
    UNAVAILABLE: [
      "هذا الطبق لم يعد متاحاً. احذفه أو اختر بديلاً.",
      "This dish is no longer available. Remove it or choose another.",
    ],
    PRICE_CHANGED: [
      "تغير السعر. راجع الأسعار الجديدة ثم وافق عليها قبل الإرسال.",
      "Prices changed. Review and accept the new prices before sending.",
    ],
    TABLE: [
      "تعذر التحقق من الطاولة. أعد مسح رمز الطاولة أو اطلب مساعدة الموظف.",
      "We could not verify your table. Scan its QR code again or ask a staff member.",
    ],
    UNKNOWN: [
      "لم نتأكد من استلام الطلب بعد. سلتك محفوظة؛ تحقق من الطلب قبل إرسال طلب جديد.",
      "We have not confirmed receipt yet. Your cart is saved; check this order before sending another.",
    ],
    FAILED: [
      "تعذر إرسال الطلب. سلتك محفوظة، يرجى المحاولة مجدداً.",
      "We could not send your order. Your cart is saved; please try again.",
    ],
    RATE_LIMIT: [
      "طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجدداً.",
      "Too many attempts. Please wait a moment before trying again.",
    ],
    STORAGE: [
      "تعذر حفظ الطلب بأمان في هذا المتصفح. اسمح بتخزين بيانات الموقع أو استخدم متصفحاً آخر.",
      "This browser could not save your pending order safely. Allow site storage or use another browser.",
    ],
  };
  return (messages[code] ?? messages.FAILED)[ar ? 0 : 1];
}
export const trackingPathIsValid = (value: unknown): value is string =>
  typeof value === "string" && /^\/order\/[A-Za-z0-9_-]{16,128}$/.test(value);
