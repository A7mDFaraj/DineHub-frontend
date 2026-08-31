"use client";

import { useEffect } from "react";
import { reportClientIncident } from "@/lib/observability";

export default function ApplicationError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
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
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#19131f", color: "#fffdf9", padding: 24 }}>
      <section style={{ width: "min(520px, 100%)", textAlign: "center", border: "1px solid rgba(255,255,255,.1)", borderRadius: 24, background: "#211827", padding: 32 }} role="alert">
        <p style={{ color: "#ff9d8c", margin: 0 }}>تم تسجيل المشكلة تلقائيًا</p>
        <h1 style={{ margin: "12px 0 8px" }}>حدث خطأ غير متوقع</h1>
        <p style={{ color: "#bfb3c3", lineHeight: 1.8 }}>يمكنك المحاولة مرة أخرى. سيظهر هذا الحادث في سجل DineHub مع رقم التتبع الخاص به.</p>
        <button type="button" onClick={retry} style={{ minHeight: 46, border: 0, borderRadius: 999, background: "#f2644b", color: "white", padding: "0 22px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
