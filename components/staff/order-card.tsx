"use client";

import {
  Loader2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import { OrderElapsed } from "@/components/orders/order-elapsed";

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered";

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameAr?: string;
  quantity: number;
  note?: string;
  selectedAttributes?: string[];
}

export interface Order {
  id: string;
  orderNumber?: number;
  updatedAt?: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  tableId: string;
  status: OrderStatus;
  note: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  canUpdate?: boolean;
  isUpdating?: boolean;
  error?: string;
  onStatusChange: (id: string, newStatus: OrderStatus) => void;
}

const statusConfig: Record<
  OrderStatus,
  {
    statusKey: "statusPending" | "statusPreparing" | "statusReady" | "statusDelivered";
    statusColor: string;
    nextStatus: OrderStatus | null;
    actionKey?: "actionPrepare" | "actionReady" | "actionDeliver";
    actionButtonClass: string;
  }
> = {
  pending: {
    statusKey: "statusPending",
    statusColor: "text-red-400",
    nextStatus: "preparing",
    actionKey: "actionPrepare",
    actionButtonClass:
      "bg-[#f2644b] hover:bg-[#ff735c] text-white shadow-[0_4px_16px_rgba(242,100,75,0.35)] active:scale-[0.96]",
  },
  preparing: {
    statusKey: "statusPreparing",
    statusColor: "text-amber-400",
    nextStatus: "ready",
    actionKey: "actionReady",
    actionButtonClass:
      "bg-[#47aaa1] hover:bg-[#58bdb4] text-white shadow-[0_4px_16px_rgba(71,170,161,0.35)] active:scale-[0.96]",
  },
  ready: {
    statusKey: "statusReady",
    statusColor: "text-emerald-400",
    nextStatus: "delivered",
    actionKey: "actionDeliver",
    actionButtonClass:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] active:scale-[0.96]",
  },
  delivered: {
    statusKey: "statusDelivered",
    statusColor: "text-zinc-400",
    nextStatus: null,
    actionButtonClass: "",
  },
};

function formatElapsedTime(
  createdAt: string,
  t: (key: string, values?: Record<string, string | number>) => string
): {
  label: string;
  isDelayed: boolean;
} {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return { label: t("timeNow"), isDelayed: false };
  if (diffMins === 1) return { label: t("timeMin"), isDelayed: false };
  if (diffMins === 2) return { label: t("time2Mins"), isDelayed: false };
  if (diffMins <= 10)
    return { label: t("timeFewMins", { count: diffMins }), isDelayed: false };
  if (diffMins < 60)
    return { label: t("timeManyMins", { count: diffMins }), isDelayed: diffMins > 15 };

  const diffHours = Math.floor(diffMins / 60);
  return { label: t("timeHours", { count: diffHours }), isDelayed: true };
}

export function OrderCard({
  order,
  onStatusChange,
  isUpdating = false,
  canUpdate = true,
  error,
}: OrderCardProps) {
  const locale = useLocale();
  const t = useTranslations("Staff.orderCard");
  const isRtl = locale !== "en";

  const config = statusConfig[order.status];
  const elapsed = formatElapsedTime(order.createdAt, t);
  const shortId = order.orderNumber?.toString().padStart(4, "0") ?? "—";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full rounded-2xl bg-[#1c1424] border border-white/[0.09] hover:border-white/[0.18] transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.35)] overflow-hidden"
      style={{
        fontFamily: isRtl
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
    >
      {/* Card Header: Table Number + Time */}
      <div className="p-3.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#f2644b]/20 border border-[#f2644b]/30 text-[#ff9d8c] flex items-center justify-center font-black text-base tabular-nums">
            {order.tableId}
          </div>
          <div>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span>{t("table", { number: order.tableId })}</span>
              <bdi className="text-base font-mono font-black text-white">
                #{shortId}
              </bdi>
            </div>
            <div className="text-[0.72rem] text-zinc-400 flex items-center gap-1 font-medium">
              <Clock size={11} className="shrink-0" />
              <OrderElapsed
                createdAt={order.createdAt}
                deliveredAt={order.deliveredAt}
                completed={order.status === "delivered"}
              />
              {elapsed.isDelayed && order.status !== "delivered" && (
                <span className="text-red-400 font-bold mx-1">{t("delayed")}</span>
              )}
            </div>
          </div>
        </div>

        <span className={`text-xs font-black ${config.statusColor}`}>
          {t(config.statusKey)}
        </span>
      </div>

      {/* Card Content & Items */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {/* Customer Notes */}
        {order.note && (
          <div className="bg-[#f2644b]/10 border border-[#f2644b]/20 rounded-xl p-2.5 text-xs space-y-1">
            <div className="font-bold text-[#ff9d8c] flex items-center gap-1.5 text-[0.72rem]">
              <MessageSquare size={13} className="shrink-0" />
              <span>{t("notes")}</span>
            </div>
            <div className="text-zinc-200 text-xs leading-relaxed whitespace-pre-line">
              {order.note}
            </div>
          </div>
        )}

        {/* Items List */}
        <ul className="space-y-2 divide-y divide-white/[0.04]">
          {order.items.map((item, idx) => {
            const hasAttrs =
              item.selectedAttributes && item.selectedAttributes.length > 0;
            const itemName = isRtl
              ? item.nameAr || item.nameEn || "عنصر"
              : item.nameEn || item.nameAr || "Item";

            return (
              <li key={idx} className="pt-1.5 first:pt-0 space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-[#ff9d8c] text-xs font-mono tabular-nums shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="text-white font-bold text-xs sm:text-sm leading-snug">
                    {itemName}
                  </span>
                </div>

                {hasAttrs && (
                  <div className={`flex flex-wrap gap-1 ${isRtl ? "mr-6" : "ml-6"}`}>
                    {item.selectedAttributes!.map((attr, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-[9px] bg-white/[0.06] text-zinc-300 px-1.5 py-0.5 rounded font-medium"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                )}

                {item.note && (
                  <div className={`text-[11px] text-zinc-400 italic ${isRtl ? "mr-6" : "ml-6"}`}>
                    {item.note}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {error && (
        <p role="alert" className="px-4 pb-3 text-xs text-red-300">
          {error}
        </p>
      )}
      {order.status === "ready" && (
        <p className="px-4 pb-3 text-xs text-emerald-300">
          {t("statusReadyHint", { code: shortId })}
        </p>
      )}

      {/* Card Action Footer */}
      <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] mt-auto">
        {config.nextStatus && canUpdate ? (
          <button
            type="button"
            disabled={isUpdating}
            aria-busy={isUpdating}
            onClick={() => onStatusChange(order.id, config.nextStatus!)}
            className={`w-full min-h-[48px] rounded-xl font-black text-xs sm:text-sm px-4 flex items-center justify-between transition-all disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${config.actionButtonClass}`}
          >
            <span>
              {isUpdating ? t("updating") : config.actionKey ? t(config.actionKey) : ""}
            </span>
            {isUpdating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ChevronIcon size={18} />
            )}
          </button>
        ) : (
          <div className="w-full min-h-[38px] rounded-xl bg-white/[0.03] text-zinc-400 flex items-center justify-center gap-1.5 text-xs font-bold">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>
              {order.status === "delivered"
                ? t("deliveredBadge")
                : t("waitingBadge")}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
