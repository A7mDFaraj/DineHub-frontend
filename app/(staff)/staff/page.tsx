"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { OrderCard, Order } from "@/components/staff/order-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AnimatePresence } from "framer-motion"

export default function StaffDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      // const res = await apiClient.get('/staff/orders')
      // setOrders(res.data)
      
      // Mock data for UI demonstration
      setTimeout(() => {
        setOrders(prev => {
          if (prev.length === 0) {
            return [
              {
                id: "ord-1a",
                tableId: "4",
                status: "pending",
                note: "No onions in the burger please",
                createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                items: [
                  { productId: "p1", nameEn: "Classic Burger", quantity: 2 },
                  { productId: "p2", nameEn: "Cola", quantity: 2 }
                ]
              },
              {
                id: "ord-2b",
                tableId: "12",
                status: "preparing",
                note: "",
                createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                items: [
                  { productId: "p3", nameEn: "Margherita Pizza", quantity: 1 }
                ]
              }
            ]
          }
          return prev
        })
      }, 100)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const intervalId = setInterval(fetchOrders, 5000)
    return () => clearInterval(intervalId)
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
    
    try {
      // await apiClient.patch(`/staff/orders/${orderId}/status`, { status: newStatus })
    } catch (error) {
      console.error("Failed to update status", error)
      // Revert on failure
      fetchOrders()
    }
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Kitchen Orders</h1>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live updates active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        <AnimatePresence>
          {orders
            .sort((a, b) => {
              // Sort logic: pending first, then preparing, then ready. 
              // Within same status, sort by oldest first.
              const statusWeight = { pending: 1, preparing: 2, ready: 3, delivered: 4 }
              if (statusWeight[a.status] !== statusWeight[b.status]) {
                return statusWeight[a.status] - statusWeight[b.status]
              }
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            })
            .filter(o => o.status !== 'delivered') // hide delivered from active view
            .map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStatusChange={handleStatusChange} 
              />
          ))}
        </AnimatePresence>
        
        {orders.filter(o => o.status !== 'delivered').length === 0 && (
          <div className="col-span-full py-20 text-center text-neutral-500 glass-panel rounded-2xl">
            No active orders right now. Kitchen is clear! 👨‍🍳
          </div>
        )}
      </div>
    </div>
  )
}
