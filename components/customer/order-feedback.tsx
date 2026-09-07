"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, Loader2, Star } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  armOrderSound,
  playOrderReady,
  setOrderMuted,
} from "@/lib/order-alert";
import { useLocale, useTranslations } from "next-intl";

export function ReadyAlert({
  status,
  token,
}: {
  status: string;
  token: string;
}) {
  const locale = useLocale();
  const t = useTranslations("CustomerFeedback");
  const isRtl = locale === "ar";

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
    document.title = t("pageReadyTitle");
    return () => {
      document.title = original;
    };
  }, [status, token, t]);

  if (status === "delivered") return null;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        fontFamily: isRtl
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
      className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-stone-700"
    >
      <div>
        <p className="text-sm font-bold">
          {status === "ready" ? t("readyTitle") : t("pendingTitle")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {awake && status !== "ready" ? t("screenAwake") : t("screenTip")}
        </p>
      </div>
      <button
        type="button"
        data-order-sound-toggle
        aria-label={muted ? t("unmuteAria") : t("muteAria")}
        aria-pressed={!muted}
        onClick={() => {
          setOrderMuted(!muted);
          if (!muted) setMuted(true);
          else void armOrderSound().then(() => setMuted(false));
        }}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors focus-visible:outline-2"
      >
        {muted ? <BellOff size={20} /> : <Bell size={20} />}
      </button>
    </div>
  );
}

export function OrderRating({
  token,
  initialRating,
}: {
  token: string;
  initialRating?: number | null;
}) {
  const locale = useLocale();
  const t = useTranslations("CustomerFeedback");
  const isRtl = locale === "ar";

  const labels = [
    t("star1"),
    t("star2"),
    t("star3"),
    t("star4"),
    t("star5"),
  ];

  const [rating, setRating] = useState(initialRating ?? 0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState("");
  const locked = useRef(false);

  // Active stars to display: hover takes preview priority, falls back to saved rating
  const displayedScore = hoverRating !== null ? hoverRating : rating;

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
      setError(t("error"));
    } finally {
      locked.current = false;
      setSaving(0);
    }
  };

  return (
    <section
      className="rounded-3xl border border-stone-200/90 bg-white/95 backdrop-blur-xl p-5 sm:p-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden"
      aria-labelledby="rating-title"
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        fontFamily: isRtl
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
    >
      <p className="text-xs font-bold text-stone-400 tracking-wide uppercase">
        {t("eyebrow")}
      </p>
      <h2 id="rating-title" className="mt-1 text-lg sm:text-xl font-black text-stone-900">
        {t("title")}
      </h2>
      <p className="mt-1 text-xs text-stone-500 font-medium">
        {t("subtitle")}
      </p>

      {/* Interactive Stars Row with Mouse Hover Feedback */}
      <div
        dir="ltr"
        className="my-4 flex justify-center items-center gap-1.5 sm:gap-2.5 select-none"
        role="group"
        aria-label={t("ratingAriaGroup")}
        onMouseLeave={() => setHoverRating(null)}
      >
        {labels.map((label, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayedScore;
          const isHovered = hoverRating !== null && starValue <= hoverRating;
          const isExactHovered = hoverRating === starValue;

          return (
            <button
              key={starValue}
              type="button"
              disabled={saving > 0}
              aria-pressed={rating === starValue}
              aria-label={`${starValue} / 5 — ${label}`}
              onClick={() => void save(starValue)}
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseMove={() => setHoverRating(starValue)}
              onFocus={() => setHoverRating(starValue)}
              onBlur={() => setHoverRating(null)}
              className={`group relative flex size-12 sm:size-13 items-center justify-center rounded-2xl cursor-pointer transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-amber-500 disabled:opacity-60 disabled:cursor-not-allowed ${
                isExactHovered
                  ? "bg-amber-100/90 scale-115 shadow-sm ring-2 ring-amber-300/70"
                  : isHovered
                    ? "bg-amber-50/80 scale-105"
                    : isFilled
                      ? "bg-amber-50/40"
                      : "hover:bg-stone-100/70"
              }`}
            >
              {saving === starValue ? (
                <Loader2 className="size-6 sm:size-7 animate-spin text-amber-600" />
              ) : (
                <Star
                  className={`size-7 sm:size-8 transition-all duration-150 ${
                    isFilled
                      ? "fill-amber-400 text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.45)]"
                      : "fill-stone-100/80 text-stone-300 stroke-stone-300 stroke-[1.5]"
                  } ${isExactHovered ? "scale-110" : ""}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Status & Live Feedback Label */}
      <div aria-live="polite" className="min-h-7 flex items-center justify-center text-xs sm:text-sm">
        {error ? (
          <p className="text-red-700 font-bold">{error}</p>
        ) : saving ? (
          <p className="text-stone-500 font-medium animate-pulse">{t("saving")}</p>
        ) : hoverRating !== null ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-300/80 text-amber-900 font-bold text-xs sm:text-sm shadow-xs animate-in fade-in duration-150">
            <span className="text-amber-500 font-black">★</span>
            <span className="font-mono font-black">{hoverRating} / 5</span>
            <span className="text-amber-400 font-normal">•</span>
            <span className="font-extrabold">{labels[hoverRating - 1]}</span>
          </div>
        ) : rating > 0 ? (
          <p className="flex items-center justify-center gap-2 font-black text-emerald-700 text-xs sm:text-sm">
            <span className="flex size-4 sm:size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={13} strokeWidth={3} />
            </span>
            <span>{labels[rating - 1]} — {t("thankYou")}</span>
          </p>
        ) : (
          <p className="text-stone-400 font-medium text-xs">{t("legend")}</p>
        )}
      </div>
    </section>
  );
}
