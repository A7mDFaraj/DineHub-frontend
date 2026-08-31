import { create } from 'zustand'

export interface CartItem {
  id: string // Unique identifier per configuration
  productId: string
  nameAr: string
  nameEn: string
  price: number
  quantity: number
  imageUrl?: string
  selectedAttributes?: string[]
  itemNote?: string
}

export interface AddCartItemInput {
  productId: string
  nameAr: string
  nameEn: string
  price: number
  quantity?: number
  imageUrl?: string
  selectedAttributes?: string[]
  itemNote?: string
}

interface CartStore {
  items: CartItem[]
  note: string
  isCartOpen: boolean
  addItem: (item: AddCartItemInput) => void
  removeItem: (idOrProductId: string) => void
  updateQuantity: (idOrProductId: string, quantity: number) => void
  setNote: (note: string) => void
  clearCart: () => void
  toggleCart: () => void
  totalAmount: () => number
  totalItems: () => number
}

function generateCartItemId(item: AddCartItemInput): string {
  const attrs = (item.selectedAttributes || []).slice().sort().join('|')
  const note = (item.itemNote || '').trim()
  return `${item.productId}::${attrs}::${note}`
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  note: "",
  isCartOpen: false,
  
  addItem: (newItem) => {
    const { items } = get()
    const configId = generateCartItemId(newItem)
    const quantityToAdd = newItem.quantity && newItem.quantity > 0 ? newItem.quantity : 1
    
    const existingIndex = items.findIndex((item) => item.id === configId)
    
    if (existingIndex > -1) {
      set({
        items: items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        ),
      })
    } else {
      const fullItem: CartItem = {
        id: configId,
        productId: newItem.productId,
        nameAr: newItem.nameAr,
        nameEn: newItem.nameEn,
        price: newItem.price,
        quantity: quantityToAdd,
        imageUrl: newItem.imageUrl,
        selectedAttributes: newItem.selectedAttributes || [],
        itemNote: newItem.itemNote?.trim() || undefined,
      }
      set({ items: [...items, fullItem] })
    }
  },
  
  removeItem: (idOrProductId) => {
    set({
      items: get().items.filter(
        (item) => item.id !== idOrProductId && item.productId !== idOrProductId
      ),
    })
  },
  
  updateQuantity: (idOrProductId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(idOrProductId)
      return
    }
    set({
      items: get().items.map((item) =>
        item.id === idOrProductId || item.productId === idOrProductId
          ? { ...item, quantity }
          : item
      ),
    })
  },
  
  setNote: (note) => set({ note }),
  clearCart: () => set({ items: [], note: "" }),
  toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
  
  totalAmount: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0)
  },
  
  totalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0)
  },
}))
