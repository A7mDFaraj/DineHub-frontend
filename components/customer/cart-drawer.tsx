"use client"

import { useCartStore, CartItem } from "@/store/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, X, Sparkles, MessageSquare } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

export function CartDrawer({ branchId, tableId }: { branchId: string; tableId?: string }) {
  const { items, isCartOpen, toggleCart, updateQuantity, totalAmount, note, setNote, clearCart, totalItems } = useCartStore()
  const params = useParams()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const tableNumber = params?.tableNumber as string

  if (!isCartOpen && items.length === 0) return null;

  const buildFormattedOrderNote = () => {
    const customizedLines: string[] = []
    
    items.forEach((item) => {
      const hasAttrs = item.selectedAttributes && item.selectedAttributes.length > 0
      const hasItemNote = Boolean(item.itemNote)

      if (hasAttrs || hasItemNote) {
        let line = `• ${item.quantity}x ${item.nameAr || item.nameEn}`
        if (hasAttrs) {
          line += ` [${item.selectedAttributes!.join(', ')}]`
        }
        if (hasItemNote) {
          line += ` (ملاحظة: ${item.itemNote})`
        }
        customizedLines.push(line)
      }
    })

    const generalNote = note.trim()

    if (customizedLines.length > 0 && generalNote) {
      return `خيارات الطلبات:\n${customizedLines.join('\n')}\n\nملاحظة عامة: ${generalNote}`
    } else if (customizedLines.length > 0) {
      return `خيارات الطلبات:\n${customizedLines.join('\n')}`
    } else {
      return generalNote
    }
  }

  const handleSubmitOrder = async () => {
    if (!tableNumber) {
      alert("Invalid Table Number")
      return
    }
    
    setIsSubmitting(true)
    setSubmitError("")

    try {
      let resolvedTableId = tableId

      // If table UUID wasn't passed down, fetch it via the public endpoint
      if (!resolvedTableId) {
        const tableRes = await apiClient.get(`/table/${branchId}/${tableNumber}`)
        resolvedTableId = tableRes.data?.id
      }

      if (!resolvedTableId) {
        throw new Error("Unable to identify table. Please refresh and try again.")
      }

      const formattedNote = buildFormattedOrderNote()

      const payload: {
        branchId: string;
        tableId: string;
        note?: string;
        items: { productId: string; quantity: number }[];
      } = {
        branchId,
        tableId: resolvedTableId,
        items: items.map(i => ({
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
        throw new Error("Order was submitted but no order confirmation was received.")
      }
    } catch (error: any) {
      console.error("Order error:", error)
      setSubmitError(error?.response?.data?.message || error?.message || "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating Cart Button */}
      <AnimatePresence>
        {!isCartOpen && items.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
          >
            <Button 
              onClick={toggleCart}
              variant="primary" 
              className="w-full rounded-full h-14 text-base sm:text-lg font-bold shadow-2xl flex items-center justify-between px-6 bg-gradient-to-r from-primary-500 to-amber-500 text-black border border-primary-400/40"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-black/25 w-8 h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white">
                  {totalItems()}
                </div>
                <span>View Cart / مراجعة الطلب</span>
              </div>
              <span className="font-mono text-sm sm:text-base font-extrabold">
                SAR {totalAmount().toFixed(2)}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
        )}
      </AnimatePresence>

      {/* Drawer Content */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#111114] border-t border-white/10 rounded-t-3xl max-h-[88vh] flex flex-col shadow-2xl max-w-xl mx-auto"
          >
            <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white font-outfit">
                <ShoppingBag size={20} className="text-primary-400" />
                <span>Your Cart / سلة طلبك</span>
              </h2>
              <Button variant="ghost" size="icon" onClick={toggleCart} className="rounded-full text-zinc-400 hover:text-white">
                <X size={20} />
              </Button>
            </div>

            <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4">
              {items.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  Your cart is empty
                </div>
              ) : (
                items.map((item: CartItem) => {
                  const hasAttributes = item.selectedAttributes && item.selectedAttributes.length > 0
                  const hasItemNote = Boolean(item.itemNote)

                  return (
                    <div key={item.id} className="glass-panel p-3.5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white leading-snug">
                            {item.nameAr || item.nameEn}
                          </h4>
                          {item.nameEn && item.nameAr && item.nameEn !== item.nameAr && (
                            <p className="text-xs text-zinc-400">{item.nameEn}</p>
                          )}
                          <div className="text-primary-400 text-sm font-bold font-mono mt-1">
                            SAR {(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                        
                        {/* Quantity Counter */}
                        <div className="flex items-center gap-2 bg-black/40 rounded-full p-1 border border-white/10 shrink-0">
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-4 text-center font-mono font-bold text-sm text-white">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Render Selected Options */}
                      {hasAttributes && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium">
                            <Sparkles className="w-3 h-3 text-primary-400" />
                            Options:
                          </span>
                          {item.selectedAttributes!.map((opt, idx) => (
                            <span 
                              key={idx} 
                              className="text-[11px] px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 border border-primary-500/20 font-medium"
                            >
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Render Item Special Note */}
                      {hasItemNote && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-300 bg-black/30 px-2.5 py-1.5 rounded-lg border border-white/5 font-arabic">
                          <MessageSquare className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{item.itemNote}</span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {items.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    General Order Note (Optional) / ملاحظات عامة على الطلب
                  </label>
                  <Input 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Please bring extra napkins or cutlery..."
                    className="bg-black/30 border-white/10 text-sm text-white placeholder:text-zinc-600 rounded-xl"
                  />
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#111114]">
                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-3">
                    {submitError}
                  </div>
                )}
                <div className="flex justify-between items-center mb-4 font-bold text-lg text-white">
                  <span>Total Amount</span>
                  <span className="text-primary-400 font-mono text-xl">SAR {totalAmount().toFixed(2)}</span>
                </div>
                <Button 
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                  variant="primary" 
                  size="lg" 
                  className="w-full rounded-xl h-12 text-base font-bold bg-primary-500 hover:bg-primary-600 text-black shadow-lg shadow-primary-500/20"
                >
                  {isSubmitting ? "Submitting Order..." : "Place Order Now / تأكيد الطلب"}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
