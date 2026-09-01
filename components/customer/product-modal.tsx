"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Minus, Check, MessageSquare, SlidersHorizontal } from "lucide-react"

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
  themeColor?: string
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
  themeColor = "#f2644b",
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-white border border-stone-200 rounded-t-[32px] sm:rounded-[28px] max-h-[88vh] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.2)] text-stone-900"
          >
            {/* Close Button Top Left (in RTL) */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 z-20 w-9 h-9 rounded-full bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 flex items-center justify-center transition-colors shadow-sm"
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
              {/* Product Image */}
              {product.imageUrl && (
                <div className="w-full h-44 sm:h-52 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 outline outline-1 -outline-offset-1 outline-black/5 relative -mt-1 shadow-sm">
                  <img
                    src={product.imageUrl}
                    alt={prodNameAr}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title and Price */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                    {prodNameAr}
                  </h2>
                  <span
                    className="text-lg sm:text-xl font-black font-mono tabular-nums shrink-0"
                    style={{ color: themeColor }}
                  >
                    {unitPrice.toFixed(2)} ر.س
                  </span>
                </div>
                {prodDesc && (
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mt-1 font-medium">
                    {prodDesc}
                  </p>
                )}
              </div>

              {/* Customization Options / Attributes */}
              {product.attributes && product.attributes.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                    <SlidersHorizontal size={14} style={{ color: themeColor }} />
                    <span>الخيارات والإضافات المتاحة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {product.attributes.map((attr) => {
                      const label = attr.attribute.labelAr || attr.attribute.labelEn || ""
                      const isSelected = selectedAttributes.includes(label)
                      return (
                        <button
                          key={attr.attribute.id}
                          type="button"
                          onClick={() => toggleAttribute(label)}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-stone-900 border-stone-900 text-white shadow-sm"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          <span className="truncate">{label}</span>
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected
                                ? "bg-white text-stone-900 border-white"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Customer Item Note */}
              <div className="space-y-1.5 pt-2 border-t border-stone-100">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <MessageSquare size={13} style={{ color: themeColor }} />
                  <span>ملاحظات إضافية على هذا الطبق (اختياري)</span>
                </label>
                <textarea
                  rows={2}
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="مثال: بدون بصل، زيادة صوص، الحليب خالي من الدسم…"
                  className="w-full rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-stone-400 resize-none transition-all box-border font-medium"
                />
              </div>
            </div>

            {/* Footer: Quantity Stepper & Submit */}
            <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center gap-3">
              {/* Quantity Counter */}
              <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl p-1 shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-800 flex items-center justify-center transition-colors"
                  aria-label="إنقاص الكمية"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center font-mono font-extrabold text-sm sm:text-base tabular-nums text-stone-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center justify-center transition-colors"
                  aria-label="زيادة الكمية"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAdd}
                style={{ backgroundColor: themeColor }}
                className="flex-1 min-h-[48px] rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-between px-5 shadow-sm transition-all active:scale-[0.96]"
              >
                <span>إضافة إلى الطلب</span>
                <span className="font-mono tabular-nums font-black text-sm sm:text-base">
                  {totalPrice.toFixed(2)} ر.س
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
