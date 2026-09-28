"use client";

import { useEffect, useState, use } from "react";
import { apiClient } from "@/lib/api-client";
import { subscribeToEvents } from "@/lib/event-stream";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Radio,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { ReadyAlert, OrderRating } from "@/components/customer/order-feedback";
import { Link, useRouter } from "@/i18n/navigation";
import { OrderElapsed } from "@/components/orders/order-elapsed";
import { useLocale, useTranslations } from "next-intl";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";

type OrderStatus = "pending" | "preparing" | "ready" | "delivered";

interface OrderData {
  rating?: number | null;
  publicToken: string;
  orderNumber: number;
  menuPath: string;
  trackingPath: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  status: OrderStatus;
  total?: number;
  note?: string;
  createdAt?: string;
  table?: { number?: number };
  tableId?: string;
  items?: { nameEn?: string; nameAr?: string; quantity: number }[];
  branch?: {
    publicCode?: string;
    name?: string;
    nameAr?: string;
    nameEn?: string;
    googleReviewUrl?: string | null;
    enableReviews?: boolean;
  };
}

const statusOrder: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "delivered",
];

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ branchId?: string; orderId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("CustomerOrderTracking");
  const isRtl = locale === "ar";

  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  const statusMap: Record<
    OrderStatus,
    {
      label: string;
      sublabel: string;
      icon: React.ReactNode;
      color: string;
      bgColor: string;
      borderColor: string;
    }
  > = {
    pending: {
      label: t("statusPending"),
      sublabel: t("statusPendingSub"),
      icon: <Clock className="w-10 h-10 text-sky-600 animate-pulse" />,
      color: "text-sky-900",
      bgColor: "bg-gradient-to-br from-sky-50 via-white to-blue-50/70",
      borderColor: "border-sky-200/80",
    },
    preparing: {
      label: t("statusPreparing"),
      sublabel: t("statusPreparingSub"),
      icon: <Radio className="w-10 h-10 text-amber-500 animate-pulse" />,
      color: "text-amber-950",
      bgColor: "bg-gradient-to-br from-amber-50 via-white to-orange-50/70",
      borderColor: "border-amber-200/80",
    },
    ready: {
      label: t("statusReady"),
      sublabel: t("statusReadySub"),
      icon: <Sparkles className="w-10 h-10 text-emerald-500 animate-bounce" />,
      color: "text-emerald-950",
      bgColor: "bg-gradient-to-br from-emerald-50 via-white to-teal-50/80",
      borderColor: "border-emerald-300/80",
    },
    delivered: {
      label: t("statusDelivered"),
      sublabel: t("statusDeliveredSub"),
      icon: <CheckCircle2 className="w-10 h-10 text-emerald-600" />,
      color: "text-stone-900",
      bgColor: "bg-gradient-to-br from-stone-50 via-white to-emerald-50/40",
      borderColor: "border-stone-200/90",
    },
  };

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let queued = false;
    const controller = new AbortController();
    const fetchOrder = async () => {
      if (!active) return;
      if (inFlight) {
        queued = true;
        return;
      }
      queued = false;
      inFlight = true;
      try {
        const res = await apiClient.get(`/orders/${resolvedParams.orderId}`, {
          signal: controller.signal,
        });
        if (!active) return;
        const raw: OrderData = res.data.data || res.data;
        if (
          !statusOrder.includes(raw.status) ||
          typeof raw.publicToken !== "string" ||
          !Number.isInteger(raw.orderNumber)
        )
          throw new Error("Invalid order response");
        setOrder((previous) =>
          previous?.publicToken === raw.publicToken &&
          statusOrder.indexOf(previous.status) >
            statusOrder.indexOf(raw.status)
            ? previous
            : raw,
        );
        setError("");
        const currentPathWithoutLocale = window.location.pathname.replace(
          /^\/(en|ar)/,
          "",
        );
        if (
          raw.trackingPath &&
          raw.trackingPath !== currentPathWithoutLocale &&
          raw.trackingPath !== window.location.pathname
        ) {
          router.replace(raw.trackingPath);
        }
      } catch {
        if (active) {
          setError(t("loadError"));
        }
      } finally {
        inFlight = false;
        if (active) setLoading(false);
        if (queued && active) void fetchOrder();
      }
    };
    void fetchOrder();
    const closeStream = subscribeToEvents(
      `/orders/${encodeURIComponent(resolvedParams.orderId)}/stream`,
      (event) => {
        if (event.type === "connected" || event.type.startsWith("order."))
          void fetchOrder();
      },
    );
    const reconciliation = window.setInterval(() => void fetchOrder(), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchOrder();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      controller.abort();
      closeStream();
      window.clearInterval(reconciliation);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [resolvedParams.orderId, router, retry, t]);

  if (!loading && !order) {
    return (
      <div className="min-h-screen bg-[#fcfbfa] flex items-center justify-center p-4">
        <div
          dir={isRtl ? "rtl" : "ltr"}
          role="alert"
          className="max-w-md w-full p-6 rounded-3xl bg-red-50/90 border border-red-200 text-red-800 text-center space-y-4 shadow-sm"
        >
          <p className="font-bold">{error || t("loadError")}</p>
          <button
            className="min-h-11 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs transition-transform active:scale-[0.96]"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            {isRtl ? "إعادة المحاولة" : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-[#fcfbfa] flex flex-col items-center justify-center gap-3 text-stone-700">
        <LoadingSpinner size={36} />
        <p className="text-xs text-stone-500 font-bold animate-pulse">
          {isRtl ? "جارٍ العثور على تفاصيل طلبك…" : "Finding your order details…"}
        </p>
      </div>
    );
  }

  const currentStatusConfig = statusMap[order.status] || statusMap.pending;
  const currentStepIndex = statusOrder.indexOf(order.status);
  const shortId = order.orderNumber?.toString().padStart(4, "0") ?? "—";
  const tableNum = order.table?.number ?? "";

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#fbf9f5] via-[#f7f4ec] to-[#f0ebde] text-stone-900 py-6 sm:py-10 px-4"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        fontFamily: isRtl
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
    >
      <div className="max-w-md mx-auto space-y-5">
        {/* Top Header with Language Switcher */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200/90 text-xs font-mono font-bold text-stone-700 shadow-xs">
            <span>
              {t("orderNumber")}
              {shortId}
            </span>
            {tableNum && (
              <span className="text-stone-900 font-extrabold">
                • {t("table")} {tableNum}
              </span>
            )}
          </div>

          <AdminLanguageSwitcher variant="light" />
        </div>

        {/* Page Title & Status Header */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] font-bold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isRtl ? "تحديث مباشر وتفاعلي" : "Live Realtime Tracking"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight">
            {isRtl ? "متابعة حالة الطلب" : "Live Order Status"}
          </h1>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-sm font-semibold text-red-800 shadow-xs"
          >
            {error}
          </p>
        )}

        {/* VIP Order Pass Card */}
        <div className="rounded-3xl border border-stone-200/90 bg-white/95 backdrop-blur-md p-5 sm:p-6 text-center space-y-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400" />
          <p className="text-xs font-bold text-stone-500 tracking-wide uppercase">
            {isRtl
              ? "أظهر هذا الرمز للموظف عند استلام الطلب"
              : "Show this code to staff upon receiving your order"}
          </p>
          <p
            dir="ltr"
            className="font-mono text-4xl sm:text-5xl font-black tracking-wider text-stone-950 select-all"
          >
            #{shortId}
          </p>
          {order.createdAt && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/90 text-xs text-stone-600 font-semibold tabular-nums">
              <Clock size={12} className="text-stone-400" />
              <OrderElapsed
                createdAt={order.createdAt}
                deliveredAt={order.deliveredAt}
                completed={order.status === "delivered"}
              />
            </div>
          )}
        </div>

        {/* Audio / Screen Wake Alert */}
        <ReadyAlert status={order.status} token={order.publicToken} />

        {/* Review & Google Review Prompts (Optional via Settings) */}
        {order.status === "delivered" &&
          order.branch?.enableReviews !== false && (
            <OrderRating
              token={order.publicToken}
              initialRating={order.rating}
              googleReviewUrl={order.branch?.googleReviewUrl}
            />
          )}

        {/* Main Status Display Card */}
        <motion.div
          key={order.status}
          initial={false}
          animate={{ scale: 1, opacity: 1 }}
          aria-live="polite"
          className={`p-6 rounded-3xl ${currentStatusConfig.bgColor} border ${currentStatusConfig.borderColor} flex flex-col items-center justify-center text-center shadow-[0_12px_36px_rgba(0,0,0,0.04)] relative overflow-hidden`}
        >
          <div className="w-18 h-18 rounded-2xl bg-white border border-stone-200/90 flex items-center justify-center mb-3.5 shadow-sm">
            {currentStatusConfig.icon}
          </div>

          <h2
            className={`text-xl sm:text-2xl font-black mb-1.5 ${currentStatusConfig.color}`}
          >
            {currentStatusConfig.label}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xs leading-relaxed font-medium">
            {currentStatusConfig.sublabel}
          </p>
        </motion.div>

        {/* Step Progress Timeline Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200/90 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            {isRtl ? "مراحل تجهيز وتوصيل الطلب" : "Order Preparation Steps"}
          </h3>

          <div className="space-y-4">
            {statusOrder.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const config = statusMap[step];
              const time =
                step === "pending"
                  ? order.createdAt
                  : step === "preparing"
                    ? order.acceptedAt
                    : step === "ready"
                      ? order.readyAt
                      : order.deliveredAt;

              return (
                <div key={step} className="flex items-center gap-3.5 relative">
                  {/* Connecting line */}
                  {index < statusOrder.length - 1 && (
                    <div
                      className={`absolute ${isRtl ? "right-[11px]" : "left-[11px]"} top-7 w-0.5 h-6 transition-colors ${
                        index < currentStepIndex
                          ? "bg-emerald-500"
                          : "bg-stone-200"
                      }`}
                    />
                  )}

                  {/* Node */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-all ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                        : "border-stone-300 bg-stone-50 text-transparent"
                    }`}
                  >
                    {isActive && (
                      <CheckCircle2
                        size={14}
                        className="text-white"
                        strokeWidth={2.5}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold transition-colors ${
                        isActive
                          ? "text-stone-900 font-extrabold"
                          : "text-stone-400 font-medium"
                      }`}
                    >
                      {config.label}
                    </p>
                    {time && (
                      <time
                        dateTime={time}
                        className="text-xs text-stone-500 tabular-nums font-mono"
                      >
                        {new Date(time).toLocaleTimeString(
                          isRtl ? "ar-SA" : "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </time>
                    )}
                    {isCurrent && step !== "delivered" && (
                      <p className="text-[11px] text-amber-600 font-bold mt-0.5 animate-pulse">
                        {isRtl ? "جاري التنفيذ حالياً…" : "In progress right now…"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Return to Menu Button */}
        {order.menuPath && (
          <div className="text-center pt-2">
            <Link
              href={order.menuPath}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.96]"
            >
              <ShoppingBag size={16} />
              <span>
                {isRtl
                  ? "طلب المزيد أو العودة إلى قائمة الطعام"
                  : "Order more or return to menu"}
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
