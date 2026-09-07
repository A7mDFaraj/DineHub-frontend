"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { reportClientIncident } from "@/lib/observability";

export default function ApplicationError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";

  useEffect(() => {
    reportClientIncident({
      level: "error",
      event: "react.error_boundary",
      message: error.message,
      stack: error.stack,
      metadata: { errorName: error.name, digest: error.digest },
    });
  }, [error]);

  return (
    <main
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        background: "#19131f",
        color: "#fffdf9",
        padding: 24,
        fontFamily: isRtl
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
    >
      <section
        style={{
          width: "min(520px, 100%)",
          textAlign: "center",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 24,
          background: "#211827",
          padding: 32,
        }}
        role="alert"
      >
        <p style={{ color: "#ff9d8c", margin: 0, fontWeight: 700, fontSize: "0.85rem" }}>
          {isRtl ? "تم تسجيل المشكلة تلقائيًا" : "Incident logged automatically"}
        </p>
        <h1 style={{ margin: "12px 0 8px", fontSize: "1.35rem", fontWeight: 900 }}>
          {isRtl ? "حدث خطأ غير متوقع" : "An unexpected error occurred"}
        </h1>
        <p style={{ color: "#bfb3c3", lineHeight: 1.8, fontSize: "0.9rem" }}>
          {isRtl
            ? "يمكنك المحاولة مرة أخرى. سيظهر هذا الحادث في سجل DineHub مع رقم التتبع الخاص به."
            : "You can try again. This incident has been logged with an event trace."}
        </p>
        <button
          type="button"
          onClick={retry}
          style={{
            minHeight: 46,
            border: 0,
            borderRadius: 999,
            background: "#f2644b",
            color: "white",
            padding: "0 24px",
            font: "inherit",
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 12,
          }}
        >
          {isRtl ? "إعادة المحاولة" : "Try Again"}
        </button>
      </section>
    </main>
  );
}
