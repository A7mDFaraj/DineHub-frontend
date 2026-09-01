"use client"

import { useCallback, useEffect, useState } from "react"
import axios from "axios"
import { apiClient } from "@/lib/api-client"
import { OrderCard, Order } from "@/components/staff/order-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { AnimatePresence } from "framer-motion"
import { Building2, ChevronDown, Inbox, RefreshCw } from "lucide-react"
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
  nameAr?: string
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
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productId: item.productId ?? item.id ?? "unknown-product",
          nameAr: item.product?.nameAr ?? item.nameAr ?? item.name,
          nameEn: item.product?.nameEn ?? item.nameEn ?? item.name ?? "عنصر",
          quantity: item.quantity ?? 1,
          note: item.note,
          selectedAttributes: item.selectedAttributes ?? [],
        }))
      : [],
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState("")

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/staff/branches")
      const list = readBranches(data)
      setBranches(list)
      setSelectedBranchId((current) =>
        list.some((branch) => branch.id === current) ? current : (list[0]?.id ?? "")
      )
      if (list.length === 0) setLoading(false)
    } catch (err: unknown) {
      console.error("Failed to load branches:", err)
      setError(
        requestMessage(
          err,
          "تعذر تحميل الفرع المعين لحسابك. يرجى إعادة تسجيل الدخول أو مراجعة المشرف."
        )
      )
      setLoading(false)
    }
  }, [])

  const fetchOrders = useCallback(
    async (branchId: string, isManual = false) => {
      if (isManual) setIsRefreshing(true)
      try {
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
          const existingIds = new Set(combinedRaw.map((o) => o.id))
          const uniqueHist = histList.filter((order) => !existingIds.has(order.id))
          combinedRaw = [...combinedRaw, ...uniqueHist]
        }

        setOrders(normalizeOrders(combinedRaw))
        setError("")
      } catch (err: unknown) {
        console.error("Failed to fetch live orders:", err)
        setError(requestMessage(err, "تعذر استرجاع قائمة الطلبات الحالية."))
      } finally {
        setLoading(false)
        if (isManual) setIsRefreshing(false)
      }
    },
    []
  )

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
    const intervalId = window.setInterval(refreshOrders, 4000)

    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(intervalId)
    }
  }, [fetchOrders, selectedBranchId])

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as Order["status"] } : o))
    )

    try {
      await apiClient.patch(`/staff/orders/${orderId}/status`, { status: newStatus })
      if (selectedBranchId) {
        await fetchOrders(selectedBranchId)
      }
    } catch (err) {
      console.error("Failed to update order status:", err)
      if (selectedBranchId) {
        fetchOrders(selectedBranchId)
      }
    }
  }

  const counts = {
    active: orders.filter((o) => o.status !== "delivered").length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    all: orders.length,
  }

  const filteredOrders = orders
    .filter((o) => {
      if (statusFilter === "active") return o.status !== "delivered"
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

  const isAdmin = session?.user?.role === "admin"

  return (
    <div className="space-y-4 pb-16">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#181120] border border-white/[0.08] p-3 sm:p-4 rounded-2xl">
        <h1 className="text-lg sm:text-xl font-black text-white">الطلبات الواردة</h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin Branch Selector / Fixed Assigned Branch */}
          {isAdmin && branches.length > 1 ? (
            <div className="relative flex items-center bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-1.5">
              <Building2 size={13} className="text-[#8cd1ca] ml-2 shrink-0" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setOrders([])
                  setError("")
                  setLoading(true)
                  setSelectedBranchId(e.target.value)
                }}
                className="bg-transparent text-xs sm:text-sm text-white font-bold focus:outline-none cursor-pointer appearance-none pl-6 pr-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[#1a1222] text-white">
                    {b.nameAr || b.name || b.nameEn || "فرع"}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-zinc-400 absolute left-2 pointer-events-none" />
            </div>
          ) : branches[0] ? (
            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-bold">
              <Building2 size={13} className="text-[#8cd1ca]" />
              <span>{branches[0].nameAr || branches[0].name || branches[0].nameEn || "الفرع المعين"}</span>
            </div>
          ) : null}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => selectedBranchId && fetchOrders(selectedBranchId, true)}
            disabled={isRefreshing || !selectedBranchId}
            className="h-9 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="تحديث"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-[#8cd1ca]" : ""} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "active", label: "النشطة", count: counts.active },
          { id: "pending", label: "جديدة", count: counts.pending },
          { id: "preparing", label: "قيد التجهيز", count: counts.preparing },
          { id: "ready", label: "جاهزة للتسليم", count: counts.ready },
          { id: "delivered", label: "سجل التسليم", count: counts.delivered },
          { id: "all", label: "الكل", count: counts.all },
        ].map((tab) => {
          const isActive = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as StatusFilter)}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#f2644b] text-white border-transparent shadow-[0_4px_16px_rgba(242,100,75,0.35)]"
                  : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold tabular-nums ${
                  isActive ? "bg-black/25 text-white" : "bg-white/[0.08] text-zinc-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-2xl text-xs font-bold">
          {error}
        </div>
      )}

      {/* Main Grid or Loading / Empty States */}
      {loading && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-400">
          <LoadingSpinner size={36} />
          <p className="text-xs font-bold">جارٍ جلب الطلبات الواردة…</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-[#1c1424] border border-white/[0.08] p-12 text-center rounded-2xl">
          <p className="text-zinc-400 text-sm">
            {session?.user.role === "cashier"
              ? "لم يتم تعيين فرع لحسابك حتى الآن. يرجى التواصل مع المشرف لتحديد الفرع."
              : "لا توجد فروع مسجلة. يرجى إنشاء فرع من لوحة الإدارة أولاً."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5 items-start">
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
            <div className="col-span-full py-16 text-center bg-[#1c1424] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-1">
                <Inbox size={22} />
              </div>
              <p className="text-base font-bold text-white">لا توجد طلبات في هذا القسم حالياً</p>
              <p className="text-xs text-zinc-400 max-w-sm">
                {statusFilter === "delivered"
                  ? "الطلبات التي تم تسليمها للعملاء ستظهر في هذا السجل."
                  : "عند قيام العملاء بمسح الرمز وإرسال الطلبات ستظهر هنا فوراً."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
