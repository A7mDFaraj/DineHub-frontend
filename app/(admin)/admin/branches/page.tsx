"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  Plus,
  QrCode,
  RotateCcw,
  Settings,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch, type Branch } from "@/lib/admin-branch-context";
import styles from "./branches.module.css";

export default function BranchesPage() {
  const {
    branches,
    isLoadingBranches,
    refreshBranches,
    setSelectedBranchId,
  } = useAdminBranch();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
  });

  const handleOpenCreate = () => {
    setEditingBranch(null);
    setFormData({ name: "", address: "", phone: "" });
    setErrorMsg("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || branch.nameAr || branch.nameEn || "",
      address: branch.address || branch.addressAr || branch.addressEn || "",
      phone: branch.phone || "",
    });
    setErrorMsg("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("يرجى إدخال اسم الفرع.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      if (editingBranch) {
        await apiClient.patch(`/admin/branches/${editingBranch.id}`, {
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });
        setSuccessMsg(`تم تحديث بيانات فرع "${formData.name.trim()}" بنجاح.`);
      } else {
        const { data } = await apiClient.post("/admin/branches", {
          name: formData.name.trim(),
          address: formData.address.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });
        const createdBranch = data?.data || data;
        if (createdBranch?.id) {
          setSelectedBranchId(createdBranch.id);
        }
        setSuccessMsg(`تم إنشاء فرع "${formData.name.trim()}" بنجاح.`);
      }

      await refreshBranches();
      setIsDialogOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message || "تعذر حفظ بيانات الفرع. يرجى المحاولة لاحقاً."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            الإدارة • الفروع ومواقع الخدمة
          </p>
          <h1>إدارة الفروع ونقاط البيع</h1>
          <p>
            أدر مواقع مطعمك، وحدد عناوين الفروع وأرقام التواصل لربط القوائم ورموز الطلب بسلاسة.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => refreshBranches()}
            disabled={isLoadingBranches}
            aria-label="تحديث قائمة الفروع"
          >
            <RotateCcw
              size={17}
              className={isLoadingBranches ? "animate-spin" : undefined}
            />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenCreate}
          >
            <Plus size={18} strokeWidth={2.2} />
            <span>إضافة فرع جديد</span>
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label="ملخص الفروع">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <Building2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{branches.length}</span>
            <span className={styles.kpiLabel}>إجمالي الفروع المسجلة</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{branches.length}</span>
            <span className={styles.kpiLabel}>الفروع النشطة والمتصلة</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Store size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {branches.length > 0 ? "جاهز للطلب" : "بانتظار الإعداد"}
            </span>
            <span className={styles.kpiLabel}>الحالة التشغيلية</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>QR + سحابي</span>
            <span className={styles.kpiLabel}>نوع الخدمة المتصلة</span>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isDialogOpen && (
        <div className={styles.errorBanner} role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Branch List / Grid */}
      {isLoadingBranches && branches.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3>جارٍ تحميل بيانات الفروع…</h3>
          <p>يرجى الانتظار ريثما يتم الاتصال بقاعدة البيانات.</p>
        </div>
      ) : branches.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Store size={28} />
          </div>
          <h3>لا توجد فروع مسجلة حتى الآن</h3>
          <p>
            ابدأ بإضافة أول فرع لمطعمك لتتمكن من إنشاء قوائم الطعام وتوليد رموز QR للطاولات.
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenCreate}
            style={{ marginTop: "12px" }}
          >
            <Plus size={18} />
            <span>إضافة أول فرع الآن</span>
          </button>
        </div>
      ) : (
        <div className={styles.branchGrid}>
          {branches.map((branch) => {
            const primaryName =
              branch.nameAr || branch.name || branch.nameEn || "فرع بدون اسم";
            const secondaryName =
              branch.nameEn && branch.nameAr && branch.nameAr !== branch.nameEn
                ? branch.nameEn
                : branch.address || "نقطة خدمة DineHub";
            const displayAddress =
              branch.address || branch.addressAr || branch.addressEn;

            return (
              <article key={branch.id} className={styles.branchCard}>
                <div className={styles.cardHead}>
                  <div className={styles.brandLock}>
                    <div className={styles.branchLogo}>
                      {branch.logoUrl ? (
                        <img src={branch.logoUrl} alt={primaryName} />
                      ) : (
                        <Store size={24} />
                      )}
                    </div>
                    <div className={styles.branchTitles}>
                      <h2>{primaryName}</h2>
                      <p>{secondaryName}</p>
                    </div>
                  </div>

                  <span className={styles.statusBadge}>
                    <i aria-hidden="true" />
                    <span>نشط</span>
                  </span>
                </div>

                <div className={styles.cardDetails}>
                  <div className={styles.detailRow}>
                    <MapPin size={15} />
                    <span>{displayAddress || "لم يتم تحديد العنوان بعد"}</span>
                  </div>
                  {branch.phone && (
                    <div className={styles.detailRow}>
                      <Phone size={15} />
                      <span dir="ltr">{branch.phone}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardNav}>
                  <Link
                    href="/admin/menu"
                    className={styles.navAction}
                    onClick={() => setSelectedBranchId(branch.id)}
                    title="الانتقال إلى قائمة هذا الفرع"
                  >
                    <UtensilsCrossed size={16} />
                    <span>القائمة</span>
                  </Link>

                  <Link
                    href="/admin/qr-code"
                    className={styles.navAction}
                    onClick={() => setSelectedBranchId(branch.id)}
                    title="الانتقال إلى رموز QR لهذا الفرع"
                  >
                    <QrCode size={16} />
                    <span>رموز QR</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    className={styles.navAction}
                    onClick={() => setSelectedBranchId(branch.id)}
                    title="إعدادات الهوية والشعار"
                  >
                    <Settings size={16} />
                    <span>الهوية</span>
                  </Link>
                </div>

                <button
                  type="button"
                  className={styles.editAction}
                  onClick={() => handleOpenEdit(branch)}
                >
                  <Edit3 size={15} />
                  <span>تعديل بيانات الفرع</span>
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingBranch ? "تعديل بيانات الفرع" : "إضافة فرع جديد"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            {errorMsg && (
              <div
                className={styles.errorBanner}
                style={{ marginBottom: "16px" }}
                role="alert"
              >
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="branch-name">اسم الفرع *</label>
                <input
                  id="branch-name"
                  type="text"
                  required
                  placeholder="مثال: فرع التخصصي - الرياض"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="branch-address">العنوان أو الحي</label>
                <input
                  id="branch-address"
                  type="text"
                  placeholder="مثال: طريق التخصصي، حي المعذر"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="branch-phone">رقم الهاتف أو التواصل (اختياري)</label>
                <input
                  id="branch-phone"
                  type="tel"
                  dir="ltr"
                  placeholder="+966 50 000 0000"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جارٍ الحفظ…</span>
                    </>
                  ) : (
                    <span>{editingBranch ? "حفظ التعديلات" : "إنشاء الفرع"}</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
