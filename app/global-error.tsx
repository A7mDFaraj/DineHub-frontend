"use client";

import { useEffect } from "react";
import { reportClientIncident } from "@/lib/observability";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportClientIncident({
      level: "error",
      event: "react.global_error",
      message: error.message,
      stack: error.stack,
      metadata: { errorName: error.name, digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#19131f", color: "#fffdf9" }}>
        <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ width: "min(520px, 100%)", textAlign: "center", border: "1px solid rgba(255,255,255,.1)", borderRadius: 24, background: "#211827", padding: 32 }} role="alert">
            <p style={{ color: "#ff9d8c", margin: 0 }}>تم إرسال تفاصيل العطل إلى سجل النظام</p>
            <h1 style={{ margin: "12px 0 8px" }}>تعذّر تحميل DineHub</h1>
            <p style={{ color: "#bfb3c3", lineHeight: 1.8 }}>أعد المحاولة الآن. إذا استمرت المشكلة، يستطيع المدير العثور عليها في صفحة سجل النظام.</p>
            <button type="button" onClick={retry} style={{ minHeight: 46, border: 0, borderRadius: 999, background: "#f2644b", color: "white", padding: "0 22px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>
              إعادة المحاولة
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
