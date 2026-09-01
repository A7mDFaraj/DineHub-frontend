"use client"

import { useEffect, useState, use } from "react"
import { apiClient } from "@/lib/api-client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, Radio, Sparkles, ShoppingBag } from "lucide-react"
import Link from "next/link"

type OrderStatus = "pending" | "preparing" | "ready" | "delivered"

interface OrderData {
  id: string
  status: OrderStatus
  total?: number
  note?: string
  createdAt?: string
  table?: { number?: number }
  tableId?: string
  items?: { nameEn?: string; nameAr?: string; quantity: number }[]
}

const statusMap: Record<
  OrderStatus,
  {
    label: string
    sublabel: string
    icon: React.ReactNode
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  pending: {
    label: "تم استلام طلبك بنجاح",
    sublabel: "طلبك مسجل في النظام وفي انتظار بدء التجهيز",
    icon: <Clock className="w-9 h-9" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  preparing: {
    label: "قيد التجهيز والإعداد",
    sublabel: "فريق العمل يقوم حالياً بتجهيز وإعداد طلبك بعناية",
    icon: <Radio className="w-9 h-9 animate-pulse text-amber-500" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  ready: {
    label: "طلبك جاهز للتسليم!",
    sublabel: "طلبك جاهز تماماً وهو في طريقه إلى طاولتك الآن",
    icon: <Sparkles className="w-9 h-9 animate-bounce text-emerald-500" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  delivered: {
    label: "تم تسليم الطلب • بالهناء والعافية",
    sublabel: "نتمنى لك أطيب الأوقات! يسعدنا خدمتك دائماً",
    icon: <CheckCircle2 className="w-9 h-9 text-stone-600" />,
    color: "text-stone-800",
    bgColor: "bg-stone-100",
    borderColor: "border-stone-200",
  },
}

const statusOrder: OrderStatus[] = ["pending", "preparing", "ready", "delivered"]

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ branchId: string; orderId: string }>
}) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiClient.get(`/orders/${resolvedParams.orderId}`)
        if (res.data) {
          const raw = res.data.data || res.data
          setOrder(raw)
        }
        setLoading(false)
      } catch (err) {
        console.error("Failed to load order:", err)
        setLoading(false)
      }
    }

    fetchOrder()
    const intervalId = setInterval(fetchOrder, 3500)
    return () => clearInterval(intervalId)
  }, [resolvedParams.orderId])

  if (loading || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-stone-700">
        <LoadingSpinner size={36} />
        <p className="text-xs text-stone-500 font-bold animate-pulse">جارٍ العثور على تفاصيل طلبك…</p>
      </div>
    )
  }

  const currentStatusConfig = statusMap[order.status] || statusMap.pending
  const currentStepIndex = statusOrder.indexOf(order.status)
  const shortId = order.id.slice(-4).toUpperCase()
  const tableNum = order.table?.number || order.tableId || ""

  return (
    <div 
      className="py-6 max-w-md mx-auto space-y-5" 
      dir="rtl"
      style={{ fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif" }}
    >
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-stone-200 text-xs font-mono font-bold text-stone-600 shadow-sm">
          <span>طلب #{shortId}</span>
          {tableNum && <span className="text-stone-800 font-bold">• طاولة {tableNum}</span>}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">متابعة حالة الطلب المباشرة</h1>
      </div>

      {/* Main Status Display Card */}
      <motion.div
        key={order.status}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`p-6 rounded-3xl ${currentStatusConfig.bgColor} border ${currentStatusConfig.borderColor} flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden`}
      >
        <div className="w-18 h-18 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-3.5 shadow-sm">
          {currentStatusConfig.icon}
        </div>

        <h2 className={`text-lg sm:text-xl font-black mb-1 ${currentStatusConfig.color}`}>
          {currentStatusConfig.label}
        </h2>
        <p className="text-xs text-stone-600 max-w-xs leading-relaxed font-medium">
          {currentStatusConfig.sublabel}
        </p>
      </motion.div>

      {/* Step Progress Timeline Card */}
      <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          مراحل تجهيز وتوصيل الطلب
        </h3>

        <div className="space-y-4">
          {statusOrder.map((step, index) => {
            const isActive = index <= currentStepIndex
            const isCurrent = index === currentStepIndex
            const config = statusMap[step]

            return (
              <div key={step} className="flex items-center gap-3.5 relative">
                {/* Connecting line on right in RTL */}
                {index < statusOrder.length - 1 && (
                  <div
                    className={`absolute right-[11px] top-7 w-0.5 h-6 transition-colors ${
                      index < currentStepIndex ? "bg-emerald-500" : "bg-stone-200"
                    }`}
                  />
                )}

                {/* Node */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                    isActive
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                      : "border-stone-200 bg-stone-50 text-transparent"
                  }`}
                >
                  {isActive && <CheckCircle2 size={13} className="fill-emerald-500 text-white" />}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-bold transition-colors ${
                      isActive ? "text-stone-900 font-extrabold" : "text-stone-400 font-medium"
                    }`}
                  >
                    {config.label}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-amber-600 font-bold mt-0.5 animate-pulse">
                      جاري التنفيذ حالياً…
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Return to Menu Button */}
      {tableNum && (
        <div className="text-center pt-2">
          <Link
            href={`/menu/${resolvedParams.branchId}/${tableNum}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-xs sm:text-sm font-bold text-stone-800 transition-all active:scale-[0.96] shadow-sm"
          >
            <ShoppingBag size={16} />
            <span>طلب المزيد أو العودة إلى قائمة الطعام</span>
          </Link>
        </div>
      )}
    </div>
  )
}
