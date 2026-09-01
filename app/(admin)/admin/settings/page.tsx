"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Palette,
  Phone,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Store,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import { ImageUploader } from "@/components/ui/image-uploader";
import styles from "./settings.module.css";

const PRESET_COLORS = [
  { name: "مرجاني DineHub", hex: "#f2644b" },
  { name: "تيل مهدئ", hex: "#47aaa1" },
  { name: "ذهبي فاخر", hex: "#d4af37" },
  { name: "أرجواني ملكي", hex: "#8b5cf6" },
  { name: "زمردي طبيعي", hex: "#10b981" },
  { name: "أزرق ياقوتي", hex: "#3b82f6" },
  { name: "وردي مخملي", hex: "#e11d48" },
  { name: "عنبري دافئ", hex: "#f59e0b" },
];

export default function BranchSettingsPage() {
  const {
    branches,
    selectedBranchId,
    selectedBranch,
    refreshBranches,
    isLoadingBranches,
  } = useAdminBranch();

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    address: "",
    phone: "",
    logoUrl: "",
    themeColor: "#f2644b",
  });

  useEffect(() => {
    if (selectedBranch) {
      setFormData({
        name: selectedBranch.nameAr || selectedBranch.name || "",
        nameEn: selectedBranch.nameEn || "",
        address: selectedBranch.address || "",
        phone: selectedBranch.phone || "",
        logoUrl: selectedBranch.logoUrl || "",
        themeColor: selectedBranch.themeColor || "#f2644b",
      });
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [selectedBranchId, selectedBranch]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg("يرجى اختيار فرع أولاً.");
      return;
    }
    if (!formData.name.trim() && !formData.nameEn.trim()) {
      setErrorMsg("يرجى إدخال اسم الفرع.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const primaryName = formData.name.trim() || formData.nameEn.trim();

      await apiClient.patch(`/admin/branches/${selectedBranchId}`, {
        name: primaryName,
        nameAr: formData.name.trim() || undefined,
        nameEn: formData.nameEn.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        themeColor: formData.themeColor.trim() || "#f2644b",
      });

      setSuccessMsg("تم حفظ إعدادات الهوية والفرع بنجاح! تم تحديث شاشة العميل.");
      await refreshBranches();
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setErrorMsg(
        err?.response?.data?.message || "تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedColorName =
    PRESET_COLORS.find((c) => c.hex.toLowerCase() === formData.themeColor.toLowerCase())
      ?.name || "مخصص";

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            الإدارة • الإعدادات
          </p>
          <h1>هوية المتجر وإعدادات الفرع</h1>
          <p>
            خصص اسم مطعمك، شعارك التجاري، وألوان الواجهة التي سيراها عملاؤك عند مسح الرمز.
          </p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => refreshBranches()}
            disabled={isLoadingBranches}
            aria-label="تحديث البيانات"
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
            onClick={() => handleSave()}
            disabled={isSaving || !selectedBranchId}
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>جارٍ الحفظ…</span>
              </>
            ) : (
              <>
                <Save size={17} strokeWidth={2.2} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label="ملخص الإعدادات">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <Store size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {formData.name || selectedBranch?.name || "—"}
            </span>
            <span className={styles.kpiLabel}>اسم الفرع الحالي</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <ImageIcon size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {formData.logoUrl ? "شعار مخصص" : "الافتراضي"}
            </span>
            <span className={styles.kpiLabel}>حالة شعار المطعم</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Palette size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{selectedColorName}</span>
            <span className={styles.kpiLabel}>لون الهوية المعتمد</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>تحديث فوري</span>
            <span className={styles.kpiLabel}>المزامنة مع قائمة العميل</span>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className={styles.errorBanner} role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {!selectedBranchId ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Building2 size={28} />
          </div>
          <h3>يرجى اختيار فرع أولاً</h3>
          <p>حدد فرعاً لتعديل هويته وشعاره وبياناته.</p>
        </div>
      ) : (
        <div className={styles.settingsGrid}>
          {/* Form Column */}
          <div className={styles.settingsCol}>
            {/* Card 1: Store Details */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Store size={20} />
                </div>
                <div>
                  <h2>بيانات الفرع والموقع</h2>
                  <p>المعلومات الأساسية التي تظهر في ترويسة القائمة والفاتورة.</p>
                </div>
              </div>

              <form onSubmit={handleSave} className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="store-name-ar">اسم المطعم / الفرع (بالعربية) *</label>
                  <input
                    id="store-name-ar"
                    type="text"
                    required
                    placeholder="مثال: لاونج داين هب"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="store-name-en">اسم الفرع (بالإنجليزية - اختياري)</label>
                  <input
                    id="store-name-en"
                    type="text"
                    dir="ltr"
                    placeholder="e.g. DineHub Lounge"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="store-address">العنوان أو الحي</label>
                  <input
                    id="store-address"
                    type="text"
                    placeholder="مثال: طريق التخصصي، حي المعذر، الرياض"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="store-phone">رقم الهاتف أو خدمة العملاء</label>
                  <input
                    id="store-phone"
                    type="tel"
                    dir="ltr"
                    placeholder="+966 50 000 0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </form>
            </section>

            {/* Card 2: Visual Identity & Brand Color */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Palette size={20} />
                </div>
                <div>
                  <h2>الشعار واللون المميز</h2>
                  <p>تخصيص الهوية البصرية لشاشات الطلب وقائمة العميل.</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>شعار الفرع أو المطعم</label>
                  <ImageUploader
                    value={formData.logoUrl}
                    onChange={(url) =>
                      setFormData({ ...formData, logoUrl: url })
                    }
                    label="رفع شعار المتجر"
                    description="يفضل صورة مربعة بخلفية شفافة PNG أو WebP"
                    aspectRatio="square"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>لون الهوية الرئيسي لشاشات العميل</label>
                  <div className={styles.colorPresetsGrid}>
                    {PRESET_COLORS.map((preset) => {
                      const isActive =
                        formData.themeColor.toLowerCase() === preset.hex.toLowerCase();
                      return (
                        <button
                          key={preset.hex}
                          type="button"
                          className={styles.colorOption}
                          data-active={String(isActive)}
                          onClick={() =>
                            setFormData({ ...formData, themeColor: preset.hex })
                          }
                        >
                          <span
                            className={styles.colorSwatch}
                            style={{ backgroundColor: preset.hex }}
                          />
                          <span>{preset.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Live Mobile Customer Preview Column */}
          <div className={styles.previewCol}>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch}>
                <div className={styles.phoneSpeaker} />
              </div>

              <div className={styles.phoneContent}>
                {/* Brand Banner Header */}
                <div className={styles.phoneHeader}>
                  <div className={styles.phoneLogo}>
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo Preview" />
                    ) : (
                      <Store size={20} style={{ color: formData.themeColor }} />
                    )}
                  </div>
                  <div className={styles.phoneTitles}>
                    <strong>{formData.name || "اسم المطعم / المتجر"}</strong>
                    <small>{formData.address || "حي النخيل، الرياض"}</small>
                  </div>
                  <div
                    style={{
                      backgroundColor: `${formData.themeColor}18`,
                      borderColor: `${formData.themeColor}35`,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "10px",
                      padding: "3px 7px",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      color: formData.themeColor,
                      flexShrink: 0,
                    }}
                  >
                    طاولة #04
                  </div>
                </div>

                {/* Mini Category Pills */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    overflowX: "hidden",
                    paddingBottom: "2px",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: formData.themeColor,
                      color: "#ffffff",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    الكل
                  </span>
                  <span
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#b9aebd",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    مشروبات
                  </span>
                  <span
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      color: "#b9aebd",
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    حلويات
                  </span>
                </div>

                {/* Rich Sample Product Card */}
                <div className={styles.sampleMenuCard}>
                  <div className={styles.sampleMenuHead}>
                    <span style={{ fontSize: "0.78rem" }}>فلات وايت كلاسيك</span>
                    <span style={{ color: formData.themeColor, fontSize: "0.78rem", fontWeight: 800 }}>
                      18.00 ر.س
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.68rem", color: "#b9aebd", lineHeight: 1.4 }}>
                    إسبريسو فاخر مع حليب مبخر بقوام مخملي ناعم
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                    <span
                      style={{
                        backgroundColor: formData.themeColor,
                        color: "#ffffff",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      + إضافة
                    </span>
                  </div>
                </div>

                {/* Floating Cart Bar Sample */}
                <button
                  type="button"
                  className={styles.sampleOrderBtn}
                  style={{
                    backgroundColor: formData.themeColor,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        backgroundColor: "rgba(0, 0, 0, 0.25)",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.65rem",
                        fontWeight: 800,
                      }}
                    >
                      1
                    </span>
                    <span>عرض ومراجعة الطلب</span>
                  </div>
                  <span style={{ fontWeight: 800, fontFamily: "monospace" }}>18.00 ر.س</span>
                </button>
              </div>
            </div>

            <p
              style={{
                textAlign: "center",
                color: "#b9aebd",
                fontSize: "0.76rem",
                marginTop: "12px",
              }}
            >
              معاينة حية فورية لما يراه العميل على هاتفه الذكي
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
