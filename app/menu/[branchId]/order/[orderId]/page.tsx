"use client";

import { useEffect, useState, use } from "react";
import { apiClient } from "@/lib/api-client";
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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderElapsed } from "@/components/orders/order-elapsed";

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
}

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
    icon: <Radio className="w-9 h-9 text-amber-500" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  ready: {
    label: "طلبك جاهز للتسليم!",
    sublabel: "طلبك جاهز تماماً وهو في طريقه إلى طاولتك الآن",
    icon: <Sparkles className="w-9 h-9 text-emerald-500" />,
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
};

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
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const fetchOrder = async () => {
      let finished = false;
      try {
        const res = await apiClient.get(`/orders/${resolvedParams.orderId}`, {
          signal: controller.signal,
        });
        if (!active) return;
        const raw: OrderData = res.data.data || res.data;
        setOrder(raw);
        setError("");
        finished = raw.status === "delivered";
        if (raw.trackingPath && raw.trackingPath !== window.location.pathname)
          router.replace(raw.trackingPath);
      } catch {
        if (active)
          setError(
            "تعذر تحديث حالة الطلب. تحقق من اتصالك؛ آخر حالة مؤكدة ستبقى ظاهرة.",
          );
      } finally {
        if (active) {
          setLoading(false);
          if (!finished) timer = setTimeout(fetchOrder, 3500);
        }
      }
    };
    void fetchOrder();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [resolvedParams.orderId, router, retry]);

  if (!loading && !order)
    return (
      <div
        dir="rtl"
        role="alert"
        className="p-6 rounded-2xl bg-red-50 text-red-800 text-center space-y-4"
      >
        <p>{error || "تعذر العثور على الطلب."}</p>
        <button
          className="min-h-11 px-5 rounded-xl border focus-visible:outline-2"
          onClick={() => {
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          إعادة المحاولة
        </button>
      </div>
    );

  if (loading || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-stone-700">
        <LoadingSpinner size={36} />
        <p className="text-xs text-stone-500 font-bold animate-pulse">
          جارٍ العثور على تفاصيل طلبك…
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
      className="py-6 max-w-md mx-auto space-y-5"
      dir="rtl"
      style={{
        fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif",
      }}
    >
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-stone-200 text-xs font-mono font-bold text-stone-600 shadow-sm">
          <span>طلب #{shortId}</span>
          {tableNum && (
            <span className="text-stone-800 font-bold">• طاولة {tableNum}</span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900">
          متابعة حالة الطلب المباشرة
        </h1>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center space-y-2">
        <p className="text-sm font-bold">
          أظهر هذا الرمز للموظف عند استلام الطلب
        </p>
        <p dir="ltr" className="font-mono text-3xl font-black tracking-wider">
          #{shortId}
        </p>
        {order.createdAt && (
          <p className="text-xs text-stone-600">
            <OrderElapsed
              createdAt={order.createdAt}
              deliveredAt={order.deliveredAt}
              completed={order.status === "delivered"}
            />
          </p>
        )}
      </div>
      <ReadyAlert status={order.status} token={order.publicToken} />
      {order.status === "delivered" && (
        <OrderRating token={order.publicToken} initialRating={order.rating} />
      )}
      {/* Main Status Display Card */}
      <motion.div
        key={order.status}
        initial={false}
        animate={{ scale: 1, opacity: 1 }}
        aria-live="polite"
        className={`p-6 rounded-3xl ${currentStatusConfig.bgColor} border ${currentStatusConfig.borderColor} flex flex-col items-center justify-center text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden`}
      >
        <div className="w-18 h-18 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mb-3.5 shadow-sm">
          {currentStatusConfig.icon}
        </div>

        <h2
          className={`text-lg sm:text-xl font-black mb-1 ${currentStatusConfig.color}`}
        >
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
                {/* Connecting line on right in RTL */}
                {index < statusOrder.length - 1 && (
                  <div
                    className={`absolute right-[11px] top-7 w-0.5 h-6 transition-colors ${
                      index < currentStepIndex
                        ? "bg-emerald-500"
                        : "bg-stone-200"
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
                  {isActive && (
                    <CheckCircle2
                      size={13}
                      className="fill-emerald-500 text-white"
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
                      className="text-xs text-stone-500 tabular-nums"
                    >
                      {new Date(time).toLocaleTimeString("ar-SA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                  {isCurrent && step !== "delivered" && (
                    <p className="text-[10px] text-amber-600 font-bold mt-0.5 animate-pulse">
                      جاري التنفيذ حالياً…
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
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-xs sm:text-sm font-bold text-stone-800 transition-all active:scale-[0.96] shadow-sm"
          >
            <ShoppingBag size={16} />
            <span>طلب المزيد أو العودة إلى قائمة الطعام</span>
          </Link>
        </div>
      )}
    </div>
  );
}
