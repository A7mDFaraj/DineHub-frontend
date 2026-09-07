"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import { cn } from "@/lib/utils";
import styles from "@/components/admin/business.module.css";

interface Business {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  _count: { branches: number; users: number };
  users: { id: string; name: string; email: string }[];
}

interface Created {
  business: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string };
  temporaryPassword: string;
  expiresAt: string;
}

export default function BusinessesPage() {
  const locale = useLocale();
  const t = useTranslations("AdminBusinesses");
  const tCommon = useTranslations("AdminCommon");
  const isRtl = locale !== "en";

  const { access } = useAccess();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [copiedField, setCopiedField] = useState<"password" | "all" | "email" | "">("");
  const [showPassword, setShowPassword] = useState(true);
  const [resetOwnerId, setResetOwnerId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", ownerName: "", ownerEmail: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBusinesses((await apiClient.get<Business[]>("/platform/businesses")).data);
    } catch {
      setError(isRtl ? "تعذر تحميل أنشطة المنصة." : "Failed to load platform businesses.");
    } finally {
      setLoading(false);
    }
  }, [isRtl]);

  useEffect(() => {
    if (!access?.isPlatformAdmin) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [access?.isPlatformAdmin, load]);

  const setFeedback = (type: "password" | "all" | "email", msg: string) => {
    setCopiedField(type);
    setCopyStatus(msg);
    window.setTimeout(() => {
      setCopiedField("");
      setCopyStatus("");
    }, 3500);
  };

  const handleCopyPassword = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setFeedback("password", isRtl ? "تم نسخ كلمة المرور إلى الحافظة بنجاح" : "Password copied to clipboard");
    } catch {
      setCopyStatus(isRtl ? "يرجى تحديد كلمة المرور ونسخها يدوياً" : "Please copy password manually");
    }
  };

  const handleCopyEmail = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.owner.email);
      setFeedback("email", isRtl ? "تم نسخ البريد الإلكتروني" : "Email copied to clipboard");
    } catch {
      setCopyStatus(isRtl ? "تعذر النسخ التلقائي" : "Automatic copy failed");
    }
  };

  const handleCopyAll = async () => {
    if (!created) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://dinehub.app";
    const loginPath = isRtl ? `${origin}/admin/login` : `${origin}/en/admin/login`;

    const text = isRtl
      ? [
          `بيانات الدخول إلى منصة DineHub:`,
          `• المنشأة: ${created.business.name}`,
          `• البريد الإلكتروني للمالك: ${created.owner.email}`,
          `• كلمة المرور المؤقتة: ${created.temporaryPassword}`,
          `• رابط الدخول: ${loginPath}`,
          ``,
          `ملاحظة: هذه كلمة مرور مؤقتة صالحة لمدة 48 ساعة، وسيُطلب تغييرها فور أول تسجيل دخول.`,
        ].join("\n")
      : [
          `DineHub Platform Login Credentials:`,
          `• Business: ${created.business.name}`,
          `• Owner Email: ${created.owner.email}`,
          `• Temporary Password: ${created.temporaryPassword}`,
          `• Login URL: ${loginPath}`,
          ``,
          `Note: This is a temporary password valid for 48 hours. You will be prompted to change it upon first login.`,
        ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setFeedback("all", isRtl ? "تم نسخ كامل البيانات بنجاح (جاهزة للإرسال)" : "Full credentials copied (ready to send)");
    } catch {
      setCopyStatus(isRtl ? "تعذر نسخ النص بالكامل" : "Failed to copy full text");
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post<Created>("/platform/businesses", form);
      setCreated(data);
      setIsModalOpen(true);
      setCopyStatus("");
      setCopiedField("");
      setShowPassword(true);
      setForm({ name: "", slug: "", ownerName: "", ownerEmail: "" });
      await load();
    } catch (e) {
      setError(
        axios.isAxiosError(e) && typeof e.response?.data?.message === "string"
          ? e.response.data.message
          : (isRtl ? "تعذر إنشاء النشاط." : "Failed to create business."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetOwner(business: Business) {
    const owner = business.users[0];
    if (!owner || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post<{ temporaryPassword: string; expiresAt: string }>(
        `/platform/users/${owner.id}/reset-password`,
      );
      setCreated({
        business: { id: business.id, name: business.name, slug: business.slug },
        owner,
        ...data,
      });
      setIsModalOpen(true);
      setCopyStatus("");
      setCopiedField("");
      setShowPassword(true);
      setResetOwnerId(null);
    } catch (e) {
      setError(
        axios.isAxiosError(e) && typeof e.response?.data?.message === "string"
          ? e.response.data.message
          : (isRtl ? "تعذر إصدار كلمة مرور للمالك." : "Failed to issue temporary password."),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!access?.isPlatformAdmin) {
    return (
      <p role="alert">
        {isRtl ? "هذه الصفحة خاصة بإدارة منصة DineHub." : "This page is restricted to DineHub platform administrators."}
      </p>
    );
  }

  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div>
          <p className={styles.muted}>{isRtl ? "إدارة المنصة" : "Platform Management"}</p>
          <h1>{t("pageTitle")}</h1>
          <p className={styles.muted}>{t("pageDesc")}</p>
        </div>
      </header>

      {/* Persistent banner at the top if credentials exist and modal is closed */}
      {created && !isModalOpen && (
        <section className={styles.credentialsCard} aria-live="polite">
          <div className={styles.bannerHeader}>
            <div className={styles.credentialsTitleGroup}>
              <div className={styles.credentialsIconBadge} aria-hidden="true">
                <KeyRound size={22} strokeWidth={1.8} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>
                  {isRtl ? "بيانات الدخول المؤقتة متاحة" : "Temporary Login Credentials Available"}
                </h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#b9aebd" }}>
                  {isRtl
                    ? `تم إصدار بيانات الدخول المؤقتة لـ ${created.business.name} (${created.owner.email}).`
                    : `Temporary credentials issued for ${created.business.name} (${created.owner.email}).`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                onClick={() => setIsModalOpen(true)}
              >
                <KeyRound size={16} />
                <span>{isRtl ? "عرض بيانات الدخول ونسخها" : "View & Copy Credentials"}</span>
              </button>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={() => setCreated(null)}
                title={isRtl ? "إغلاق التنبيه" : "Dismiss alert"}
                aria-label={isRtl ? "إغلاق التنبيه" : "Dismiss alert"}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Centered Modal Dialog for Immediate Visibility Anywhere On Page */}
      <Dialog.Root open={isModalOpen && Boolean(created)} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.credentialsModal} dir={isRtl ? "rtl" : "ltr"}>
            {created && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.credentialsIconBadge} aria-hidden="true">
                    <KeyRound size={22} strokeWidth={1.8} />
                  </div>
                  <div className={styles.modalTitleBlock}>
                    <div className={styles.titleWithBadge}>
                      <Dialog.Title asChild>
                        <h2>{t("credentialsTitle")}</h2>
                      </Dialog.Title>
                      <span className={styles.credentialsBadge}>
                        <Clock size={13} strokeWidth={2} />
                        {isRtl ? "صالحة لمدة 48 ساعة" : "Valid for 48 hours"}
                      </span>
                    </div>
                    <Dialog.Description asChild>
                      <p className={styles.modalSubtitle}>{t("credentialsDesc")}</p>
                    </Dialog.Description>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className={styles.modalCloseButton}
                      title={isRtl ? "إغلاق النافذة" : "Close modal"}
                      aria-label={isRtl ? "إغلاق نافذة بيانات الدخول" : "Close credentials modal"}
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className={styles.credentialsGrid}>
                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>{t("businessName")}</span>
                    <div className={styles.credentialBox}>
                      <Store size={17} className="text-zinc-400 shrink-0" />
                      <strong className={styles.credentialBoxValue}>
                        {created.business.name}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>{t("ownerEmail")}</span>
                    <div className={styles.credentialBox}>
                      <Mail size={17} className="text-zinc-400 shrink-0" />
                      <span className={styles.credentialBoxValue} dir="ltr">
                        {created.owner.email}
                      </span>
                      <button
                        type="button"
                        className={styles.eyeToggle}
                        onClick={handleCopyEmail}
                        title={isRtl ? "نسخ البريد الإلكتروني" : "Copy email address"}
                        aria-label={isRtl ? "نسخ البريد الإلكتروني" : "Copy email address"}
                      >
                        {copiedField === "email" ? (
                          <Check size={15} className="text-[#77cbc3]" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className={cn(styles.credentialItem, styles.colSpanFull)}>
                    <span className={styles.credentialLabel}>
                      {isRtl ? "كلمة المرور المؤقتة" : "Temporary Password"}
                    </span>
                    <div className={styles.passwordRow}>
                      <div className={styles.passwordBox}>
                        <span className={styles.passwordText} dir="ltr">
                          {showPassword ? created.temporaryPassword : "••••••••••••••••"}
                        </span>
                        <button
                          type="button"
                          className={styles.eyeToggle}
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                          aria-label={showPassword ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        className={`${styles.button} ${styles.primary}`}
                        onClick={handleCopyPassword}
                      >
                        {copiedField === "password" ? (
                          <>
                            <Check size={16} strokeWidth={2.5} />
                            <span>{isRtl ? "تم النسخ!" : "Copied!"}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>{isRtl ? "نسخ كلمة المرور" : "Copy Password"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.credentialsActions}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleCopyAll}
                  >
                    {copiedField === "all" ? (
                      <>
                        <Check size={16} strokeWidth={2.5} className="text-[#77cbc3]" />
                        <span className="text-[#77cbc3]">
                          {isRtl ? "تم نسخ الرسالة الكاملة!" : "Full message copied!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>
                          {isRtl ? "نسخ كافة البيانات (جاهزة للمشاركة)" : "Copy All Credentials (Ready to send)"}
                        </span>
                      </>
                    )}
                  </button>

                  <Dialog.Close asChild>
                    <button type="button" className={styles.button}>
                      {isRtl ? "تم الحفظ وإغلاق" : "Done & Close"}
                    </button>
                  </Dialog.Close>

                  {copyStatus && (
                    <span className={styles.copySuccessMessage} role="status">
                      <Check size={15} strokeWidth={2.5} />
                      {copyStatus}
                    </span>
                  )}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Client Section */}
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <h2>{t("modalAddTitle")}</h2>
            <p className={styles.muted}>{t("modalAddDesc")}</p>
          </div>
          <Plus aria-hidden="true" />
        </div>

        <form className={styles.fieldsGrid} onSubmit={submit}>
          <label className={styles.field}>
            {t("businessName")}
            <input
              className={styles.input}
              required
              minLength={2}
              maxLength={120}
              placeholder={isRtl ? "مثال: مطعم سحاب" : "e.g. Sahab Restaurant"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            {t("slug")}
            <input
              className={styles.input}
              dir="ltr"
              required
              pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
              placeholder="sahab-restaurant"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: e.target.value.toLowerCase() })
              }
            />
          </label>

          <label className={styles.field}>
            {t("ownerName")}
            <input
              className={styles.input}
              required
              minLength={2}
              maxLength={120}
              placeholder={isRtl ? "مثال: أحمد عبد الله" : "e.g. Ahmed Abdullah"}
              value={form.ownerName}
              onChange={(e) =>
                setForm({ ...form, ownerName: e.target.value })
              }
            />
          </label>

          <label className={styles.field}>
            {t("ownerEmail")}
            <input
              className={styles.input}
              dir="ltr"
              type="email"
              required
              maxLength={320}
              placeholder="owner@example.com"
              value={form.ownerEmail}
              onChange={(e) =>
                setForm({ ...form, ownerEmail: e.target.value })
              }
            />
          </label>

          <div className={styles.colSpanFull} style={{ paddingTop: 6 }}>
            <button
              className={`${styles.button} ${styles.primary}`}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Plus size={17} />
              )}
              <span>{busy ? t("creating") : (isRtl ? "إنشاء النشاط والمالك" : "Create Business & Owner")}</span>
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </section>

      {/* Current Businesses Section */}
      <section className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <h2>{isRtl ? "العملاء الحاليون" : "Active Tenants"}</h2>
            <p className={styles.muted}>
              {isRtl
                ? "قائمة بالمنشآت المسجلة وعدد الفروع والمستخدمين في كل منشأة."
                : "Directory of registered business tenants, branches, and authorized staff."}
            </p>
          </div>
        </div>

        {loading ? (
          <p role="status">{tCommon("loading")}</p>
        ) : (
          <ul className={styles.list}>
            {businesses.length === 0 ? (
              <li className={styles.muted}>
                {isRtl ? "لا توجد منشآت مسجلة حتى الآن." : "No businesses registered yet."}
              </li>
            ) : (
              businesses.map((b) => (
                <li className={styles.row} key={b.id}>
                  <div>
                    <strong>{b.name}</strong>
                    <p className={styles.muted} dir="ltr">
                      {b.slug}
                    </p>
                    <small>
                      {b.users[0]?.name ?? (isRtl ? "بلا مالك" : "No owner")} ·{" "}
                      {b.users[0]?.email ?? "—"}
                    </small>
                  </div>
                  <div className={styles.controls}>
                    <span>
                      <Building2 size={15} /> {b._count.branches}
                    </span>
                    <span>
                      <UsersRound size={15} /> {b._count.users}
                    </span>

                    {/* Active credentials shortcut if this business was just created/reset */}
                    {created && created.business.id === b.id && (
                      <button
                        type="button"
                        className={styles.credentialsRowBadge}
                        onClick={() => setIsModalOpen(true)}
                        title={isRtl ? "عرض بيانات الدخول المؤقتة" : "View temporary credentials"}
                      >
                        <KeyRound size={14} />
                        <span>
                          {isRtl ? "عرض بيانات الدخول النشطة" : "View Active Credentials"}
                        </span>
                      </button>
                    )}

                    {b.users[0] &&
                      (resetOwnerId === b.users[0].id ? (
                        <>
                          <button
                            className={`${styles.button} ${styles.primary}`}
                            disabled={busy}
                            onClick={() => void resetOwner(b)}
                          >
                            {busy ? (
                              <>
                                <Loader2 className="animate-spin" size={15} />
                                <span>{isRtl ? "جارٍ إصدار كلمة المرور…" : "Issuing password…"}</span>
                              </>
                            ) : (
                              <span>{isRtl ? "تأكيد وإصدار" : "Confirm & Issue"}</span>
                            )}
                          </button>
                          <button
                            className={styles.button}
                            disabled={busy}
                            onClick={() => setResetOwnerId(null)}
                          >
                            {tCommon("cancel")}
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.button}
                          disabled={busy}
                          onClick={() => setResetOwnerId(b.users[0].id)}
                        >
                          {t("resetOwnerPassword")}
                        </button>
                      ))}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
