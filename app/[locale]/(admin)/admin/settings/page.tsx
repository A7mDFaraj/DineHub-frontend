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
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import { ImageUploader } from "@/components/ui/image-uploader";
import styles from "./settings.module.css";

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
    if (!formData.name.trim() && !formData.nameEn.trim()) {
      setErrorMsg(t("errorNoName"));
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

      setSuccessMsg(t("successSaved"));
      await refreshBranches();
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err: unknown) {
      console.error("Save settings error:", err);
      setErrorMsg(
        apiErrorMessage(err) || (isRtl ? "تعذر حفظ الإعدادات. يرجى المحاولة مرة أخرى." : "Failed to save settings. Please try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const matchedColor = PRESET_COLORS.find(
    (c) => c.hex.toLowerCase() === formData.themeColor.toLowerCase()
  );
  const selectedColorName = matchedColor
    ? t(`colors.${matchedColor.key}`)
    : t("customColor");

  const displayName = isRtl
    ? (formData.name || formData.nameEn || selectedBranch?.name || "")
    : (formData.nameEn || formData.name || selectedBranch?.name || "");

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
            <span className={styles.kpiValue}>
              {displayName || "—"}
            </span>
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
                ? (isRtl ? "شعار مخصص" : "Custom Logo")
                : (isRtl ? "الافتراضي" : "Default")}
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
            {/* Card 1: Store Details */}
            <section className={styles.sectionCard}>
              <div className={styles.cardHead}>
                <div className={styles.cardHeadIcon}>
                  <Store size={20} />
                </div>
                <div>
                  <h2>{t("generalInfo")}</h2>
                  <p>
                    {isRtl
                      ? "المعلومات الأساسية التي تظهر في ترويسة القائمة والفاتورة."
                      : "Basic branch information displayed in digital menus and guest receipts."}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="store-name-ar">{t("nameArLabel")} *</label>
                  <input
                    id="store-name-ar"
                    type="text"
                    required
                    placeholder={isRtl ? "مثال: لاونج داين هب" : "e.g. DineHub Lounge (Arabic)"}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="store-name-en">{t("nameEnLabel")}</label>
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
                  <label htmlFor="store-address">{t("addressLabel")}</label>
                  <input
                    id="store-address"
                    type="text"
                    placeholder={isRtl ? "مثال: طريق التخصصي، حي المعذر، الرياض" : "e.g. Takhassusi St, Al Mathar, Riyadh"}
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="store-phone">{t("phoneLabel")}</label>
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
            <div className={styles.phoneFrame}>
              <div className={styles.phoneNotch}>
                <div className={styles.phoneSpeaker} />
              </div>

              <div className={styles.phoneContent} dir={isRtl ? "rtl" : "ltr"}>
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
                    <strong>
                      {displayName || (isRtl ? "اسم المطعم / المتجر" : "Restaurant / Cafe Name")}
                    </strong>
                    <small>
                      {formData.address || (isRtl ? "حي النخيل، الرياض" : "Al Nakheel, Riyadh")}
                    </small>
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
                    {isRtl ? "طاولة #04" : "Table #04"}
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
                    {t("sampleCategoryAll")}
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
                    {t("sampleCategoryDrinks")}
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
                    {t("sampleCategoryDesserts")}
                  </span>
                </div>

                {/* Rich Sample Product Card */}
                <div className={styles.sampleMenuCard}>
                  <div className={styles.sampleMenuHead}>
                    <span style={{ fontSize: "0.78rem" }}>{t("sampleProductName")}</span>
                    <span style={{ color: formData.themeColor, fontSize: "0.78rem", fontWeight: 800 }}>
                      {isRtl ? "18.00 ر.س" : "SAR 18.00"}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.68rem", color: "#b9aebd", lineHeight: 1.4 }}>
                    {t("sampleProductDesc")}
                  </p>
                  <div style={{ display: "flex", justifyContent: isRtl ? "flex-start" : "flex-end", marginTop: "4px" }}>
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
                      {t("sampleAdd")}
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
                    <span>{t("sampleReviewOrder")}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontFamily: "monospace" }}>
                    {isRtl ? "18.00 ر.س" : "SAR 18.00"}
                  </span>
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
              {t("previewDesc")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
