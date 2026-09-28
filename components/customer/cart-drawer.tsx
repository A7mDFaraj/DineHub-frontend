"use client";

import { contrastInk } from "@/lib/menu-themes";
import { useCartStore } from "@/store/cart-store";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Minus,
  Plus,
  ShoppingBag,
  X,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import {
  prepareCheckout,
  checkoutMessage,
  optionLabel,
  trackingPathIsValid,
  uuidPattern,
} from "@/lib/checkout";
import { reportClientIncident } from "@/lib/observability";
import type { CartItem } from "@/store/cart-store";
import { armOrderSound } from "@/lib/order-alert";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import sheetStyles from "./customer-sheet.module.css";

export function CartDrawer({
  branchId,
  tableId,
  themeColor = "#f2644b",
  preview = false,
  onRefresh,
  onEdit,
}: {
  branchId: string;
  tableId?: string;
  themeColor?: string;
  preview?: boolean;
  onRefresh?: () => void;
  onEdit?: (item: CartItem) => void;
}) {
  const {
    items,
    isCartOpen,
    toggleCart,
    updateQuantity,
    removeItem,
    totalAmount,
    note,
    setNote,
    pending,
    phase,
    issue,
    acceptPrices,
    removed,
    undoRemove,
    beginSubmission,
    resolveSubmission,
    trackingPath,
    totalItems,
  } = useCartStore();

  const locale = useLocale();
  const t = useTranslations("CustomerCart");
  const isRtl = locale === "ar";
  const SubmitArrow = isRtl ? ArrowLeft : ArrowRight;

  const router = useRouter();
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [retryDelay, setRetryDelay] = useState(0);
  useEffect(() => {
    if (!retryDelay) return;
    const timer = window.setTimeout(() => setRetryDelay(0), retryDelay);
    return () => window.clearTimeout(timer);
  }, [retryDelay]);
  const prepared = prepareCheckout(items, note, isRtl);
  const locked = isSubmitting || Boolean(pending);
  const showError = (code: string) => {
    setSubmitError(checkoutMessage(code, isRtl));
    requestAnimationFrame(() => errorRef.current?.focus());
  };
  const handleSubmitOrder = async () => {
    if (preview || submittingRef.current || !items.length) return;
    if (retryDelay) {
      showError("RATE_LIMIT");
      return;
    }
    if (!pending && prepared.issues.length) {
      showError(prepared.issues[0].code);
      return;
    }
    if (
      !tableId ||
      !uuidPattern.test(branchId) ||
      !uuidPattern.test(tableId) ||
      items.some((item) => !uuidPattern.test(item.productId))
    ) {
      showError("TABLE");
      return;
    }
    const attempt = pending ?? {
      key: crypto.randomUUID().replaceAll("-", ""),
      payload: {
        branchId,
        tableId,
        items: prepared.items,
        ...(prepared.note ? { note: prepared.note } : {}),
      },
    };
    if (!beginSubmission(attempt)) {
      showError("STORAGE");
      return;
    }
    void armOrderSound();
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await apiClient.post("/orders", attempt.payload, {
        headers: { "Idempotency-Key": attempt.key },
      });
      if (!trackingPathIsValid(res.data?.trackingPath))
        throw new Error("Invalid confirmation");
      const requestContext = `${attempt.payload.branchId}:${attempt.payload.tableId}`;
      resolveSubmission("confirmed", res.data.trackingPath, requestContext);
      if (useCartStore.getState().context === requestContext)
        router.push(
          isRtl ? res.data.trackingPath : `/en${res.data.trackingPath}`,
        );
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const code = axios.isAxiosError(err)
        ? err.response?.data?.code
        : undefined;
      // A generic error or server failure can follow a successful commit.
      const definitive = ["PRICE_CHANGED", "UNAVAILABLE", "TABLE"].includes(
        code,
      );
      const rejected =
        definitive ||
        (!pending &&
          status !== undefined &&
          [400, 401, 403, 404, 422, 429].includes(status));
      resolveSubmission(
        rejected ? "rejected" : "unknown",
        undefined,
        `${attempt.payload.branchId}:${attempt.payload.tableId}`,
      );
      if (status === 429) {
        const header = axios.isAxiosError(err)
          ? err.response?.headers?.["retry-after"]
          : undefined;
        const seconds = Number(header);
        setRetryDelay(
          Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 30000,
        );
      }
      showError(
        !rejected
          ? "UNKNOWN"
          : status === 429
            ? "RATE_LIMIT"
            : typeof code === "string"
              ? code
              : "FAILED",
      );
      reportClientIncident({
        level: "warn",
        event: "checkout.outcome",
        message: rejected ? "rejected" : "confirmation_unknown",
        metadata: {
          statusCode: status,
          code: typeof code === "string" ? code : "UNCLASSIFIED",
        },
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };
  if (!isCartOpen && items.length === 0)
    return trackingPath ? (
      <button
        type="button"
        className="fixed bottom-5 left-1/2 z-40 min-h-12 -translate-x-1/2 rounded-full bg-stone-900 px-6 text-white"
        onClick={() => router.push(isRtl ? trackingPath : `/en${trackingPath}`)}
      >
        {isRtl ? "متابعة طلبك السابق" : "Track your previous order"}
      </button>
    ) : null;

  const count = totalItems();
  const total = totalAmount();
  const currencyLabel = isRtl ? "ر.س" : "SAR";
  const buttonStyle = {
    backgroundColor: themeColor,
    color: contrastInk(themeColor),
  };
  return (
    <>
      {!isCartOpen && items.length > 0 && (
        <button
          type="button"
          onClick={toggleCart}
          style={buttonStyle}
          className="fixed bottom-5 left-1/2 z-40 flex min-h-14 w-[calc(100%-32px)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-full px-6 py-3 font-bold shadow-xl active:scale-[0.96]"
        >
          <span>
            {count} · {t("viewCart")}
          </span>
          <span className="tabular-nums">
            {total.toFixed(2)} {currencyLabel}
          </span>
        </button>
      )}
      <Dialog.Root
        open={isCartOpen}
        onOpenChange={(open) => {
          if (open !== isCartOpen && !isSubmitting) toggleCart();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby={undefined}
            className={`${sheetStyles.sheet} fixed bottom-0 left-1/2 z-50 flex max-h-[90dvh] w-full max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white text-stone-900 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl`}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3">
              <div>
                <Dialog.Title className="flex items-center gap-2 text-lg font-bold">
                  <ShoppingBag size={20} />
                  {t("cartTitle")}
                </Dialog.Title>
                <p className="mt-1 text-xs text-stone-600">
                  {count} {count === 1 ? t("itemSingular") : t("itemPlural")}
                </p>
              </div>
              <Dialog.Close
                disabled={locked}
                className="flex size-11 items-center justify-center rounded-full bg-white"
                aria-label={isRtl ? "إغلاق" : "Close"}
              >
                <X size={18} />
              </Dialog.Close>
            </header>
            <div
              className={`${sheetStyles.body} min-h-0 flex-1 space-y-4 overflow-y-auto p-5`}
            >
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <h3 className="font-bold">{t("emptyCartTitle")}</h3>
                  <p className="mt-2 text-sm text-stone-600">
                    {t("emptyCartDesc")}
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <article
                    key={item.id}
                    id={`cart-item-${items.indexOf(item)}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold">
                        {isRtl
                          ? item.nameAr || item.nameEn
                          : item.nameEn || item.nameAr}
                      </h3>
                      <p className="mt-1 text-sm font-bold tabular-nums">
                        {(item.price * item.quantity).toFixed(2)}{" "}
                        {currencyLabel}
                      </p>
                      {Boolean(item.selectedAttributes?.length) && (
                        <p className="mt-1 text-xs text-stone-600">
                          {item
                            .selectedAttributes!.map((option) =>
                              optionLabel(option, isRtl),
                            )
                            .join(" · ")}
                        </p>
                      )}
                      {item.unavailable && (
                        <p role="status" className="mt-2 text-sm text-red-800">
                          {checkoutMessage("UNAVAILABLE", isRtl)}
                        </p>
                      )}
                      {item.previousPrice !== undefined && (
                        <p className="mt-2 text-sm text-amber-900">
                          {isRtl ? "السعر السابق" : "Previous price"}:{" "}
                          {item.previousPrice.toFixed(2)} →{" "}
                          {item.price.toFixed(2)}
                        </p>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          disabled={locked}
                          className="min-h-11 underline disabled:opacity-50"
                          onClick={() => onEdit(item)}
                        >
                          {isRtl
                            ? "تعديل الخيارات والملاحظات"
                            : "Edit options and notes"}
                        </button>
                      )}
                      {item.itemNote && (
                        <p className="mt-1 break-words text-xs text-stone-600">
                          {item.itemNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center rounded-full bg-stone-100 p-1">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                        className="flex size-11 items-center justify-center rounded-full"
                        aria-label={
                          isRtl ? "تقليل الكمية" : "Decrease quantity"
                        }
                      >
                        {item.quantity === 1 ? (
                          <Trash2 size={15} />
                        ) : (
                          <Minus size={15} />
                        )}
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={
                          locked ||
                          items
                            .filter((i) => i.productId === item.productId)
                            .reduce((sum, i) => sum + i.quantity, 0) >= 99
                        }
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + 1)
                        }
                        className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
                        aria-label={
                          isRtl ? "زيادة الكمية" : "Increase quantity"
                        }
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </article>
                ))
              )}
              {removed && !locked && (
                <button
                  type="button"
                  className="min-h-11 underline"
                  onClick={undoRemove}
                >
                  {isRtl ? "تراجع عن حذف الطبق" : "Undo removed dish"}
                </button>
              )}
              {items.some((item) => item.previousPrice !== undefined) &&
                !locked && (
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-amber-600 px-4"
                    onClick={acceptPrices}
                  >
                    {isRtl
                      ? "راجعت الأسعار الجديدة وأوافق عليها"
                      : "I reviewed and accept the new prices"}
                  </button>
                )}
              {items.length > 0 && (
                <div>
                  <label
                    htmlFor="cart-note"
                    className="mb-2 flex items-center gap-2 text-sm font-bold"
                  >
                    <MessageSquare size={15} />
                    {t("generalNote")}
                  </label>
                  <textarea
                    id="cart-note"
                    rows={2}
                    maxLength={1000}
                    disabled={locked}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"
                  />
                </div>
              )}
              {(submitError ||
                issue ||
                prepared.issues.length > 0 ||
                phase === "unknown") && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus:outline-2"
                >
                  {phase === "unknown"
                    ? checkoutMessage("UNKNOWN", isRtl)
                    : submitError ||
                      checkoutMessage(
                        issue ?? prepared.issues[0]?.code ?? "FAILED",
                        isRtl,
                      )}
                  {retryDelay > 0 && (
                    <p>{checkoutMessage("RATE_LIMIT", isRtl)}</p>
                  )}
                  {!locked &&
                    prepared.issues.map((problem, index) =>
                      problem.itemId ? (
                        <a
                          className="block min-h-11 underline"
                          key={index}
                          href={`#cart-item-${items.findIndex((i) => i.id === problem.itemId)}`}
                        >
                          {checkoutMessage(problem.code, isRtl)}
                        </a>
                      ) : null,
                    )}
                  {!locked && onRefresh && (
                    <button
                      type="button"
                      className="mt-2 block min-h-11 underline"
                      onClick={() => {
                        setSubmitError("");
                        onRefresh();
                      }}
                    >
                      {isRtl
                        ? "تحديث القائمة مع الاحتفاظ بالسلة"
                        : "Refresh menu and keep cart"}
                    </button>
                  )}
                </div>
              )}
            </div>
            {items.length > 0 && (
              <footer className="space-y-4 border-t border-stone-200 bg-stone-50 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
                <div className="flex justify-between gap-3 font-bold">
                  <span>{t("subtotal")}</span>
                  <span className="tabular-nums">
                    {total.toFixed(2)} {currencyLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSubmitOrder()}
                  disabled={isSubmitting || preview}
                  style={buttonStyle}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full p-3 text-sm font-bold disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    <>
                      {preview
                        ? isRtl
                          ? "معاينة فقط — لا يُرسل طلب"
                          : "Preview only — ordering disabled"
                        : pending
                          ? isRtl
                            ? "التحقق من استلام الطلب"
                            : "Check order confirmation"
                          : t("placeOrder")}
                      <SubmitArrow size={17} />
                    </>
                  )}
                </button>
              </footer>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
