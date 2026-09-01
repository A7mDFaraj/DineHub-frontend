"use client"

import { useCartStore } from "@/store/cart-store"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, X, Trash2, ArrowLeft, Loader2, MessageSquare } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

export function CartDrawer({
  branchId,
  tableId,
  themeColor = "#f2644b",
}: {
  branchId: string
  tableId?: string
  themeColor?: string
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
  } = useCartStore()

  const params = useParams()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const tableNumber = params?.tableNumber as string

  if (!isCartOpen && items.length === 0) return null

  const buildFormattedOrderNote = () => {
    const customizedLines: string[] = []

    items.forEach((item) => {
      const hasAttrs = item.selectedAttributes && item.selectedAttributes.length > 0
      const hasItemNote = Boolean(item.itemNote)

      if (hasAttrs || hasItemNote) {
        let line = `• ${item.quantity}× ${item.nameAr || item.nameEn}`
        if (hasAttrs) {
          line += ` [${item.selectedAttributes!.join(", ")}]`
        }
        if (hasItemNote) {
          line += ` (ملاحظة: ${item.itemNote})`
        }
        customizedLines.push(line)
      }
    })

    const generalNote = note.trim()

    if (customizedLines.length > 0 && generalNote) {
      return `خيارات الطلبات:\n${customizedLines.join("\n")}\n\nملاحظة عامة: ${generalNote}`
    } else if (customizedLines.length > 0) {
      return `خيارات الطلبات:\n${customizedLines.join("\n")}`
    } else {
      return generalNote
    }
  }

  const handleSubmitOrder = async () => {
    if (!tableNumber) {
      alert("رقم الطاولة غير محدد")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      let resolvedTableId = tableId

      // Fetch table UUID if not present
      if (!resolvedTableId) {
        const tableRes = await apiClient.get(`/table/${branchId}/${tableNumber}`)
        resolvedTableId = tableRes.data?.id
      }

      if (!resolvedTableId) {
        throw new Error("تعذر التحقق من بيانات الطاولة. يرجى تحديث الصفحة والمحاولة مجدداً.")
      }

      const formattedNote = buildFormattedOrderNote()

      const payload: {
        branchId: string
        tableId: string
        note?: string
        items: { productId: string; quantity: number }[]
      } = {
        branchId,
        tableId: resolvedTableId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      }

      if (formattedNote) {
        payload.note = formattedNote
      }

      const res = await apiClient.post("/orders", payload)
      const orderId = res.data?.id || res.data?.order?.id

      if (orderId) {
        clearCart()
        toggleCart()
        router.push(`/menu/${branchId}/order/${orderId}`)
      } else {
        throw new Error("تم إرسال الطلب ولكن لم يتم استلام رقم التأكيد.")
      }
    } catch (err: any) {
      console.error("Order error:", err)
      setSubmitError(
        err?.response?.data?.message || err?.message || "تعذر إرسال الطلب. يرجى المحاولة مرة أخرى."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const count = totalItems()
  const total = totalAmount()

  return (
    <>
      {/* Floating Bottom Cart Pill */}
      <AnimatePresence>
        {!isCartOpen && items.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
            dir="rtl"
            style={{ fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif" }}
          >
            <button
              onClick={toggleCart}
              style={{ backgroundColor: themeColor }}
              className="w-full h-14 rounded-full text-white font-black shadow-[0_12px_32px_rgba(0,0,0,0.18)] flex items-center justify-between px-5 border border-white/20 transition-all active:scale-[0.96]"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-black/20 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold text-white tabular-nums">
                  {count}
                </div>
                <span className="text-xs sm:text-sm font-bold">عرض ومراجعة الطلب</span>
              </div>
              <span className="font-mono text-sm sm:text-base font-black tabular-nums">
                {total.toFixed(2)} ر.س
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer / Bottom Sheet */}
      <AnimatePresence>
        {isCartOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" 
            dir="rtl"
            style={{ fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif" }}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleCart}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sheet Box */}
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative z-10 w-full sm:max-w-lg bg-white border border-stone-200 rounded-t-[32px] sm:rounded-[28px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.25)] text-stone-900"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                  >
                    <ShoppingBag size={18} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-stone-900">سلة الطلبات</h2>
                    <p className="text-[0.72rem] text-stone-500 font-medium">
                      طاولة رقم #{tableNumber} • {count} عناصر
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleCart}
                  className="w-9 h-9 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors shadow-sm"
                  aria-label="إغلاق السلة"
                >
                  <X size={17} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 space-y-2">
                    <p className="text-sm font-bold text-stone-900">سلة الطلبات فارغة</p>
                    <p className="text-xs text-stone-500">أضف بعض الأطباق والمشروبات من القائمة لتأكيد طلبك.</p>
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const itemName = item.nameAr || item.nameEn || "عنصر"
                    const itemTotal = Number(item.price) * item.quantity
                    const hasAttrs = item.selectedAttributes && item.selectedAttributes.length > 0

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                            {itemName}
                          </h3>
                          <div
                            className="font-mono text-xs font-black tabular-nums mt-0.5"
                            style={{ color: themeColor }}
                          >
                            {itemTotal.toFixed(2)} ر.س
                          </div>

                          {/* Attributes and Notes */}
                          {hasAttrs && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.selectedAttributes!.map((attr, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="text-[9px] bg-white border border-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-bold"
                                >
                                  {attr}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.itemNote && (
                            <p className="text-[10px] text-stone-500 italic mt-0.5">
                              ملاحظة: {item.itemNote}
                            </p>
                          )}
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1 shrink-0 shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateQuantity(item.productId, item.quantity - 1)
                              } else {
                                removeItem(item.productId)
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-700 flex items-center justify-center transition-colors"
                            aria-label="إنقاص أو حذف"
                          >
                            {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                          </button>
                          <span className="w-6 text-center font-mono font-extrabold text-xs tabular-nums text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 flex items-center justify-center transition-colors"
                            aria-label="زيادة الكمية"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* General Order Notes */}
                {items.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <MessageSquare size={13} style={{ color: themeColor }} />
                      <span>ملاحظات عامة لطاقم الخدمة (اختياري)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="أي توجيهات إضافية تخص الطاولة أو تقديم الطلب…"
                      className="w-full rounded-xl bg-stone-50 border border-stone-200 p-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-400 resize-none transition-all box-border font-medium"
                    />
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-bold">
                    {submitError}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              {items.length > 0 && (
                <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-600">
                    <span>إجمالي الحساب:</span>
                    <span className="font-mono text-base sm:text-lg font-black text-stone-900 tabular-nums">
                      {total.toFixed(2)} ر.س
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    style={{ backgroundColor: themeColor }}
                    className="w-full min-h-[48px] rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.96] disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>جارٍ إرسال الطلب…</span>
                      </>
                    ) : (
                      <>
                        <span>تأكيد وإرسال الطلب إلى الطاقم</span>
                        <ArrowLeft size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
