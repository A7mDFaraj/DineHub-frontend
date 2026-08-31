"use client"

import { useEffect, useState, use } from "react"
import { apiClient } from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Check, UtensilsCrossed, Sparkles } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { CartDrawer } from "@/components/customer/cart-drawer"

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
          setError("Unable to load menu. Please check your connection.")
        }

        if (tableRes.status === "fulfilled" && tableRes.value.data) {
          setTableInfo(tableRes.value.data)
        }
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setError("Unable to load menu.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchMenuAndTable()
  }, [resolvedParams.branchId, resolvedParams.tableNumber])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size={36} />
        <p className="text-neutral-400 text-sm animate-pulse">Loading menu...</p>
      </div>
    )
  }

  const branchDisplayName = tableInfo?.branch?.name || 
    tableInfo?.branch?.nameEn || 
    tableInfo?.branch?.nameAr || "DineHub";

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4">
      {/* Header */}
      <div className="mb-8 pt-4">
        <div className="flex items-center gap-2 mb-2 text-primary-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{branchDisplayName}</span>
        </div>
        <h1 className="text-3xl font-bold font-outfit text-white mb-2">
          Digital Menu
        </h1>
        <p className="text-neutral-400 flex items-center gap-2 text-sm">
          Ordering for <span className="bg-primary-500/15 border border-primary-500/30 px-2.5 py-0.5 rounded-lg font-mono text-primary-300 font-bold">Table #{resolvedParams.tableNumber}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Menu Categories */}
      {categories.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center justify-center rounded-2xl">
          <UtensilsCrossed className="w-12 h-12 text-zinc-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-1">Menu is currently empty</h3>
          <p className="text-zinc-400 text-sm">Please check back shortly or ask your server.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((category) => {
            const catTitle = category.name || category.nameAr || category.nameEn || "Category";
            const catSubtitle = (category.nameEn && category.nameAr && category.nameEn !== catTitle) 
              ? category.nameEn 
              : null;
            const prods = category.products || [];

            if (prods.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-md py-3 z-10 border-b border-white/5 flex items-baseline justify-between">
                  <h2 className="text-xl font-bold text-white font-outfit">
                    {catTitle}
                  </h2>
                  {catSubtitle && (
                    <span className="text-xs text-zinc-500">{catSubtitle}</span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {prods.map((product) => {
                    const inCart = items.some(i => i.productId === product.id)
                    const prodName = product.nameAr || product.nameEn || product.name || "Item";
                    const prodSecondary = (product.nameEn && product.nameAr && product.nameEn !== prodName) 
                      ? product.nameEn 
                      : null;
                    const prodDesc = product.descriptionAr || product.descriptionEn || "";
                    const isAvailable = product.isAvailable !== false;

                    return (
                      <div key={product.id} className="glass-panel p-4 rounded-2xl flex gap-4 overflow-hidden relative group hover:border-white/15 transition-all">
                        {/* Image */}
                        {product.imageUrl ? (
                          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-800 border border-white/5">
                            <img 
                              src={product.imageUrl} 
                              alt={prodName}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : null}
                        
                        {/* Content */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <h3 className="font-semibold text-white leading-tight">{prodName}</h3>
                              <span className="text-primary-400 font-bold ml-2 shrink-0 font-mono">
                                ${Number(product.price).toFixed(2)}
                              </span>
                            </div>
                            
                            {prodSecondary && (
                              <p className="text-xs text-zinc-400 mb-1">{prodSecondary}</p>
                            )}

                            {prodDesc && (
                              <p className="text-xs text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                                {prodDesc}
                              </p>
                            )}
                            
                            {/* Attributes */}
                            {product.attributes && product.attributes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {product.attributes.map(attr => {
                                  const label = attr.attribute.labelAr || attr.attribute.labelEn;
                                  return (
                                    <Badge key={attr.attribute.id} variant="secondary" className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 text-zinc-300">
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          
                          {/* Add Button */}
                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              variant={inCart ? "secondary" : "primary"}
                              className={`rounded-xl h-8 px-4 font-semibold text-xs transition-all ${inCart ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' : ''}`}
                              onClick={() => {
                                if (!isAvailable) return
                                addItem({
                                  productId: product.id,
                                  nameEn: prodName,
                                  nameAr: product.nameAr || prodName,
                                  price: Number(product.price),
                                  imageUrl: product.imageUrl,
                                })
                              }}
                              disabled={!isAvailable}
                            >
                              {inCart ? (
                                <>
                                  <Check size={14} className="mr-1.5" /> Added
                                </>
                              ) : isAvailable ? (
                                <>
                                  <Plus size={14} className="mr-1.5" /> Add
                                </>
                              ) : (
                                "Sold Out"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cart Drawer Component */}
      <CartDrawer branchId={resolvedParams.branchId} tableId={tableInfo?.id} />
    </div>
  )
}
