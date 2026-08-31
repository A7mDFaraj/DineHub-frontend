"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Check, Sparkles, MessageSquare, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ProductAttributeItem {
  attribute: {
    id: string
    labelAr?: string
    labelEn?: string
  }
}

export interface ModalProduct {
  id: string
  nameAr: string
  nameEn?: string
  name?: string
  descriptionAr?: string
  descriptionEn?: string
  price: number
  imageUrl?: string
  isAvailable?: boolean
  attributes?: ProductAttributeItem[]
}

interface ProductModalProps {
  product: ModalProduct | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (customizedItem: {
    productId: string
    nameAr: string
    nameEn: string
    price: number
    quantity: number
    imageUrl?: string
    selectedAttributes: string[]
    itemNote?: string
  }) => void
}

export function ProductModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const [itemNote, setItemNote] = useState("")
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (isOpen && product) {
      setSelectedAttributes([])
      setItemNote("")
      setQuantity(1)
    }
  }, [isOpen, product])

  if (!product) return null

  const prodNameAr = product.nameAr || product.name || "عنصر القائمة"
  const prodNameEn = product.nameEn || product.name || prodNameAr
  const prodDesc = product.descriptionAr || product.descriptionEn || ""
  const unitPrice = Number(product.price) || 0
  const totalPrice = unitPrice * quantity

  const toggleAttribute = (label: string) => {
    setSelectedAttributes((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    )
  }

  const handleAdd = () => {
    onAddToCart({
      productId: product.id,
      nameAr: prodNameAr,
      nameEn: prodNameEn,
      price: unitPrice,
      quantity,
      imageUrl: product.imageUrl,
      selectedAttributes,
      itemNote: itemNote.trim() || undefined,
    })
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal / Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-[#111114] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Close Button Top Right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-colors hover:bg-black/80"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-6 pb-28">
              {/* Product Header / Image */}
              <div className="space-y-4">
                {product.imageUrl ? (
                  <div className="w-full h-52 sm:h-60 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 relative">
                    <img
                      src={product.imageUrl}
                      alt={prodNameEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-transparent to-transparent opacity-80" />
                  </div>
                ) : (
                  <div className="w-full h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                    <Utensils className="w-10 h-10 stroke-[1.5]" />
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white font-outfit">
                        {prodNameAr}
                      </h2>
                      {prodNameEn && prodNameEn !== prodNameAr && (
                        <p className="text-sm text-zinc-400 font-medium">{prodNameEn}</p>
                      )}
                    </div>
                    <span className="text-xl font-bold text-primary-400 font-mono shrink-0">
                      SAR {unitPrice.toFixed(2)}
                    </span>
                  </div>

                  {prodDesc && (
                    <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                      {prodDesc}
                    </p>
                  )}
                </div>
              </div>

              {/* Options / Attributes Section */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary-400" />
                      <span>Custom Options / خيارات إضافية</span>
                    </label>
                    <span className="text-xs text-zinc-500 font-mono">
                      {selectedAttributes.length} selected
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Choose multiple options according to your preference.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {product.attributes.map((attrItem) => {
                      const attr = attrItem.attribute
                      const labelAr = attr.labelAr || attr.labelEn || "Option"
                      const labelEn = attr.labelEn && attr.labelEn !== labelAr ? attr.labelEn : null
                      const fullLabel = labelEn ? `${labelAr} (${labelEn})` : labelAr
                      const isSelected = selectedAttributes.includes(fullLabel)

                      return (
                        <button
                          key={attr.id}
                          type="button"
                          onClick={() => toggleAttribute(fullLabel)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-left text-sm font-medium transition-all select-none active:scale-[0.98]",
                            isSelected
                              ? "bg-primary-500/15 border-primary-500 text-white shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                              : "bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.06] hover:border-white/20"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{labelAr}</span>
                            {labelEn && (
                              <span className="text-xs text-zinc-400">{labelEn}</span>
                            )}
                          </div>

                          <div
                            className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ml-2",
                              isSelected
                                ? "bg-primary-500 border-primary-500 text-black"
                                : "border-white/20 bg-black/30"
                            )}
                          >
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Item Specific Note */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  <span>Special Instructions for this item (Optional)</span>
                </label>
                <p className="text-xs text-zinc-400">
                  e.g., &quot;No ice&quot;, &quot;Extra hot&quot;, &quot;Sauce on the side&quot; / أي طلب خاص
                </p>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="Type any specific request here..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-colors"
                />
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm font-semibold text-white">Quantity</span>
                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-white text-base">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Fixed Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#111114]/95 backdrop-blur-md border-t border-white/10 flex items-center gap-3 z-20">
              <Button
                type="button"
                onClick={handleAdd}
                variant="primary"
                className="w-full h-12 rounded-xl text-base font-bold shadow-lg flex items-center justify-between px-6"
              >
                <span>Add to Order</span>
                <span className="font-mono text-sm">SAR {totalPrice.toFixed(2)}</span>
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
