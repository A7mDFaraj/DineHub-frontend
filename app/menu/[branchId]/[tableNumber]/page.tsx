"use client"

import { useEffect, useState, use } from "react"
import { apiClient } from "@/lib/api-client"
import { useCartStore } from "@/store/cart-store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Check } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Attribute {
  id: string
  labelAr: string
  labelEn: string
}

interface Product {
  id: string
  nameAr: string
  nameEn: string
  descriptionEn: string
  price: number
  imageUrl: string
  isAvailable: boolean
  attributes: { attribute: Attribute }[]
}

interface Category {
  id: string
  name: string
  products: Product[]
}

export default function MenuPage({
  params,
}: {
  params: Promise<{ branchId: string; tableNumber: string }>
}) {
  const resolvedParams = use(params)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem, items } = useCartStore()

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        // const res = await apiClient.get(`/menu/${resolvedParams.branchId}`)
        // setCategories(res.data)
        
        // Mock data for UI presentation since backend might not be fully seeded yet
        setTimeout(() => {
          setCategories([
            {
              id: "cat-1",
              name: "Main Course",
              products: [
                {
                  id: "prod-1",
                  nameAr: "برجر كلاسيك",
                  nameEn: "Classic Burger",
                  descriptionEn: "Juicy beef patty with cheese, lettuce and our special sauce",
                  price: 35.0,
                  imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=500&fit=crop",
                  isAvailable: true,
                  attributes: [{ attribute: { id: "a1", labelAr: "لحم أنجوس", labelEn: "Angus Beef" } }]
                },
                {
                  id: "prod-2",
                  nameAr: "بيتزا مارجريتا",
                  nameEn: "Margherita Pizza",
                  descriptionEn: "Fresh tomatoes, mozzarella cheese, and basil",
                  price: 45.0,
                  imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=500&fit=crop",
                  isAvailable: true,
                  attributes: [{ attribute: { id: "a2", labelAr: "نباتي", labelEn: "Vegetarian" } }]
                }
              ]
            },
            {
              id: "cat-2",
              name: "Drinks",
              products: [
                {
                  id: "prod-3",
                  nameAr: "كولا",
                  nameEn: "Cola",
                  descriptionEn: "Ice cold soda",
                  price: 10.0,
                  imageUrl: "",
                  isAvailable: true,
                  attributes: [{ attribute: { id: "a3", labelAr: "بارد", labelEn: "Cold" } }]
                }
              ]
            }
          ])
          setLoading(false)
        }, 800)
      } catch (error) {
        console.error("Failed to load menu", error)
        setLoading(false)
      }
    }
    
    fetchMenu()
  }, [resolvedParams.branchId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <LoadingSpinner size={32} />
        <p className="text-neutral-400">Loading delicious menu...</p>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent mb-2">
          Welcome to DineHub
        </h1>
        <p className="text-neutral-400 flex items-center gap-2">
          Table <span className="bg-white/10 px-2 py-0.5 rounded-md font-mono text-white">{resolvedParams.tableNumber}</span>
        </p>
      </div>

      {/* Menu Categories */}
      <div className="space-y-12">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            <h2 className="text-xl font-semibold sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-md py-3 z-10 border-b border-white/5">
              {category.name}
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {category.products.map((product) => {
                const inCart = items.some(i => i.productId === product.id)
                
                return (
                  <div key={product.id} className="glass-panel p-4 flex gap-4 overflow-hidden relative group">
                    {/* Optional Image */}
                    {product.imageUrl ? (
                      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-800">
                        <img 
                          src={product.imageUrl} 
                          alt={product.nameEn}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-neutral-800/50 border border-white/5 flex items-center justify-center shrink-0">
                        <span className="text-neutral-600 text-xs text-center px-2">No Image</span>
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-white leading-tight">{product.nameEn}</h3>
                          <span className="text-amber-500 font-bold ml-2 shrink-0">
                            SAR {product.price.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-400 line-clamp-2 mb-2">
                          {product.descriptionEn}
                        </p>
                        
                        {/* Attributes/Tags */}
                        {product.attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {product.attributes.map(attr => (
                              <Badge key={attr.attribute.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {attr.attribute.labelEn}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Add Button */}
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          variant={inCart ? "secondary" : "primary"}
                          className={`rounded-full h-8 px-4 ${inCart ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30' : ''}`}
                          onClick={() => {
                            if (!product.isAvailable) return
                            addItem({
                              productId: product.id,
                              nameEn: product.nameEn,
                              nameAr: product.nameAr,
                              price: product.price,
                              imageUrl: product.imageUrl,
                            })
                          }}
                          disabled={!product.isAvailable}
                        >
                          {inCart ? (
                            <>
                              <Check size={14} className="mr-1.5" /> Added
                            </>
                          ) : product.isAvailable ? (
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
        ))}
      </div>
    </div>
  )
}
