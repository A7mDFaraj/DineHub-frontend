"use client"

import { useEffect, useState, use, useMemo } from "react"
import { apiClient } from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"
import { Plus, UtensilsCrossed, SlidersHorizontal, Search, MapPin, Store } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ProductModal, ModalProduct } from "@/components/customer/product-modal"

interface Attribute {
  id: string
  labelAr?: string
  labelEn?: string
}

interface Product {
  id: string
  nameAr: string
  nameEn?: string
  name?: string
  descriptionAr?: string
  descriptionEn?: string
  price: number
  imageUrl?: string
  isAvailable?: boolean
  attributes?: { attribute: Attribute }[]
}

interface Category {
  id: string
  name?: string
  nameAr?: string
  nameEn?: string
  products: Product[]
}

interface TableInfo {
  id: string
  number: number
  branchId: string
  branch?: {
    name?: string
    nameEn?: string
    nameAr?: string
    logoUrl?: string
    themeColor?: string
    address?: string
  }
}

export default function MenuPage({
  params,
}: {
  params: Promise<{ branchId: string; tableNumber: string }>
}) {
  const resolvedParams = use(params)
  const [categories, setCategories] = useState<Category[]>([])
  const [tableInfo, setTableInfo] = useState<TableInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all")
  const [selectedProductForModal, setSelectedProductForModal] = useState<ModalProduct | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { addItem, items } = useCartStore()

  useEffect(() => {
    const fetchMenuAndTable = async () => {
      try {
        setLoading(true)
        setError("")

        const [menuRes, tableRes] = await Promise.allSettled([
          apiClient.get(`/menu/${resolvedParams.branchId}`),
          apiClient.get(`/table/${resolvedParams.branchId}/${resolvedParams.tableNumber}`),
        ])

        if (menuRes.status === "fulfilled") {
          const rawCategories = Array.isArray(menuRes.value.data)
            ? menuRes.value.data
            : menuRes.value.data?.categories || []
          setCategories(rawCategories)
        } else {
          console.error("Failed to load menu:", menuRes.reason)
          setError("تعذر تحميل قائمة الطعام. يرجى التحقق من اتصال الإنترنت.")
        }

        if (tableRes.status === "fulfilled" && tableRes.value.data) {
          setTableInfo(tableRes.value.data)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setError("تعذر تحميل قائمة الطعام.")
      } finally {
        setLoading(false)
      }
    }

    fetchMenuAndTable()
  }, [resolvedParams.branchId, resolvedParams.tableNumber])

  const handleOpenProductModal = (product: Product) => {
    if (product.isAvailable === false) return
    setSelectedProductForModal(product)
    setIsModalOpen(true)
  }

  const handleAddToCartFromModal = (customizedItem: {
    productId: string
    nameAr: string
    nameEn: string
    price: number
    quantity: number
    imageUrl?: string
    selectedAttributes: string[]
    itemNote?: string
  }) => {
    addItem(customizedItem)
  }

  const branchDisplayName =
    tableInfo?.branch?.nameAr ||
    tableInfo?.branch?.name ||
    tableInfo?.branch?.nameEn ||
    "DineHub"

  const branchLogoUrl = (tableInfo?.branch as any)?.logoUrl || null
  const branchThemeColor = (tableInfo?.branch as any)?.themeColor || "#f2644b"
  const branchAddress = tableInfo?.branch?.address || ""

  // Filter products based on search query and category
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return categories
      .map((cat) => {
        let prods = cat.products || []
        if (q) {
          prods = prods.filter((p) => {
            const nameAr = (p.nameAr || "").toLowerCase()
            const nameEn = (p.nameEn || p.name || "").toLowerCase()
            const desc = (p.descriptionAr || p.descriptionEn || "").toLowerCase()
            return nameAr.includes(q) || nameEn.includes(q) || desc.includes(q)
          })
        }
        return { ...cat, products: prods }
      })
      .filter((cat) => {
        if (activeCategoryId !== "all" && cat.id !== activeCategoryId) return false
        return cat.products.length > 0
      })
  }, [categories, searchQuery, activeCategoryId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3 text-stone-700">
        <LoadingSpinner size={36} />
        <p className="text-xs text-stone-500 animate-pulse font-bold">جارٍ تجهيز القائمة الشهية…</p>
      </div>
    )
  }

  return (
    <div className="pb-32 space-y-5">
      {/* Brand Header Banner */}
      <header className="p-4 sm:p-5 rounded-3xl bg-white/95 border border-stone-200/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
        {/* Soft ambient brand color glow */}
        <div
          className="absolute -top-16 -left-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: branchThemeColor }}
        />

        <div className="relative z-10 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5 min-w-0">
            {branchLogoUrl ? (
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 shadow-sm outline outline-1 -outline-offset-1 outline-black/5">
                <img
                  src={branchLogoUrl}
                  alt={branchDisplayName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm shrink-0 border border-stone-200"
                style={{
                  backgroundColor: `${branchThemeColor}15`,
                  color: branchThemeColor,
                }}
              >
                <Store size={22} />
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-stone-900 truncate leading-tight">
                {branchDisplayName}
              </h1>
              {branchAddress && (
                <p className="text-[0.72rem] text-stone-500 flex items-center gap-1 mt-0.5 truncate font-medium">
                  <MapPin size={11} className="shrink-0 text-stone-400" />
                  <span className="truncate">{branchAddress}</span>
                </p>
              )}
            </div>
          </div>

          {/* Table Badge */}
          <div
            className="px-3 py-1.5 rounded-2xl border flex flex-col items-center shrink-0 shadow-sm"
            style={{
              backgroundColor: `${branchThemeColor}10`,
              borderColor: `${branchThemeColor}30`,
            }}
          >
            <span className="text-[10px] font-bold text-stone-500">طاولة</span>
            <span
              className="text-base sm:text-lg font-black font-mono tabular-nums leading-none"
              style={{ color: branchThemeColor }}
            >
              #{resolvedParams.tableNumber}
            </span>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="relative mt-4">
          <Search
            size={16}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="ابحث عن طبق، صنف، أو مشروب…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pr-10 pl-4 rounded-xl bg-stone-100/90 border border-stone-200/80 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none transition-all box-border"
            style={{
              borderColor: searchQuery ? branchThemeColor : undefined,
            }}
          />
        </div>
      </header>

      {/* Categories Horizontal Scrolling Pill Bar */}
      {categories.length > 0 && (
        <div className="sticky top-2 z-30 -mx-1 px-1 py-1 bg-[#faf8f5]/90 backdrop-blur-md">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setActiveCategoryId("all")}
              className={`min-h-[36px] px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeCategoryId === "all"
                  ? "text-white shadow-sm border border-transparent"
                  : "bg-white/90 text-stone-600 border border-stone-200 hover:bg-white hover:text-stone-900"
              }`}
              style={{
                backgroundColor: activeCategoryId === "all" ? branchThemeColor : undefined,
              }}
            >
              <span>الكل</span>
            </button>

            {categories.map((cat) => {
              const isActive = activeCategoryId === cat.id
              const catName = cat.nameAr || cat.name || cat.nameEn || "قسم"
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`min-h-[36px] px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "text-white shadow-sm border border-transparent"
                      : "bg-white/90 text-stone-600 border border-stone-200 hover:bg-white hover:text-stone-900"
                  }`}
                  style={{
                    backgroundColor: isActive ? branchThemeColor : undefined,
                  }}
                >
                  <span>{catName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                      isActive ? "bg-black/20 text-white" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {cat.products.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs sm:text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Menu Categories and Products */}
      {filteredCategories.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col items-center justify-center gap-2">
          <UtensilsCrossed size={32} className="text-stone-400 mb-1" />
          <p className="text-base font-bold text-stone-900">لا توجد أطباق متطابقة</p>
          <p className="text-xs text-stone-500 max-w-xs">
            {searchQuery
              ? "لم نجد نتائج مطابقة لبحثك، جرب البحث بكلمات أخرى."
              : "قائمة الطعام فارغة حالياً."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const catTitle = category.nameAr || category.name || category.nameEn || "قسم"
            const prods = category.products || []

            return (
              <section key={category.id} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span
                    className="w-2.5 h-4 rounded-full"
                    style={{ backgroundColor: branchThemeColor }}
                  />
                  <h2 className="text-base sm:text-lg font-black text-stone-900">{catTitle}</h2>
                  <span className="text-xs text-stone-400 font-mono font-bold">({prods.length})</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {prods.map((product) => {
                    const productCartCount = items
                      .filter((i) => i.productId === product.id)
                      .reduce((sum, i) => sum + i.quantity, 0)
                    const inCart = productCartCount > 0
                    const prodName = product.nameAr || product.name || product.nameEn || "عنصر"
                    const prodSecondary =
                      product.nameEn && product.nameAr && product.nameEn !== prodName
                        ? product.nameEn
                        : null
                    const prodDesc = product.descriptionAr || product.descriptionEn || ""
                    const isAvailable = product.isAvailable !== false
                    const hasAttributes = Boolean(
                      product.attributes && product.attributes.length > 0
                    )

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleOpenProductModal(product)}
                        className={`p-3.5 sm:p-4 rounded-2xl bg-white border border-stone-200/90 shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex gap-3.5 overflow-hidden relative group transition-all ${
                          isAvailable
                            ? "cursor-pointer hover:border-stone-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.98]"
                            : "opacity-60 cursor-not-allowed bg-stone-50"
                        }`}
                      >
                        {/* Image on right in RTL */}
                        {product.imageUrl ? (
                          <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-stone-100 border border-stone-200/60 outline outline-1 -outline-offset-1 outline-black/5 relative shadow-sm">
                            <img
                              src={product.imageUrl}
                              alt={prodName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {inCart && (
                              <div
                                className="absolute top-1.5 right-1.5 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md font-mono tabular-nums"
                                style={{ backgroundColor: branchThemeColor }}
                              >
                                {productCartCount}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Text and Actions */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h3 className="font-extrabold text-sm sm:text-base text-stone-900 leading-snug break-words">
                                {prodName}
                              </h3>
                              <span
                                className="font-black text-sm sm:text-base font-mono tabular-nums shrink-0"
                                style={{ color: branchThemeColor }}
                              >
                                {Number(product.price).toFixed(2)} ر.س
                              </span>
                            </div>

                            {prodSecondary && (
                              <p className="text-[0.72rem] text-stone-400 mb-1 font-sans truncate" dir="ltr">
                                {prodSecondary}
                              </p>
                            )}

                            {prodDesc && (
                              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-2 font-medium">
                                {prodDesc}
                              </p>
                            )}

                            {/* Attribute tags */}
                            {hasAttributes && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {product.attributes!.map((attr) => {
                                  const label = attr.attribute.labelAr || attr.attribute.labelEn
                                  return (
                                    <span
                                      key={attr.attribute.id}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-bold"
                                    >
                                      {label}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex justify-end items-center gap-2 mt-1">
                            {isAvailable ? (
                              <button
                                type="button"
                                style={{ backgroundColor: branchThemeColor }}
                                className="h-8 px-3.5 rounded-xl font-bold text-xs text-white shadow-sm transition-all active:scale-[0.96] flex items-center gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenProductModal(product)
                                }}
                              >
                                {hasAttributes ? (
                                  <>
                                    <SlidersHorizontal size={13} />
                                    <span>{inCart ? `تخصيص (${productCartCount})` : "تخصيص"}</span>
                                  </>
                                ) : inCart ? (
                                  <>
                                    <Plus size={13} />
                                    <span>إضافة ({productCartCount})</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    <span>إضافة</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-stone-500 font-bold px-2 py-1 bg-stone-100 rounded-lg border border-stone-200">
                                غير متوفر حالياً
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Product Customization Modal */}
      <ProductModal
        product={selectedProductForModal}
        isOpen={isModalOpen}
        themeColor={branchThemeColor}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProductForModal(null)
        }}
        onAddToCart={handleAddToCartFromModal}
      />
    </div>
  )
}
