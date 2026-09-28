"use client";

import { apiErrorMessage } from "@/lib/api-error";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import { ImageUploader } from "@/components/ui/image-uploader";
import styles from "./settings.module.css";
import {
  MenuThemeSettings,
  MenuThemePreview,
} from "@/components/admin/menu-theme-settings";

const PRESET_COLORS = [
  { key: "coral", hex: "#f2644b" },
  { key: "teal", hex: "#47aaa1" },
  { key: "gold", hex: "#d4af37" },
  { key: "purple", hex: "#8b5cf6" },
  { key: "emerald", hex: "#10b981" },
  { key: "sapphire", hex: "#3b82f6" },
  { key: "velvet", hex: "#e11d48" },
  { key: "amber", hex: "#f59e0b" },
];

export default function BranchSettingsPage() {
  const locale = useLocale();
  const t = useTranslations("AdminSettings");
  const tCommon = useTranslations("AdminCommon");
  const isRtl = locale !== "en";

  const {
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
    menuTheme: "signature",
    showSpecialDiscount: false,
    discountPercent: 0,
    googleReviewUrl: "",
    enableReviews: true,
  });

  const [draftBranch, setDraftBranch] = useState<typeof selectedBranch>(null);
  if (draftBranch !== selectedBranch) {
    setDraftBranch(selectedBranch);
    if (selectedBranch) {
      setFormData({
        name: selectedBranch.nameAr || selectedBranch.name || "",
        nameEn: selectedBranch.nameEn || "",
        address: selectedBranch.address || "",
        phone: selectedBranch.phone || "",
        logoUrl: selectedBranch.logoUrl || "",
        themeColor: selectedBranch.themeColor || "#f2644b",
        menuTheme: selectedBranch.menuTheme || "signature",
        showSpecialDiscount: selectedBranch.showSpecialDiscount ?? false,
        discountPercent: selectedBranch.discountPercent ?? 0,
        googleReviewUrl: selectedBranch.googleReviewUrl || "",
        enableReviews: selectedBranch.enableReviews ?? true,
      });
      setErrorMsg("");
      setSuccessMsg("");
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg(t("selectBranchFirst"));
      return;
    }

    if (
      formData.showSpecialDiscount &&
      (!Number.isInteger(formData.discountPercent) ||
        formData.discountPercent < 1 ||
        formData.discountPercent > 100)
    ) {
      setErrorMsg(
        isRtl
          ? "أدخل نسبة خصم صحيحة من ١ إلى ١٠٠."
          : "Enter a whole discount percentage from 1 to 100.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      await apiClient.patch(`/admin/branches/${selectedBranchId}`, {
        logoUrl: formData.logoUrl.trim() || undefined,
        themeColor: formData.themeColor.trim() || "#f2644b",
        menuTheme: formData.menuTheme,
        showSpecialDiscount: formData.showSpecialDiscount,
        discountPercent: formData.discountPercent,
        googleReviewUrl: formData.googleReviewUrl.trim() || null,
        enableReviews: formData.enableReviews,
      });

      setSuccessMsg(t("successSaved"));
      await refreshBranches();
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: unknown) {
      console.error("Save settings error:", err);
      setErrorMsg(
        apiErrorMessage(err) ||
          (isRtl
            ? "تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى."
            : "Failed to save settings. Please try again."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const matchedColor = PRESET_COLORS.find(
    (c) => c.hex.toLowerCase() === formData.themeColor.toLowerCase(),
  );
  const selectedColorName = matchedColor
    ? t(`colors.${matchedColor.key}`)
    : t("customColor");

  const displayName = isRtl
    ? formData.name || formData.nameEn || selectedBranch?.name || ""
    : formData.nameEn || formData.name || selectedBranch?.name || "";

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {tCommon("admin")} • {t("pageTitle")}
          </p>
          <h1>{t("pageTitle")}</h1>
          <p>{t("pageDesc")}</p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => refreshBranches()}
            disabled={isLoadingBranches}
            aria-label={tCommon("refresh")}
          >
            <RotateCcw
              size={17}
              className={isLoadingBranches ? "animate-spin" : undefined}
            />
            <span>{tCommon("refresh")}</span>
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
                <span>{t("saving")}</span>
              </>
            ) : (
              <>
                <Save size={17} strokeWidth={2.2} />
                <span>{t("saveChanges")}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label={t("pageTitle")}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <Store size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{displayName || "—"}</span>
            <span className={styles.kpiLabel}>
              {isRtl ? "اسم الفرع الحالي" : "Current Branch Name"}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <ImageIcon size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {formData.logoUrl
                ? isRtl
                  ? "شعار مخصص"
                  : "Custom Logo"
                : isRtl
                  ? "الافتراضي"
                  : "Default"}
            </span>
            <span className={styles.kpiLabel}>
              {isRtl ? "حالة شعار المطعم" : "Brand Logo Status"}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Palette size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{selectedColorName}</span>
            <span className={styles.kpiLabel}>
              {isRtl ? "لون الهوية المعتمد" : "Active Theme Color"}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {isRtl ? "تحديث فوري" : "Instant Sync"}
            </span>
            <span className={styles.kpiLabel}>
              {isRtl ? "المزامنة مع قائمة العميل" : "Guest Menu Sync"}
            </span>
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
          <h3>{t("selectBranchFirst")}</h3>
          <p>
            {isRtl
              ? "حدد فرعاً لتعديل هويته وشعاره وبياناته."
              : "Select a branch to customize its brand identity, logo, and details."}
          </p>
        </div>
      ) : (
        <div className={styles.settingsGrid}>
          {/* Form Column */}
          <div className={styles.settingsCol}>
            {/* Card 1: Active Branch Overview (Eliminates duplication with Branches page) */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Store size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <h2>{isRtl ? "بيانات الفرع النشط" : "Active Branch Profile"}</h2>
                    <Link
                      href="/admin/branches"
                      className={styles.branchEditLink}
                    >
                      <Building2 size={15} />
                      <span>{isRtl ? "إدارة وتعديل الفروع ←" : "Manage in Branches →"}</span>
                    </Link>
                  </div>
                  <p>
                    {isRtl
                      ? "تتم إدارة أسماء الفروع والعناوين وأرقام التواصل مركزيًا من صفحة الفروع لتجنب التكرار. أدناه يمكنك تخصيص مظهر القائمة، ألوان الهوية، والتقييمات."
                      : "Branch names, addresses, and contacts are managed centrally in the Branches page. Below, customize this branch's menu theme, brand colors, discounts, and Google Reviews."}
                  </p>
                </div>
              </div>

              <div className={styles.branchSummaryCard}>
                <div className={styles.branchSummaryGrid}>
                  <div className={styles.branchSummaryItem}>
                    <span className={styles.branchSummaryLabel}>
                      {isRtl ? "الاسم بالعربية" : "Arabic Name"}
                    </span>
                    <span className={styles.branchSummaryValue}>
                      {selectedBranch?.nameAr || selectedBranch?.name || "—"}
                    </span>
                  </div>

                  <div className={styles.branchSummaryItem}>
                    <span className={styles.branchSummaryLabel}>
                      {isRtl ? "الاسم بالإنجليزية" : "English Name"}
                    </span>
                    <span className={styles.branchSummaryValue}>
                      {selectedBranch?.nameEn || selectedBranch?.name || "—"}
                    </span>
                  </div>

                  <div className={styles.branchSummaryItem}>
                    <span className={styles.branchSummaryLabel}>
                      {isRtl ? "العنوان والموقع" : "Address & Location"}
                    </span>
                    <span className={styles.branchSummaryValue}>
                      {selectedBranch?.addressAr || selectedBranch?.address || selectedBranch?.addressEn || (isRtl ? "غير محدد" : "Not specified")}
                    </span>
                  </div>

                  <div className={styles.branchSummaryItem}>
                    <span className={styles.branchSummaryLabel}>
                      {isRtl ? "هاتف التواصل" : "Contact Phone"}
                    </span>
                    <span className={styles.branchSummaryValue} dir="ltr" style={{ justifyContent: isRtl ? "flex-end" : "flex-start" }}>
                      {selectedBranch?.phone || (isRtl ? "غير محدد" : "Not specified")}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2>
                    {isRtl
                      ? "مظاهر القائمة والمناسبات"
                      : "Menu themes & occasions"}
                  </h2>
                  <p>
                    {isRtl
                      ? "هوية متكاملة لكل مناسبة، مع خصم اختياري."
                      : "A complete look for every occasion, with an optional offer."}
                  </p>
                </div>
              </div>
              <MenuThemeSettings
                ar={isRtl}
                value={formData}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    menuTheme: value.menuTheme || "signature",
                    showSpecialDiscount: value.showSpecialDiscount ?? false,
                    discountPercent: value.discountPercent ?? 0,
                  })
                }
              />
            </section>

            {/* Card 3: Customer Reviews & Google Maps Integration */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Star size={20} className="text-amber-400" />
                </div>
                <div>
                  <h2>{t("customerReviewsTitle")}</h2>
                  <p>{t("customerReviewsDesc")}</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                {/* Toggle switch for enabling customer reviews */}
                <div className={styles.inputGroup} style={{ gridColumn: "1 / -1" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "14px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", display: "block" }}>
                        {t("enableReviewsLabel")}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#a89eb0", display: "block", marginTop: "4px" }}>
                        {t("enableReviewsDesc")}
                      </span>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.enableReviews}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          enableReviews: !formData.enableReviews,
                        })
                      }
                      style={{
                        width: "48px",
                        height: "28px",
                        borderRadius: "9999px",
                        backgroundColor: formData.enableReviews ? "#10b981" : "rgba(255, 255, 255, 0.2)",
                        position: "relative",
                        transition: "background-color 0.2s ease",
                        cursor: "pointer",
                        border: "none",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: "22px",
                          height: "22px",
                          borderRadius: "9999px",
                          backgroundColor: "#ffffff",
                          position: "absolute",
                          top: "3px",
                          left: formData.enableReviews ? (isRtl ? "4px" : "22px") : (isRtl ? "22px" : "4px"),
                          transition: "left 0.2s ease",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Google Reviews Link */}
                <div className={styles.inputGroup} style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="google-review-url">
                    {t("googleReviewUrlLabel")}
                  </label>
                  <input
                    id="google-review-url"
                    type="url"
                    dir="ltr"
                    placeholder={t("googleReviewUrlPlaceholder")}
                    value={formData.googleReviewUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, googleReviewUrl: e.target.value })
                    }
                  />
                  <p style={{ fontSize: "0.78rem", color: "#a89eb0", marginTop: "6px", lineHeight: 1.5 }}>
                    {t("googleReviewUrlHelp")}
                  </p>
                </div>
              </div>
            </section>

            {/* Card 2: Visual Identity & Brand Color */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Palette size={20} />
                </div>
                <div>
                  <h2>{t("brandIdentity")}</h2>
                  <p>{t("brandDesc")}</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label>{t("logoLabel")}</label>
                  <ImageUploader
                    value={formData.logoUrl}
                    onChange={(url) =>
                      setFormData({ ...formData, logoUrl: url })
                    }
                    label={isRtl ? "رفع شعار المتجر" : "Upload Brand Logo"}
                    description={
                      isRtl
                        ? "يفضل صورة مربعة بخلفية شفافة PNG أو WebP"
                        : "Square PNG or WebP with transparent background recommended"
                    }
                    aspectRatio="square"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>{t("themeColorLabel")}</label>
                  <div className={styles.colorPresetsGrid}>
                    {PRESET_COLORS.map((preset) => {
                      const isActive =
                        formData.themeColor.toLowerCase() ===
                        preset.hex.toLowerCase();
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
                          <span>{t(`colors.${preset.key}`)}</span>
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
            <MenuThemePreview value={formData} ar={isRtl} name={displayName} />
            <p
              style={{
                textAlign: "center",
                color: "#b9aebd",
                fontSize: "0.76rem",
                marginTop: "12px",
              }}
            >
              {t("previewDesc")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
