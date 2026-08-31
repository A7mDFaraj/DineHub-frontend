import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, ChevronRight, MessageSquare, Sparkles } from "lucide-react"
import { motion } from "framer-motion"

type OrderStatus = "pending" | "preparing" | "ready" | "delivered"

export interface OrderItem {
  productId: string
  nameEn: string
  quantity: number
  note?: string
  selectedAttributes?: string[]
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
            <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-lg border border-primary-500/30">
              {order.tableId}
            </div>
            <div>
              <div className="font-mono text-sm text-zinc-300 font-semibold">Table #{order.tableId} <span className="text-zinc-500 font-normal">#{order.id.slice(-4).toUpperCase()}</span></div>
              <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
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
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Order / Item Customizations Note */}
          {order.note && (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 text-xs text-primary-200 space-y-1">
              <div className="font-bold text-primary-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Special Instructions & Notes / ملاحظات:</span>
              </div>
              <div className="whitespace-pre-line font-arabic text-xs leading-relaxed text-zinc-200">
                {order.note}
              </div>
            </div>
          )}
          
          <ul className="space-y-3 divide-y divide-white/5">
            {order.items.map((item, idx) => {
              const hasItemAttrs = item.selectedAttributes && item.selectedAttributes.length > 0;
              const hasItemNote = Boolean(item.note);

              return (
                <li key={idx} className="pt-2 first:pt-0 space-y-1">
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-primary-400 min-w-[24px] font-mono">{item.quantity}x</span>
                      <span className="text-white font-medium">{item.nameEn}</span>
                    </div>
                  </div>

                  {/* Render item-level attributes if passed from backend */}
                  {hasItemAttrs && (
                    <div className="flex flex-wrap gap-1 ml-8">
                      {item.selectedAttributes!.map((attr, aIdx) => (
                        <span key={aIdx} className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded">
                          {attr}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Render item-level note if passed from backend */}
                  {hasItemNote && (
                    <div className="text-xs text-zinc-400 italic ml-8 font-arabic">
                      Note: {item.note}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        
        <div className="p-4 border-t border-white/5 mt-auto">
          {config.nextStatus ? (
            <Button 
              variant={order.status === 'pending' ? 'primary' : 'secondary'} 
              className="w-full justify-between group h-11 rounded-xl font-bold"
              onClick={() => onStatusChange(order.id, config.nextStatus!)}
            >
              <span>{config.actionLabel}</span>
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button variant="ghost" className="w-full cursor-default text-zinc-500 h-11" disabled>
              <CheckCircle2 size={16} className="mr-2" /> Completed
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
