"use client"

import { useEffect, useState } from "react"
import { apiClient } from "@/lib/api-client"
import { OrderCard, Order } from "@/components/staff/order-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AnimatePresence } from "framer-motion"
import { Building2, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

interface Branch {
  id: string
  name?: string
  nameEn?: string
  nameAr?: string
}

type StatusFilter = "active" | "pending" | "preparing" | "ready" | "delivered" | "all"

export default function StaffDashboard() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchBranches = async () => {
    try {
      const { data } = await apiClient.get("/staff/branches")
      const list = Array.isArray(data) ? data : data?.data || data?.branches || []
      setBranches(list)
      if (list.length > 0 && !selectedBranchId) {
        setSelectedBranchId(list[0].id)
      }
    } catch (err) {
      console.error("Failed to load branches:", err)
    }
  }

  const normalizeOrders = (rawOrders: any[]): Order[] => {
    return rawOrders.map((o: any) => ({
      id: o.id,
      tableId: o.table?.number ? o.table.number.toString() : (o.tableId || "1"),
      status: o.status || "pending",
      note: o.notes || o.note || "",
      createdAt: o.createdAt || new Date().toISOString(),
      items: Array.isArray(o.items) ? o.items.map((i: any) => ({
        productId: i.productId || i.id,
        nameEn: i.product?.nameAr || i.product?.nameEn || i.nameEn || i.name || "Menu Item",
        quantity: i.quantity || 1,
        note: i.note,
        selectedAttributes: i.selectedAttributes || []
      })) : []
    }))
  }

  const fetchOrders = async (branchId?: string) => {
    const targetBranchId = branchId || selectedBranchId
    if (!targetBranchId) return

    try {
      // Fetch both live active orders and delivered history from production backend
      const [liveRes, historyRes] = await Promise.allSettled([
        apiClient.get(`/staff/orders/${targetBranchId}`),
        apiClient.get(`/staff/orders/${targetBranchId}/history`),
      ])

      let combinedRaw: any[] = []

      if (liveRes.status === "fulfilled") {
        const liveList = Array.isArray(liveRes.value.data) 
          ? liveRes.value.data 
          : liveRes.value.data?.data || liveRes.value.data?.orders || []
        combinedRaw = [...combinedRaw, ...liveList]
      }

      if (historyRes.status === "fulfilled") {
        const histList = Array.isArray(historyRes.value.data) 
          ? historyRes.value.data 
          : historyRes.value.data?.data || historyRes.value.data?.orders || []
        
        // Avoid duplicates if any overlap
        const existingIds = new Set(combinedRaw.map(o => o.id))
        const uniqueHist = histList.filter((o: any) => !existingIds.has(o.id))
        combinedRaw = [...combinedRaw, ...uniqueHist]
      }

      setOrders(normalizeOrders(combinedRaw))
      setError("")
    } catch (err: any) {
      console.error("Failed to fetch live orders:", err)
      setError(err?.response?.data?.message || "Failed to load live orders.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  useEffect(() => {
    if (selectedBranchId) {
      setLoading(true)
      fetchOrders(selectedBranchId)
      
      // Polling every 5 seconds for live kitchen updates
      const intervalId = setInterval(() => {
        // Only poll if tab is visible to avoid unnecessary load
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchOrders(selectedBranchId)
        }
      }, 5000)

      return () => clearInterval(intervalId)
    }
  }, [selectedBranchId])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
    
    try {
      await apiClient.patch(`/staff/orders/${orderId}/status`, { status: newStatus })
      if (selectedBranchId) {
        await fetchOrders(selectedBranchId)
      }
    } catch (error) {
      console.error("Failed to update order status:", error)
      if (selectedBranchId) {
        fetchOrders(selectedBranchId)
      }
    }
  }

  const counts = {
    active: orders.filter(o => o.status !== 'delivered').length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    all: orders.length,
  }

  const filteredOrders = orders
    .filter(o => {
      if (statusFilter === "active") return o.status !== 'delivered'
      if (statusFilter === "all") return true
      return o.status === statusFilter
    })
    .sort((a, b) => {
      const statusWeight = { pending: 1, preparing: 2, ready: 3, delivered: 4 }
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status]
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white">Live Kitchen Orders</h1>
          <p className="text-zinc-400 text-sm mt-1">Real-time incoming orders from customer table QR scans.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Building2 className="w-4 h-4 text-primary-400" />
              <select 
                value={selectedBranchId} 
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.name || b.nameEn || b.nameAr || "Branch"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Live Polling Active</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "active", label: "Active Orders", count: counts.active },
          { id: "pending", label: "New (Pending)", count: counts.pending },
          { id: "preparing", label: "Preparing", count: counts.preparing },
          { id: "ready", label: "Ready to Serve", count: counts.ready },
          { id: "delivered", label: "Delivered (History)", count: counts.delivered },
          { id: "all", label: "All Orders", count: counts.all },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as StatusFilter)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all whitespace-nowrap shrink-0",
              statusFilter === tab.id
                ? "bg-primary-500 text-black border-primary-500 shadow-md shadow-primary-500/20"
                : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold",
              statusFilter === tab.id
                ? "bg-black/20 text-black"
                : "bg-white/10 text-zinc-300"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size={36} />
        </div>
      ) : branches.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <p className="text-zinc-400">No branches found. Please create a branch in the Admin portal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          <AnimatePresence>
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStatusChange={handleStatusChange} 
              />
            ))}
          </AnimatePresence>
          
          {filteredOrders.length === 0 && (
            <div className="col-span-full py-20 text-center text-neutral-400 glass-panel rounded-2xl border border-white/10">
              <p className="text-lg font-medium text-white mb-1">No orders in this section 👨‍🍳</p>
              <p className="text-sm text-zinc-500">
                {statusFilter === 'delivered' 
                  ? 'Orders marked as Delivered will appear in this history list.' 
                  : 'Orders placed by customers via table QR codes will appear here instantly.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
