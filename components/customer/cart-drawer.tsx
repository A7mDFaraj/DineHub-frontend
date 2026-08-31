"use client"

import { useCartStore } from "@/store/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, ShoppingBag, X } from "lucide-react"
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

      const res = await apiClient.post("/orders", {
        branchId,
        tableId: resolvedTableId,
        notes: note?.trim() || undefined,
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
        }))
      })
      
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm"
          >
            <Button 
              onClick={toggleCart}
              variant="primary" 
              className="w-full rounded-full h-14 text-lg font-semibold shadow-2xl flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-2">
                <div className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  {totalItems()}
                </div>
                <span>View Cart</span>
              </div>
              <span>SAR {totalAmount().toFixed(2)}</span>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShoppingBag size={20} className="text-amber-500" />
                Your Order
              </h2>
              <Button variant="ghost" size="icon" onClick={toggleCart} className="rounded-full">
                <X size={20} />
              </Button>
            </div>

            <div className="overflow-y-auto p-4 flex-1 space-y-4">
              {items.length === 0 ? (
                <div className="text-center text-neutral-500 py-10">
                  Your cart is empty
                </div>
              ) : (
                items.map(item => (
                  <div key={item.productId} className="flex items-center justify-between gap-4 glass-panel p-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{item.nameEn}</h4>
                      <div className="text-amber-500 text-sm font-medium">
                        SAR {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-black/40 rounded-full p-1 border border-white/10">
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-4 text-center font-medium">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {items.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm text-neutral-400 mb-2">Special Notes (Optional)</label>
                  <Input 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. No onions, extra spicy..."
                  />
                </div>
              )}
            </div>

              {items.length > 0 && (
                <div className="p-4 border-t border-white/10 bg-neutral-900">
                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-xl mb-3">
                      {submitError}
                    </div>
                  )}
                  <div className="flex justify-between mb-4 font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-amber-500">SAR {totalAmount().toFixed(2)}</span>
                  </div>
                  <Button 
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    variant="primary" 
                    size="lg" 
                    className="w-full rounded-xl"
                  >
                    {isSubmitting ? "Sending Order..." : "Place Order Now"}
                  </Button>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
