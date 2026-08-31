"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { apiClient } from "@/lib/api-client"
import { OrderCard, Order } from "@/components/staff/order-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AnimatePresence } from "framer-motion"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth-client"

interface Branch {
  id: string
  name?: string
  nameEn?: string
  nameAr?: string
}

interface RawOrderItem {
  id?: string
  productId?: string
  product?: { nameAr?: string; nameEn?: string }
  name?: string
  nameEn?: string
  quantity?: number
  note?: string
  selectedAttributes?: string[]
}

interface RawOrder {
  id: string
  table?: { number?: number }
  tableId?: string
  status?: Order["status"]
  notes?: string
  note?: string
  createdAt?: string
  items?: RawOrderItem[]
}

type StatusFilter = "active" | "pending" | "preparing" | "ready" | "delivered" | "all"

function readBranches(data: unknown): Branch[] {
  if (Array.isArray(data)) return data as Branch[]
  if (!data || typeof data !== "object") return []
  const envelope = data as { data?: unknown; branches?: unknown }
  if (Array.isArray(envelope.data)) return envelope.data as Branch[]
  if (Array.isArray(envelope.branches)) return envelope.branches as Branch[]
  return []
}

function readOrders(data: unknown): RawOrder[] {
  if (Array.isArray(data)) return data as RawOrder[]
  if (!data || typeof data !== "object") return []
  const envelope = data as { data?: unknown; orders?: unknown }
  if (Array.isArray(envelope.data)) return envelope.data as RawOrder[]
  if (Array.isArray(envelope.orders)) return envelope.orders as RawOrder[]
  return []
}

function normalizeOrders(rawOrders: RawOrder[]): Order[] {
  return rawOrders.map((order) => ({
    id: order.id,
    tableId: order.table?.number?.toString() ?? order.tableId ?? "1",
    status: order.status ?? "pending",
    note: order.notes ?? order.note ?? "",
    createdAt: order.createdAt ?? new Date().toISOString(),
    items: Array.isArray(order.items) ? order.items.map((item) => ({
      productId: item.productId ?? item.id ?? "unknown-product",
      nameEn: item.product?.nameAr ?? item.product?.nameEn ?? item.nameEn ?? item.name ?? "Menu Item",
      quantity: item.quantity ?? 1,
      note: item.note,
      selectedAttributes: item.selectedAttributes ?? [],
    })) : [],
  }))
}

function requestMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const message = error.response?.data?.message
  return typeof message === "string" ? message : fallback
}

export default function StaffDashboard() {
  const { data: session } = useSession()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/staff/branches")
      const list = readBranches(data)
      setBranches(list)
      setSelectedBranchId(current => list.some((branch) => branch.id === current) ? current : (list[0]?.id ?? ""))
      if (list.length === 0) setLoading(false)
    } catch (error: unknown) {
      console.error("Failed to load branches:", error)
      setError(requestMessage(error, "Unable to load your assigned branch. Please sign in again or contact an admin."))
      setLoading(false)
    }
  }, [])

  const fetchOrders = useCallback(async (branchId: string) => {
    try {
      // Fetch both live active orders and delivered history from production backend
      const [liveRes, historyRes] = await Promise.allSettled([
        apiClient.get(`/staff/orders/${branchId}`),
        apiClient.get(`/staff/orders/${branchId}/history`),
      ])

      if (liveRes.status === "rejected" && historyRes.status === "rejected") {
        throw liveRes.reason
      }

      let combinedRaw: RawOrder[] = []

      if (liveRes.status === "fulfilled") {
        const liveList = readOrders(liveRes.value.data)
        combinedRaw = [...combinedRaw, ...liveList]
      }

      if (historyRes.status === "fulfilled") {
        const histList = readOrders(historyRes.value.data)
        
        // Avoid duplicates if any overlap
        const existingIds = new Set(combinedRaw.map(o => o.id))
        const uniqueHist = histList.filter((order) => !existingIds.has(order.id))
        combinedRaw = [...combinedRaw, ...uniqueHist]
      }

      setOrders(normalizeOrders(combinedRaw))
      setError("")
    } catch (error: unknown) {
      console.error("Failed to fetch live orders:", error)
      setError(requestMessage(error, "Failed to load live orders."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void fetchBranches(), 0)
    return () => window.clearTimeout(initialLoad)
  }, [fetchBranches])

  useEffect(() => {
    if (!selectedBranchId) return

    const refreshOrders = () => {
      if (document.visibilityState === "visible") void fetchOrders(selectedBranchId)
    }
    const initialLoad = window.setTimeout(() => void fetchOrders(selectedBranchId), 0)
    const intervalId = window.setInterval(refreshOrders, 5000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(intervalId)
    }
  }, [fetchOrders, selectedBranchId])

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
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
          {/* Admins can switch branches; cashiers see their fixed assignment. */}
          {session?.user.role === "admin" && branches.length > 1 ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <Building2 className="w-4 h-4 text-primary-400" />
              <select 
                value={selectedBranchId} 
                onChange={(event) => {
                  setOrders([])
                  setError("")
                  setLoading(true)
                  setSelectedBranchId(event.target.value)
                }}
                className="bg-transparent text-sm text-white font-medium focus:outline-none cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.name || b.nameEn || b.nameAr || "Branch"}
                  </option>
                ))}
              </select>
            </div>
          ) : branches[0] ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2" aria-label="Assigned branch">
              <Building2 className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-white font-medium">
                {branches[0].name || branches[0].nameEn || branches[0].nameAr || "Assigned branch"}
              </span>
              {session?.user.role === "cashier" ? <span className="text-[10px] text-zinc-500">Assigned</span> : null}
            </div>
          ) : null}

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
          <p className="text-zinc-400">
            {session?.user.role === "cashier"
              ? "No branch is assigned to your account yet. Ask an admin to assign one from Users."
              : "No branches found. Please create a branch in the Admin portal."}
          </p>
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
