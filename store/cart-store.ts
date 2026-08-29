import { create } from 'zustand'

export interface CartItem {
  productId: string
  nameAr: string
  nameEn: string
  price: number
  quantity: number
  imageUrl?: string
}

interface CartStore {
  items: CartItem[]
  note: string
  isCartOpen: boolean
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  setNote: (note: string) => void
  clearCart: () => void
  toggleCart: () => void
  totalAmount: () => number
  totalItems: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  note: "",
  isCartOpen: false,
  
  addItem: (newItem) => {
    const { items } = get()
    const existingItem = items.find((item) => item.productId === newItem.productId)
    
    if (existingItem) {
      set({
        items: items.map((item) =>
          item.productId === newItem.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      })
    } else {
      set({ items: [...items, { ...newItem, quantity: 1 }] })
    }
  },
  
  removeItem: (productId) => {
    set({ items: get().items.filter((item) => item.productId !== productId) })
  },
  
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set({
      items: get().items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
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
