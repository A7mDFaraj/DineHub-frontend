"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Loader2, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  armOrderSound,
  playOrderReady,
  setOrderMuted,
} from "@/lib/order-alert";

export function ReadyAlert({
  status,
  token,
}: {
  status: string;
  token: string;
}) {
  const [muted, setMuted] = useState(false);
  const notified = useRef<string | null>(null);
  const [awake, setAwake] = useState(false);
  useEffect(() => {
    if (status === "ready" || status === "delivered") return;
    let lock: WakeLockSentinel | undefined;
    let stopped = false;
    const acquire = async () => {
      if (
        stopped ||
        (lock && !lock.released) ||
        document.visibilityState !== "visible" ||
        !navigator.wakeLock
      )
        return;
      try {
        // Never trigger a permission prompt: use this enhancement only when already granted.
        const permission = await navigator.permissions.query({
          name: "screen-wake-lock" as PermissionName,
        });
        if (stopped || permission.state !== "granted") return;
        const acquired = await navigator.wakeLock.request("screen");
        if (stopped) {
          await acquired.release();
          return;
        }
        lock = acquired;
        setAwake(true);
        acquired.addEventListener("release", () => {
          if (!stopped) setAwake(false);
        });
      } catch {
        /* Optional enhancement; no prompt or error UI. */
      }
    };
    void acquire();
    const timeout = setTimeout(
      () => {
        stopped = true;
        void lock?.release();
        setAwake(false);
      },
      30 * 60 * 1000,
    );
    document.addEventListener("visibilitychange", acquire);
    return () => {
      stopped = true;
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release();
    };
  }, [status]);
  useEffect(() => {
    let active = true;
    const notify = () => {
      if (!active || muted || status !== "ready" || notified.current === token) return;
      const key = `order-ready:${token}`;
      try {
        if (sessionStorage.getItem(key)) {
          notified.current = token;
          return;
        }
      } catch {}
      if (!playOrderReady()) return;
      notified.current = token;
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
    };
    const arm = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-order-sound-toggle]")) return;
      void armOrderSound().then(notify);
    };
    notify();
    window.addEventListener("click", arm);
    window.addEventListener("keydown", arm);
    return () => {
      active = false;
      window.removeEventListener("click", arm);
      window.removeEventListener("keydown", arm);
    };
  }, [status, token, muted]);
  useEffect(() => () => setOrderMuted(false), []);
  useEffect(() => {
    if (status !== "ready") return;
    const original = document.title;
    document.title = "طلبك جاهز للاستلام!";
    return () => {
      document.title = original;
    };
  }, [status, token]);
  if (status === "delivered") return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-stone-700">
      <div>
        <p className="text-sm font-bold">
          {status === "ready"
            ? "طلبك جاهز — يمكنك استلامه الآن"
            : "سننبهك عند جاهزية الطلب"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {awake && status !== "ready"
            ? "نبقي الشاشة نشطة أثناء انتظارك. أبقِ هذه الصفحة مفتوحة."
            : "للتنبيه الصوتي، أبقِ هذه الصفحة مفتوحة والشاشة نشطة."}
        </p>
      </div>
      <button
        type="button"
        data-order-sound-toggle
        aria-label={muted ? "تشغيل صوت التنبيه" : "كتم صوت التنبيه"}
        aria-pressed={!muted}
        onClick={() => {
          setOrderMuted(!muted);
          if (!muted) setMuted(true);
          else void armOrderSound().then(() => setMuted(false));
        }}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 focus-visible:outline-2"
      >
        {muted ? <BellOff size={20} /> : <Bell size={20} />}
      </button>
    </div>
  );
}
const labels = ["تحتاج تحسين", "مقبولة", "جيدة", "رائعة", "ممتازة"];
export function OrderRating({
  token,
  initialRating,
}: {
  token: string;
  initialRating?: number | null;
}) {
  const [rating, setRating] = useState(initialRating ?? 0);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState("");
  const locked = useRef(false);
  const save = async (value: number) => {
    if (locked.current) return;
    locked.current = true;
    setSaving(value);
    setError("");
    try {
      const { data } = await apiClient.patch(`/orders/${token}/rating`, {
        rating: value,
      });
      setRating(data.rating);
    } catch {
      setError("لم يُحفظ التقييم. اضغط على النجمة للمحاولة مجدداً.");
    } finally {
      locked.current = false;
      setSaving(0);
    }
  };
  return (
    <section
      className="rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm"
      aria-labelledby="rating-title"
    >
      <p className="text-xs font-bold text-stone-500">رأيك يساعدنا نتحسن</p>
      <h2 id="rating-title" className="mt-1 text-lg font-black text-stone-900">
        كيف كانت تجربتك؟
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        لمسة واحدة تكفي، ويمكنك تعديل تقييمك.
      </p>
      <div
        className="my-4 flex justify-center gap-1"
        dir="ltr"
        role="group"
        aria-label="تقييم التجربة"
      >
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={saving > 0}
            aria-pressed={rating === index + 1}
            aria-label={`${index + 1} من 5 — ${label}`}
            onClick={() => void save(index + 1)}
            className="flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-60"
          >
            {saving === index + 1 ? (
              <Loader2 className="animate-spin text-amber-600" />
            ) : (
              <Star
                size={30}
                className={
                  index < rating
                    ? "fill-amber-400 text-amber-500"
                    : "text-stone-300"
                }
              />
            )}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="min-h-6 text-sm">
        {error ? (
          <p className="text-red-700">{error}</p>
        ) : saving ? (
          "جارٍ حفظ رأيك…"
        ) : rating ? (
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-700">
            <Check size={16} />
            {labels[rating - 1]} — شكراً لك!
          </p>
        ) : (
          <p className="text-stone-500">1 تحتاج تحسين · 5 ممتازة</p>
        )}
      </div>
    </section>
  );
}
