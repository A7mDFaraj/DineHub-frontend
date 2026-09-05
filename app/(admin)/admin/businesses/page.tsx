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
      setError("تعذر تحميل أنشطة المنصة.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      setFeedback("password", "تم نسخ كلمة المرور إلى الحافظة بنجاح");
    } catch {
      setCopyStatus("يرجى تحديد كلمة المرور ونسخها يدوياً");
    }
  };

  const handleCopyEmail = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.owner.email);
      setFeedback("email", "تم نسخ البريد الإلكتروني");
    } catch {
      setCopyStatus("تعذر النسخ التلقائي");
    }
  };

  const handleCopyAll = async () => {
    if (!created) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://dinehub.app";
    const text = [
      `بيانات الدخول إلى منصة DineHub:`,
      `• المنشأة: ${created.business.name}`,
      `• البريد الإلكتروني للمالك: ${created.owner.email}`,
      `• كلمة المرور المؤقتة: ${created.temporaryPassword}`,
      `• رابط الدخول: ${origin}/admin/login`,
      ``,
      `ملاحظة: هذه كلمة مرور مؤقتة صالحة لمدة 48 ساعة، وسيُطلب تغييرها فور أول تسجيل دخول.`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setFeedback("all", "تم نسخ كامل البيانات بنجاح (جاهزة للإرسال)");
    } catch {
      setCopyStatus("تعذر نسخ النص بالكامل");
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
          : "تعذر إنشاء النشاط.",
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
          : "تعذر إصدار كلمة مرور للمالك.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!access?.isPlatformAdmin) {
    return <p role="alert">هذه الصفحة خاصة بإدارة منصة DineHub.</p>;
  }

  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div>
          <p className={styles.muted}>إدارة المنصة</p>
          <h1>أنشطة العملاء</h1>
          <p className={styles.muted}>
            كل نشاط معزول بقواعد بياناته وفروعه ومستخدميه وسجلاته.
          </p>
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
                <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>بيانات الدخول المؤقتة متاحة</h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#b9aebd" }}>
                  تم إصدار بيانات الدخول المؤقتة لـ{" "}
                  <strong>{created.business.name}</strong> ({created.owner.email}).
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
                <span>عرض بيانات الدخول ونسخها</span>
              </button>
              <button
                type="button"
                className={styles.dismissButton}
                onClick={() => setCreated(null)}
                title="إغلاق التنبيه"
                aria-label="إغلاق التنبيه"
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
          <Dialog.Content className={styles.credentialsModal} dir="rtl">
            {created && (
              <>
                <div className={styles.modalHeader}>
                  <div className={styles.credentialsIconBadge} aria-hidden="true">
                    <KeyRound size={22} strokeWidth={1.8} />
                  </div>
                  <div className={styles.modalTitleBlock}>
                    <div className={styles.titleWithBadge}>
                      <Dialog.Title asChild>
                        <h2>بيانات الدخول المؤقتة</h2>
                      </Dialog.Title>
                      <span className={styles.credentialsBadge}>
                        <Clock size={13} strokeWidth={2} />
                        صالحة لمدة 48 ساعة
                      </span>
                    </div>
                    <Dialog.Description asChild>
                      <p className={styles.modalSubtitle}>
                        انسخ هذه البيانات وشاركها مع المالك مباشرة. لن تظهر
                        مرة أخرى بعد إغلاق هذه النافذة.
                      </p>
                    </Dialog.Description>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className={styles.modalCloseButton}
                      title="إغلاق النافذة"
                      aria-label="إغلاق نافذة بيانات الدخول"
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  </Dialog.Close>
                </div>

                <div className={styles.credentialsGrid}>
                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>اسم المنشأة / النشاط</span>
                    <div className={styles.credentialBox}>
                      <Store size={17} className="text-zinc-400 shrink-0" />
                      <strong className={styles.credentialBoxValue}>
                        {created.business.name}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.credentialItem}>
                    <span className={styles.credentialLabel}>البريد الإلكتروني للمالك</span>
                    <div className={styles.credentialBox}>
                      <Mail size={17} className="text-zinc-400 shrink-0" />
                      <span className={styles.credentialBoxValue} dir="ltr">
                        {created.owner.email}
                      </span>
                      <button
                        type="button"
                        className={styles.eyeToggle}
                        onClick={handleCopyEmail}
                        title="نسخ البريد الإلكتروني"
                        aria-label="نسخ البريد الإلكتروني"
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
                    <span className={styles.credentialLabel}>كلمة المرور المؤقتة</span>
                    <div className={styles.passwordRow}>
                      <div className={styles.passwordBox}>
                        <span className={styles.passwordText} dir="ltr">
                          {showPassword ? created.temporaryPassword : "••••••••••••••••"}
                        </span>
                        <button
                          type="button"
                          className={styles.eyeToggle}
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>نسخ كلمة المرور</span>
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
                        <span className="text-[#77cbc3]">تم نسخ الرسالة الكاملة!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>نسخ كافة البيانات (جاهزة للمشاركة)</span>
                      </>
                    )}
                  </button>

                  <Dialog.Close asChild>
                    <button type="button" className={styles.button}>
                      تم الحفظ وإغلاق
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
            <h2>إضافة عميل جديد</h2>
            <p className={styles.muted}>
              يُنشأ حساب المالك فوراً بكلمة مرور مؤقتة وتفاصيل دخول خاصة.
            </p>
          </div>
          <Plus aria-hidden="true" />
        </div>

        <form className={styles.fieldsGrid} onSubmit={submit}>
          <label className={styles.field}>
            اسم النشاط
            <input
              className={styles.input}
              required
              minLength={2}
              maxLength={120}
              placeholder="مثال: مطعم سحاب"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            المعرّف المختصر (Slug)
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
            اسم المالك
            <input
              className={styles.input}
              required
              minLength={2}
              maxLength={120}
              placeholder="مثال: أحمد عبد الله"
              value={form.ownerName}
              onChange={(e) =>
                setForm({ ...form, ownerName: e.target.value })
              }
            />
          </label>

          <label className={styles.field}>
            بريد المالك
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
              <span>{busy ? "جارٍ الإنشاء…" : "إنشاء النشاط والمالك"}</span>
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
            <h2>العملاء الحاليون</h2>
            <p className={styles.muted}>
              قائمة بالمنشآت المسجلة وعدد الفروع والمستخدمين في كل منشأة.
            </p>
          </div>
        </div>

        {loading ? (
          <p role="status">جارٍ التحميل…</p>
        ) : (
          <ul className={styles.list}>
            {businesses.length === 0 ? (
              <li className={styles.muted}>لا توجد منشآت مسجلة حتى الآن.</li>
            ) : (
              businesses.map((b) => (
                <li className={styles.row} key={b.id}>
                  <div>
                    <strong>{b.name}</strong>
                    <p className={styles.muted} dir="ltr">
                      {b.slug}
                    </p>
                    <small>
                      {b.users[0]?.name ?? "بلا مالك"} ·{" "}
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
                        title="عرض بيانات الدخول المؤقتة"
                      >
                        <KeyRound size={14} />
                        <span>عرض بيانات الدخول النشطة</span>
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
                                <span>جارٍ إصدار كلمة المرور…</span>
                              </>
                            ) : (
                              <span>تأكيد وإنهاء جلساته</span>
                            )}
                          </button>
                          <button
                            className={styles.button}
                            disabled={busy}
                            onClick={() => setResetOwnerId(null)}
                          >
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.button}
                          disabled={busy}
                          onClick={() => setResetOwnerId(b.users[0].id)}
                        >
                          استعادة دخول المالك
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


