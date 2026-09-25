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
import { armOrderSound } from "@/lib/order-alert";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function CartDrawer({
  branchId,
  tableId,
  themeColor = "#f2644b",
  preview = false,
}: {
  branchId: string;
  tableId?: string;
  themeColor?: string;
  preview?: boolean;
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
    clearCart,
    totalItems,
  } = useCartStore();

  const locale = useLocale();
  const t = useTranslations("CustomerCart");
  const isRtl = locale === "ar";
  const SubmitArrow = isRtl ? ArrowLeft : ArrowRight;

  const params = useParams();
  const router = useRouter();
  const submittingRef = useRef(false);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const tableNumber = params?.tableNumber as string;

  if (!isCartOpen && items.length === 0) return null;

  const buildFormattedOrderNote = () => {
    const customizedLines: string[] = [];

    items.forEach((item) => {
      const hasAttrs =
        item.selectedAttributes && item.selectedAttributes.length > 0;
      const hasItemNote = Boolean(item.itemNote);

      if (hasAttrs || hasItemNote) {
        const itemName = isRtl
          ? item.nameAr || item.nameEn
          : item.nameEn || item.nameAr;
        let line = `• ${item.quantity}× ${itemName}`;
        if (hasAttrs) {
          line += ` [${item.selectedAttributes!.join(", ")}]`;
        }
        if (hasItemNote) {
          line += ` (${t("notePrefix")}: ${item.itemNote})`;
        }
        customizedLines.push(line);
      }
    });

    const generalNote = note.trim();

    if (customizedLines.length > 0 && generalNote) {
      return `${t("optionsPrefix")}:\n${customizedLines.join("\n")}\n\n${t("generalNotePrefix")}: ${generalNote}`;
    } else if (customizedLines.length > 0) {
      return `${t("optionsPrefix")}:\n${customizedLines.join("\n")}`;
    } else {
      return generalNote;
    }
  };

  const handleSubmitOrder = async () => {
    if (preview || submittingRef.current || items.length === 0) return;
    if (!tableNumber) {
      alert(t("tableNotSpecified"));
      return;
    }

    armOrderSound();
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      let resolvedTableId = tableId;

      // Fetch table UUID if not present
      if (!resolvedTableId) {
        const tableRes = await apiClient.get(
          `/table/${branchId}/${tableNumber}`,
        );
        resolvedTableId = tableRes.data?.id;
      }

      if (!resolvedTableId) {
        throw new Error(t("tableNotSpecified"));
      }

      const formattedNote = buildFormattedOrderNote();

      const payload: {
        branchId: string;
        tableId: string;
        note?: string;
        items: {
          productId: string;
          quantity: number;
          expectedUnitPrice: number;
        }[];
      } = {
        branchId,
        tableId: resolvedTableId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          expectedUnitPrice: Number(i.price),
        })),
      };

      if (formattedNote) {
        payload.note = formattedNote;
      }

      const fingerprint = JSON.stringify(payload);
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = {
          fingerprint,
          key: crypto.randomUUID().replaceAll("-", ""),
        };
      }
      const res = await apiClient.post("/orders", payload, {
        headers: { "Idempotency-Key": idempotencyRef.current.key },
      });
      const trackingPath = res.data?.trackingPath;

      if (
        typeof trackingPath === "string" &&
        trackingPath.startsWith("/order/")
      ) {
        clearCart();
        idempotencyRef.current = null;
        toggleCart();
        const finalPath = isRtl ? trackingPath : `/en${trackingPath}`;
        router.push(finalPath);
      } else {
        throw new Error(t("orderFailed"));
      }
    } catch (err: unknown) {
      console.error("Order error:", err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : err instanceof Error
          ? err.message
          : null;
      setSubmitError(typeof message === "string" ? message : t("orderFailed"));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

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
            className="fixed bottom-0 left-1/2 z-50 flex max-h-[90dvh] w-full max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white text-stone-900 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
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
                disabled={isSubmitting}
                className="flex size-11 items-center justify-center rounded-full bg-white"
                aria-label={isRtl ? "إغلاق" : "Close"}
              >
                <X size={18} />
              </Dialog.Close>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
                          {item.selectedAttributes!.join(" · ")}
                        </p>
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
                        disabled={isSubmitting}
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
                        disabled={isSubmitting || item.quantity >= 99}
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
                    disabled={isSubmitting}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"
                  />
                </div>
              )}
              {submitError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {submitError}
                  <button
                    type="button"
                    className="mt-2 block min-h-11 underline"
                    onClick={() => window.location.reload()}
                  >
                    {isRtl ? "تحديث القائمة" : "Refresh menu"}
                  </button>
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
                  onClick={handleSubmitOrder}
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
