import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, ChevronRight, XCircle } from "lucide-react"
import { motion } from "framer-motion"

type OrderStatus = "pending" | "preparing" | "ready" | "delivered"

interface OrderItem {
  productId: string
  nameEn: string
  quantity: number
  note?: string
}

export interface Order {
  id: string
  tableId: string
  status: OrderStatus
  note: string
  createdAt: string
  items: OrderItem[]
}

interface OrderCardProps {
  order: Order
  onStatusChange: (id: string, newStatus: OrderStatus) => void
}

const statusConfig: Record<OrderStatus, { color: "default" | "primary" | "success" | "secondary" | "destructive" | "outline", nextStatus: OrderStatus | null, label: string, actionLabel: string }> = {
  pending: { color: "destructive", nextStatus: "preparing", label: "New", actionLabel: "Accept & Prepare" },
  preparing: { color: "primary", nextStatus: "ready", label: "Preparing", actionLabel: "Mark Ready" },
  ready: { color: "success", nextStatus: "delivered", label: "Ready", actionLabel: "Mark Delivered" },
  delivered: { color: "secondary", nextStatus: null, label: "Delivered", actionLabel: "" },
}

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const config = statusConfig[order.status]
  
  // Format time (e.g. 10:45 AM)
  const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  
  // Calculate how long ago the order was placed (in minutes)
  const diffMinutes = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="flex flex-col h-full border-white/10 hover:border-white/20 transition-colors">
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg border border-amber-500/20">
              {order.tableId}
            </div>
            <div>
              <div className="font-mono text-sm text-neutral-400">#{order.id.slice(-4).toUpperCase()}</div>
              <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {time} 
                {diffMinutes > 15 && order.status !== 'delivered' && (
                  <span className="text-red-400 font-medium ml-1">({diffMinutes}m ago)</span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={config.color} className="text-xs capitalize">
            {config.label}
          </Badge>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {order.note && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-200 flex items-start gap-2">
              <span className="font-bold text-red-400">Note:</span> {order.note}
            </div>
          )}
          
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-amber-500 min-w-[20px]">{item.quantity}x</span>
                  <span className="text-neutral-200">{item.nameEn}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="p-4 border-t border-white/5 mt-auto">
          {config.nextStatus ? (
            <Button 
              variant={order.status === 'pending' ? 'primary' : 'secondary'} 
              className="w-full justify-between group"
              onClick={() => onStatusChange(order.id, config.nextStatus!)}
            >
              <span>{config.actionLabel}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button variant="ghost" className="w-full cursor-default text-neutral-500" disabled>
              <CheckCircle2 size={16} className="mr-2" /> Completed
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
