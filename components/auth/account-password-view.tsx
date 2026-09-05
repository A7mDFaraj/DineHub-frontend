"use client";

import { ArrowLeft, Building2, CircleAlert, Loader2, LockKeyhole, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AccessProvider, useAccess } from "@/lib/access-context";
import { useSession } from "@/lib/auth-client";
import { PasswordChangeScreen } from "@/components/auth/password-change-screen";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./password-change.module.css";

function AccountPasswordInner() {
  const { data: session, isPending } = useSession();
  const { access, loading, error, refresh } = useAccess();

  // 1. Loading State
  if (isPending || loading) {
    return (
      <main dir="rtl" className={styles.page}>
        <div
          className={styles.shell}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "520px",
            maxWidth: "680px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
            <Image
              src={logo}
              alt="DineHub"
              width={72}
              height={72}
              priority
              style={{ filter: "drop-shadow(0 12px 20px rgba(34,24,42,0.12))" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--ink)", fontWeight: 650, fontSize: "1.1rem" }}>
              <Loader2 className={styles.spinner} size={22} style={{ color: "var(--teal)" }} />
              <span>جارٍ التحقق من أمان الحساب والمنشأة…</span>
            </div>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "0.9rem" }}>
              نربط جلسة العمل بالمنشأة المعزولة لضمان أمان البيانات.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 2. Unauthenticated State
  if (!session) {
    return (
      <main dir="rtl" className={styles.page}>
        <div
          className={styles.shell}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "540px",
            maxWidth: "680px",
            padding: "48px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", maxWidth: "460px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "24px",
                background: "rgba(242, 100, 75, 0.12)",
                color: "var(--coral-deep)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <LockKeyhole size={36} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div className={styles.businessBadge} style={{ margin: 0 }}>
              <Building2 size={15} />
              <span>منصة DineHub للأعمال</span>
              <span className={styles.businessBadgeDot} />
            </div>

            <h1 style={{ margin: 0, fontSize: "1.85rem", fontWeight: 700, color: "var(--ink)" }}>
              تسجيل الدخول مطلوب
            </h1>

            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.75 }}>
              لتأمين حساب منشأتك أو تعيين كلمة المرور الجديدة، يرجى تسجيل الدخول أولاً باستخدام البريد وكلمة المرور المؤقتة التي استلمتها.
            </p>

            <div style={{ width: "100%", maxWidth: "320px", marginTop: "12px" }}>
              <Link href="/admin/login" className={styles.submitButton} style={{ width: "100%" }}>
                <span>الانتقال إلى تسجيل الدخول</span>
                <ArrowLeft size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 3. Error / Access Fetch Failure State
  if (error || !access) {
    return (
      <main dir="rtl" className={styles.page}>
        <div
          className={styles.shell}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "540px",
            maxWidth: "680px",
            padding: "48px 28px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", maxWidth: "460px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "24px",
                background: "rgba(204, 73, 55, 0.12)",
                color: "#912f24",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircleAlert size={36} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <h1 style={{ margin: 0, fontSize: "1.85rem", fontWeight: 700, color: "var(--ink)" }}>
              تعذر تحميل بيانات الحساب
            </h1>

            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem", lineHeight: 1.75 }}>
              حدث انقطاع مؤقت في الاتصال بخدمة التحقق من الصلاحيات. يرجى التحقق من اتصالك والمحاولة مجدداً.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "320px", marginTop: "12px" }}>
              <button
                type="button"
                className={styles.submitButton}
                onClick={() => void refresh()}
              >
                <span>إعادة المحاولة الآن</span>
              </button>
              <Link href="/admin/login" className={styles.secondaryButton}>
                <span>العودة لصفحة الدخول</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 4. Authenticated & Loaded State
  return (
    <PasswordChangeScreen
      forced={access.mustChangePassword}
      expiresAt={access.temporaryPasswordExpiresAt}
      businessName={access.businessName}
    />
  );
}

export function AccountPasswordView() {
  return (
    <AccessProvider>
      <AccountPasswordInner />
    </AccessProvider>
  );
}
