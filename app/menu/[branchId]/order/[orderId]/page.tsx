"use client"

import { useEffect, useState, use } from "react"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { motion } from "framer-motion"
import { CheckCircle2, ChefHat, Clock, Utensils } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type OrderStatus = "pending" | "preparing" | "ready" | "delivered"

interface OrderData {
  id: string
  status: OrderStatus
  total: number
  items: { nameEn: string; quantity: number }[]
}

const statusMap: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Order Received", icon: <Clock className="w-8 h-8" />, color: "text-blue-500" },
  preparing: { label: "Preparing", icon: <ChefHat className="w-8 h-8" />, color: "text-amber-500" },
  ready: { label: "Ready to Serve", icon: <Utensils className="w-8 h-8" />, color: "text-emerald-500" },
  delivered: { label: "Delivered", icon: <CheckCircle2 className="w-8 h-8" />, color: "text-neutral-400" },
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
        // const res = await apiClient.get(`/orders/${resolvedParams.orderId}`)
        // setOrder(res.data)
        
        // Mocking for UI demonstration
        setOrder(prev => {
          if (!prev) {
            return {
              id: resolvedParams.orderId,
              status: "pending",
              total: 45.0,
              items: [{ nameEn: "Classic Burger", quantity: 1 }]
            }
          }
          // Simulate status progression for demonstration
          const currentIndex = statusOrder.indexOf(prev.status)
          if (currentIndex < statusOrder.length - 1 && Math.random() > 0.5) {
             return { ...prev, status: statusOrder[currentIndex + 1] }
          }
          return prev
        })
        setLoading(false)
      } catch (error) {
        console.error("Failed to load order", error)
      }
    }

    fetchOrder() // initial fetch
    
    // Polling every 5 seconds as requested in PRD
    const intervalId = setInterval(fetchOrder, 5000)

    return () => clearInterval(intervalId)
  }, [resolvedParams.orderId])

  if (loading || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <LoadingSpinner size={32} />
        <p className="text-neutral-400">Finding your order...</p>
      </div>
    )
  }

  const currentStatusConfig = statusMap[order.status]
  const currentStepIndex = statusOrder.indexOf(order.status)

  return (
    <div className="py-8 max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Order #{order.id.slice(-4).toUpperCase()}</h1>
        <p className="text-neutral-400 text-sm">We are taking care of your meal</p>
      </div>

      {/* Main Status Display */}
      <motion.div 
        key={order.status}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <div className={`w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,0,0,0.2)] ${currentStatusConfig.color}`}>
          {currentStatusConfig.icon}
        </div>
        <h2 className={`text-2xl font-bold ${currentStatusConfig.color}`}>
          {currentStatusConfig.label}
        </h2>
      </motion.div>

      {/* Progress Track */}
      <Card className="p-6">
        <div className="space-y-6">
          {statusOrder.map((step, index) => {
            const isActive = index <= currentStepIndex
            const isCurrent = index === currentStepIndex
            const config = statusMap[step]
            
            return (
              <div key={step} className="flex items-center gap-4 relative">
                {/* Connecting line */}
                {index < statusOrder.length - 1 && (
                  <div className={`absolute left-[11px] top-8 w-0.5 h-10 ${index < currentStepIndex ? 'bg-amber-500' : 'bg-white/10'}`} />
                )}
                
                {/* Node */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                  isActive 
                    ? 'border-amber-500 bg-amber-500/20 text-amber-500' 
                    : 'border-white/10 bg-neutral-900 text-transparent'
                }`}>
                  {isActive && <CheckCircle2 size={12} className="fill-amber-500 text-neutral-900" />}
                </div>
                
                {/* Label */}
                <div>
                  <p className={`font-medium transition-colors ${isActive ? 'text-white' : 'text-neutral-500'}`}>
                    {config.label}
                  </p>
                  {isCurrent && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs text-amber-500 mt-1"
                    >
                      Currently in progress...
                    </motion.p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="text-center">
         <Link href={`/menu/${resolvedParams.branchId}/1`}>
            <Button variant="ghost" className="text-neutral-400">
              Return to Menu
            </Button>
         </Link>
      </div>
    </div>
  )
}
