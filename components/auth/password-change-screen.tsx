"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
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
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const isDifferentFromCurrent = !currentPassword || newPassword !== currentPassword;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;

    if (newPassword.length < 12) {
      setError("كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا.");
      return;
    }

    if (newPassword !== confirmation) {
      setError("كلمتا المرور غير متطابقتين. يرجى التحقق وإعادة المحاولة.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("اختر كلمة مرور جديدة مختلفة عن الحالية.");
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
          : "تعذر تحديث كلمة المرور. تحقق من صحة كلمة المرور الحالية وحاول مجدداً.";
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
    <main dir="rtl" className={styles.page}>
      <div className={styles.shell}>
        {/* Action / Form Section */}
        <section
          className={styles.actionPanel}
          aria-labelledby="password-screen-title"
        >
          {/* Mobile Logo */}
          <div className={styles.mobileBrand}>
            <Link href="/" aria-label="DineHub، العودة إلى الرئيسية">
              <Image src={logo} alt="DineHub Logo" width={50} height={50} priority />
              <span dir="ltr">DineHub</span>
            </Link>
          </div>

          {/* Business Isolation Identifier */}
          {resolvedBusinessName ? (
            <div className={styles.businessBadge}>
              <Building2 size={15} aria-hidden="true" />
              <span>منشأة: {resolvedBusinessName}</span>
              <span className={styles.businessBadgeDot} aria-hidden="true" />
            </div>
          ) : (
            <div className={styles.businessBadge}>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>مساحة عمل معزولة ومحمية</span>
              <span className={styles.businessBadgeDot} aria-hidden="true" />
            </div>
          )}

          {done ? (
            <div className={styles.successCard}>
              <div className={styles.successIconWell}>
                <CheckCircle2 size={40} strokeWidth={2} aria-hidden="true" />
              </div>
              <h1 id="password-screen-title">تم تأمين حسابك بنجاح</h1>
              <p>
                تم حفظ كلمة المرور وإنهاء الجلسات السابقة لحماية نشاطك التجاري. يمكنك الآن تسجيل الدخول بكلمتك الجديدة ومتابعة تشغيل منشأتك.
              </p>

              <div className={styles.actionsRow} style={{ width: "100%", maxWidth: "340px", marginTop: "14px" }}>
                <Link href="/admin/login" className={styles.submitButton}>
                  <span>تسجيل الدخول الآن</span>
                  <ArrowLeft size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <p className={styles.eyebrow}>
                  <span aria-hidden="true" />
                  {forced ? "إعداد الحساب الأولي" : "أمان الحساب"}
                </p>
                <h1 id="password-screen-title">
                  {forced ? "عيّن كلمة المرور الخاصة بمنشأتك" : "تغيير كلمة المرور"}
                </h1>
                <p>
                  {forced
                    ? "كلمة المرور التي استلمتها مؤقتة للتهيئة الأولى. اختر كلمة خاصة بك للبدء في إدارة فروعك وقوائمك."
                    : "لحماية منشأتك، ستنتهي كافة الجلسات السابقة بعد التحديث لتسجيل الدخول بكلمة المرور الجديدة."}
                </p>
              </header>

              {expired ? (
                <div className={styles.expiredBox} role="alert">
                  <ShieldAlert size={26} className="text-red-500" aria-hidden="true" />
                  <div>
                    <h2>انتهت صلاحية كلمة المرور المؤقتة</h2>
                    <p>
                      انتهت المهلة المحددة لكلمة المرور المؤقتة. إذا كنت مالك المنشأة يرجى التواصل مع دعم DineHub، أو التواصل مع مسؤول منشأتك لإصدار كلمة جديدة.
                    </p>
                    <div style={{ marginTop: "16px" }}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={busy}
                        className={styles.secondaryButton}
                      >
                        <LogOut size={16} aria-hidden="true" />
                        <span>تسجيل الخروج والعودة</span>
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
                      <span>{forced ? "كلمة المرور المؤقتة الحالية" : "كلمة المرور الحالية"}</span>
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
                        aria-label={showCurrent ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className={styles.field}>
                    <label htmlFor={newId}>
                      <span>كلمة المرور الجديدة</span>
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
                        aria-label={showNew ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Requirements checklist */}
                    <div className={styles.requirementsBox} aria-live="polite">
                      <span className={styles.reqItem} data-met={isMinLength}>
                        {isMinLength ? <Check size={13} strokeWidth={2.5} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
                        12 حرفًا على الأقل
                      </span>
                      {confirmation && (
                        <span className={styles.reqItem} data-met={isMatching}>
                          {isMatching ? <Check size={13} strokeWidth={2.5} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
                          {isMatching ? "كلمتا المرور متطابقتان" : "غير متطابقتين بعد"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className={styles.field}>
                    <label htmlFor={confirmId}>
                      <span>تأكيد كلمة المرور الجديدة</span>
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
                        aria-label={showConfirm ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                          <span>جارٍ حفظ التحديث…</span>
                        </>
                      ) : (
                        <>
                          <span>حفظ كلمة المرور ومتابعة العمل</span>
                          <ArrowLeft size={18} aria-hidden="true" />
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
                      <span>تسجيل الخروج والعودة لاحقًا</span>
                    </button>
                  </div>
                </form>
              )}

              <footer className={styles.footerNote}>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>جلسة مشفرة ومعزولة لحماية بيانات منشأتك</span>
              </footer>
            </>
          )}
        </section>

        {/* Story / Brand Isolation Showcase */}
        <aside
          className={styles.storyPanel}
          aria-label="مزايا أمان وعزل الأعمال في DineHub"
        >
          <Link
            className={styles.brand}
            href="/"
            aria-label="DineHub، الصفحة الرئيسية"
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
              أمان وتشغيل موثوق
            </p>
            <h2>بيئة معزولة بالكامل. أمان يبدأ من أول خطوة.</h2>
            <p>
              نظام مصمم للمنشآت الرائدة؛ نوفر عزلاً تاماً للبيانات، إدارة دقيقة للصلاحيات، وربطاً فورياً بين مسح العميل وعمليات الفريق.
            </p>
          </div>

          <div className={styles.featuresGrid} aria-hidden="true">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Building2 size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>عزل رقمي مستقل لكل منشأة</h3>
                <p>قواعد بيانات وعمليات منفصلة تضمن أقصى درجات الخصوصية وحماية الأعمال.</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Users size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>صلاحيات دقيقة للملاك والفرق</h3>
                <p>تحكم كامل في وصول طاقم الفروع والمدراء لحماية الإيرادات والقوائم.</p>
              </div>
            </div>

            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.featureText}>
                <h3>إشارة طلب فائقة السرعة</h3>
                <p>مسار مباشر من كاميرا العميل إلى شاشات التحضير دون انقطاع.</p>
              </div>
            </div>
          </div>

          <div className={styles.storyFoot}>
            <span>DineHub Enterprise Security</span>
            <span>تشفير معتمد 256-bit</span>
            <span>عزل متعدد المنشآت</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
