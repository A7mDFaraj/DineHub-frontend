import axios from "axios";

export function eventError(error: unknown, ar: boolean) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === "string") {
      return eventErrorCode(data.message, ar);
    }
    if (Array.isArray(data?.message) && data.message.length > 0) {
      const first = data.message[0];
      return typeof first === "string"
        ? eventErrorCode(first, ar)
        : ar
          ? "بيانات غير صالحة. يرجى مراجعة الحقول."
          : "Invalid submitted data. Please check the fields.";
    }
    if (data?.code === "VALIDATION") {
      return ar
        ? "يرجى التأكد من ملء جميع الحقول المطلوبة بشكل صحيح."
        : "Please make sure all required fields are filled correctly.";
    }
    if (data?.error && typeof data.error === "string") {
      return eventErrorCode(data.error, ar);
    }
  }
  return eventErrorCode("", ar);
}

export function eventErrorCode(code: unknown, ar: boolean) {
  const messages: Record<string, [string, string]> = {
    FOOTBALL_INVALID_KEY: ["رفض المزود المفتاح. ضع المفتاح السري الكامل في إعدادات الخادم، وليس معرّف المفتاح.", "The provider rejected the key. Set the full secret key on the server, not its identifier."],
    FOOTBALL_QUOTA_EXCEEDED: ["تم بلوغ حد استخدام المزود. انتظر تجدد الحصة أو اختر مزودًا آخر.", "The provider quota was reached. Wait for it to reset or choose another provider."],
    FOOTBALL_INVALID_LEAGUES: ["راجع معرّفات الدوريات في إعدادات الخادم لهذا المزود.", "Check this provider’s league IDs in the server configuration."],
    FOOTBALL_UNAVAILABLE: ["تعذر الاتصال بالمزود. احتفظنا بالمباريات المخزنة؛ حاول لاحقًا أو اختر مزودًا آخر.", "Could not reach the provider. Cached matches are retained; retry later or choose another provider."],
    INVALID_FOOTBALL_RESPONSE: ["أعاد المزود بيانات غير مكتملة. حاول لاحقًا أو اختر مزودًا آخر.", "The provider returned invalid data. Retry later or choose another provider."],
    TABLE_UNAVAILABLE: [
      "حُجزت هذه الطاولة للتو. اختر طاولة أخرى.",
      "This table was just reserved. Choose another table.",
    ],
    BOOKING_CLOSED: [
      "الحجز غير متاح لهذه المباراة حاليًا.",
      "Booking is currently closed for this match.",
    ],
    FOOTBALL_NOT_CONFIGURED: [
      "يجب إعداد مفتاح مزود المباريات على الخادم.",
      "Configure the football provider key on the server.",
    ],
    FOOTBALL_COVERAGE_UNAVAILABLE: [
      "خطة مزود المباريات لا توفر البيانات المطلوبة أو تجاوزت حد الاستخدام.",
      "The provider plan cannot supply these fixtures or its quota was exceeded.",
    ],
    CANCEL_RESERVATIONS_BEFORE_CHANGING_EVENT: [
      "توجد حجوزات نشطة. يمكنك إيقاف الحجز أو إلغاء الفعالية قبل تغيير إعداداتها.",
      "Active bookings exist. Close booking or cancel the event before changing its settings.",
    ],
    MATCH_REQUIRES_REVIEW: [
      "تغير موعد المباراة. راجع الحجوزات قبل إعادة فتح الحجز.",
      "The match changed. Review existing bookings before reopening.",
    ],
    OUTSIDE_CHECK_IN_WINDOW: [
      "لا يمكن تأكيد الحضور خارج فترة الحجز أو بعد إلغائه.",
      "Check-in is unavailable outside the reservation window or after cancellation.",
    ],
    RESERVATION_NOT_FOUND: [
      "لم نعثر على الحجز. تحقق من رمز الحجز.",
      "Reservation not found. Check the reservation code.",
    ],
    INVALID_EVENT_WINDOW: [
      "يجب أن تشمل الفترة موعد المباراة وألا تتجاوز 12 ساعة.",
      "The window must include kickoff and be no longer than 12 hours.",
    ],
    CAPACITY_BELOW_EXISTING_BOOKING: [
      "السعة الجديدة أقل من عدد ضيوف حجز قائم.",
      "Capacity cannot be smaller than an existing party.",
    ],
    KICKOFF_MUST_BE_FUTURE: [
      "يجب أن يكون موعد المباراة في المستقبل.",
      "Kickoff must be a future date.",
    ],
    TABLE_INSTORE_ONLY: [
      "هذه الطاولة مخصصة للحجز المباشر في المحل عبر مسح رمز QR فقط.",
      "This table is reserved for in-store QR scan booking only.",
    ],
    INVALID_TABLE_CAPACITY: [
      "عدد الضيوف يتجاوز سعة هذه الطاولة.",
      "Number of guests exceeds the capacity of this table.",
    ],
    IDEMPOTENCY_CONFLICT: [
      "تفاصيل الحجز لا تتطابق مع المحاولة السابقة. يرجى تحديث الصفحة والمحاولة مجددًا.",
      "Reservation details do not match the previous attempt. Refresh and try again.",
    ],
    RESERVATION_NOT_PENDING: [
      "هذا الحجز تمت معالجته بالفعل.",
      "This reservation is no longer pending approval.",
    ],
    EVENT_NOT_FOUND: [
      "لم يتم العثور على الفعالية.",
      "Event not found.",
    ],
    EVENT_NOT_SHOWING: [
      "الفعالية غير معروضة حاليًا للحجز.",
      "Event is currently not open for bookings.",
    ],
    INVALID_RESERVATION_AMOUNT: [
      "مبلغ الحجز غير صالح.",
      "Invalid reservation amount.",
    ],
    BRANCH_NOT_FOUND: [
      "الفرع غير موجود أو غير متاح.",
      "Branch not found or inactive.",
    ],
    TABLE_NOT_FOUND: [
      "الطاولة غير موجودة.",
      "Table not found.",
    ],
  };
  return typeof code === "string" && messages[code]
    ? messages[code][ar ? 0 : 1]
    : ar
      ? "تعذر إتمام العملية. راجع البيانات وحاول مجددًا."
      : "Unable to complete this action. Check the details and try again.";
}
