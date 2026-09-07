"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { signOut, useSession } from "@/lib/auth-client";
import { useAccess } from "@/lib/access-context";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./password-change.module.css";

interface PasswordChangeScreenProps {
  forced?: boolean;
  expiresAt?: string | null;
  businessName?: string;
}

export function PasswordChangeScreen({
  forced = false,
  expiresAt,
  businessName: businessNameProp,
}: PasswordChangeScreenProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("AccountPassword");
  const isRtl = locale !== "en";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const { data: session } = useSession();
  const { access } = useAccess();

  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const lock = useRef(false);
  const [expired] = useState(() => Boolean(forced && expiresAt && Date.parse(expiresAt) <= Date.now()));

  const resolvedBusinessName =
    businessNameProp ||
    access?.businessName ||
    (session?.user as { businessName?: string } | undefined)?.businessName;

  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  const isMinLength = newPassword.length >= 12;
  const isMatching = Boolean(newPassword && newPassword === confirmation);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;

    if (newPassword.length < 12) {
      setError(isRtl ? "كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا." : "New password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmation) {
      setError(isRtl ? "كلمتا المرور غير متطابقتين. يرجى التحقق وإعادة المحاولة." : "Passwords do not match. Please verify and try again.");
      return;
    }

    if (newPassword === currentPassword) {
      setError(isRtl ? "اختر كلمة مرور جديدة مختلفة عن الحالية." : "Please choose a new password different from current password.");
      return;
    }

    lock.current = true;
    setBusy(true);
    setError("");

    try {
      await apiClient.post("/account/password", { currentPassword, newPassword });
      setCurrent("");
      setNew("");
      setConfirmation("");
      setDone(true);
      try {
        await signOut();
      } catch {
        /* Backend already revoked sessions */
      }
    } catch (err) {
      const serverMessage =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : (isRtl ? "تعذر تحديث كلمة المرور. تحقق من صحة كلمة المرور الحالية وحاول مجدداً." : "Failed to update password. Please check your current credentials.");
      setError(serverMessage);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className={styles.page}>
      <div className={styles.shell}>
        {/* Action / Form Section */}
        <section
          className={styles.actionPanel}
          aria-labelledby="password-screen-title"
        >
          {/* Mobile Logo */}
          <div className={styles.mobileBrand}>
            <Link href="/" aria-label={isRtl ? "DineHub، العودة إلى الرئيسية" : "DineHub, Return to Home"}>
              <Image src={logo} alt="DineHub Logo" width={50} height={50} priority />
              <span dir="ltr">DineHub</span>
            </Link>
          </div>

          {/* Business Isolation Identifier */}
          {resolvedBusinessName ? (
            <div className={styles.businessBadge}>
              <Building2 size={15} aria-hidden="true" />
              <span>{isRtl ? `منشأة: ${resolvedBusinessName}` : `Business: ${resolvedBusinessName}`}</span>
              <span className={styles.businessBadgeDot} aria-hidden="true" />
            </div>
          ) : (
            <div className={styles.businessBadge}>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>{isRtl ? "مساحة عمل معزولة ومحمية" : "Protected Isolated Tenant"}</span>
              <span className={styles.businessBadgeDot} aria-hidden="true" />
            </div>
          )}

          {done ? (
            <div className={styles.successCard}>
              <div className={styles.successIconWell}>
                <CheckCircle2 size={40} strokeWidth={2} aria-hidden="true" />
              </div>
              <h1 id="password-screen-title">{t("securedSuccessTitle")}</h1>
              <p>{t("securedSuccessDesc")}</p>

              <div className={styles.actionsRow} style={{ width: "100%", maxWidth: "340px", marginTop: "14px" }}>
                <Link href="/admin/login" className={styles.submitButton}>
                  <span>{t("loginNow")}</span>
                  <ArrowIcon size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <p className={styles.eyebrow}>
                  <span aria-hidden="true" />
                  {forced ? t("initialSetup") : t("accountSecurity")}
                </p>
                <h1 id="password-screen-title">
                  {forced ? t("setBusinessPassword") : t("changePassword")}
                </h1>
                <p>
                  {forced ? t("forcedNotice") : t("regularNotice")}
                </p>
              </header>

              {expired ? (
                <div className={styles.expiredBox} role="alert">
                  <ShieldAlert size={26} className="text-red-500" aria-hidden="true" />
                  <div>
                    <h2>{t("expiredTitle")}</h2>
                    <p>{t("expiredDesc")}</p>
                    <div style={{ marginTop: "16px" }}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={busy}
                        className={styles.secondaryButton}
                      >
                        <LogOut size={16} aria-hidden="true" />
                        <span>{t("logoutAndReturn")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className={styles.form} noValidate>
                  {error ? (
                    <div className={styles.alertBox} role="alert">
                      <CircleAlert size={19} aria-hidden="true" />
                      <p>{error}</p>
                    </div>
                  ) : null}

                  {/* Current / Temporary Password */}
                  <div className={styles.field}>
                    <label htmlFor={currentId}>
                      <span>{forced ? t("currentPasswordForced") : t("currentPasswordRegular")}</span>
                    </label>
                    <div className={styles.inputShell}>
                      <KeyRound size={19} strokeWidth={1.7} aria-hidden="true" />
                      <input
                        id={currentId}
                        dir="ltr"
                        type={showCurrent ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        maxLength={128}
                        value={currentPassword}
                        onChange={(e) => setCurrent(e.target.value)}
                        disabled={busy}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowCurrent((v) => !v)}
                        aria-label={showCurrent ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className={styles.field}>
                    <label htmlFor={newId}>
                      <span>{t("newPassword")}</span>
                    </label>
                    <div
                      className={styles.inputShell}
                      data-invalid={Boolean(newPassword && !isMinLength)}
                    >
                      <LockKeyhole size={19} strokeWidth={1.7} aria-hidden="true" />
                      <input
                        id={newId}
                        dir="ltr"
                        type={showNew ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={newPassword}
                        onChange={(e) => setNew(e.target.value)}
                        disabled={busy}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={showNew ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Requirements checklist */}
                    <div className={styles.requirementsBox} aria-live="polite">
                      <span className={styles.reqItem} data-met={isMinLength}>
                        {isMinLength ? <Check size={13} strokeWidth={2.5} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
                        {t("reqMinLength")}
                      </span>
                      {confirmation && (
                        <span className={styles.reqItem} data-met={isMatching}>
                          {isMatching ? <Check size={13} strokeWidth={2.5} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
                          {isMatching ? t("reqMatching") : t("reqNotMatching")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className={styles.field}>
                    <label htmlFor={confirmId}>
                      <span>{t("confirmPassword")}</span>
                    </label>
                    <div
                      className={styles.inputShell}
                      data-invalid={Boolean(confirmation && !isMatching)}
                    >
                      <ShieldCheck size={19} strokeWidth={1.7} aria-hidden="true" />
                      <input
                        id={confirmId}
                        dir="ltr"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        disabled={busy}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={styles.actionsRow}>
                    <button
                      type="submit"
                      disabled={busy || !isMinLength || (confirmation.length > 0 && !isMatching)}
                      className={styles.submitButton}
                    >
                      {busy ? (
                        <>
                          <Loader2 className={styles.spinner} size={19} aria-hidden="true" />
                          <span>{t("saving")}</span>
                        </>
                      ) : (
                        <>
                          <span>{t("savePassword")}</span>
                          <ArrowIcon size={18} aria-hidden="true" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleLogout}
                      className={styles.secondaryButton}
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>{t("logoutAndReturn")}</span>
                    </button>
                  </div>
                </form>
              )}

              <footer className={styles.footerNote}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{isRtl ? "جلسة مشفرة ومعزولة لحماية بيانات منشأتك" : "Encrypted isolated session protecting your business"}</span>
              </footer>
            </>
          )}
        </section>

        {/* Story / Brand Isolation Showcase */}
        <aside
          className={styles.storyPanel}
          aria-label={isRtl ? "مزايا أمان وعزل الأعمال في DineHub" : "DineHub Security & Business Isolation"}
        >
          <Link
            className={styles.brand}
            href="/"
            aria-label={isRtl ? "DineHub، الصفحة الرئيسية" : "DineHub Homepage"}
          >
            <Image
              className={styles.logo}
              src={logo}
              alt="DineHub 3D Logo"
              width={76}
              height={76}
              priority
            />
            <span dir="ltr">DineHub</span>
          </Link>

          <div className={styles.storyCopy}>
            <p className={styles.liveLabel}>
              <span aria-hidden="true" />
              {isRtl ? "أمان وتشغيل موثوق" : "Enterprise-Grade Reliability"}
            </p>
            <h2>
              {isRtl
                ? "بيئة معزولة بالكامل. أمان يبدأ من أول خطوة."
                : "Fully Isolated Workspaces. Security by Design."}
            </h2>
            <p>
              {isRtl
                ? "نظام مصمم للمنشآت الرائدة؛ نوفر عزلاً تاماً للبيانات، إدارة دقيقة للصلاحيات، وربطاً فورياً بين مسح العميل وعمليات الفريق."
                : "Engineered for leading food & beverage brands; isolated multitenancy, granular access control, and instantaneous sync from guest QR scan to live kitchen."}
            </p>
          </div>

          <div className={styles.featuresGrid} aria-hidden="true">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Building2 size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>{isRtl ? "عزل رقمي مستقل لكل منشأة" : "Tenant Isolation"}</h3>
                <p>
                  {isRtl
                    ? "قواعد بيانات وعمليات منفصلة تضمن أقصى درجات الخصوصية وحماية الأعمال."
                    : "Independent operational scope ensuring complete business privacy and compliance."}
                </p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Users size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>{isRtl ? "صلاحيات دقيقة للملاك والفرق" : "Granular Team Access"}</h3>
                <p>
                  {isRtl
                    ? "تحكم كامل في وصول طاقم الفروع والمدراء لحماية الإيرادات والقوائم."
                    : "Role-based controls tailored for branch cashiers, kitchen crew, and owners."}
                </p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>{isRtl ? "إشارة طلب فائقة السرعة" : "Realtime Order Signals"}</h3>
                <p>
                  {isRtl
                    ? "مسار مباشر من كاميرا العميل إلى شاشات التحضير دون انقطاع."
                    : "Direct zero-friction pipeline from guest smartphone camera to kitchen display."}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.storyFoot}>
            <span>DineHub Enterprise Security</span>
            <span>{isRtl ? "تشفير معتمد 256-bit" : "256-bit Encryption"}</span>
            <span>{isRtl ? "عزل متعدد المنشآت" : "Multitenant Isolation"}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
