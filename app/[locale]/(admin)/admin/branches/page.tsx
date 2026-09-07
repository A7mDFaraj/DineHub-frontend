"use client";

import { apiErrorMessage } from "@/lib/api-error";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  CheckCircle2,
  Edit3,
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
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch, type Branch } from "@/lib/admin-branch-context";
import styles from "./branches.module.css";

export default function BranchesPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminBranches");
  const tCommon = useTranslations("AdminCommon");

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
      name: branch.nameAr || branch.name || branch.nameEn || "",
      address: branch.address || branch.addressAr || branch.addressEn || "",
      phone: branch.phone || "",
    });
    setErrorMsg("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg(t("branchNameLabel"));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      if (editingBranch) {
        await apiClient.patch(`/admin/branches/${editingBranch.id}`, {
          name: formData.name.trim(),
          nameAr: formData.name.trim(),
          address: formData.address.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });
        setSuccessMsg(tCommon("success"));
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
        setSuccessMsg(tCommon("success"));
      }

      await refreshBranches();
      setIsDialogOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        apiErrorMessage(err) || tCommon("error")
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
            DineHub • {t("pageTitle")}
          </p>
          <h1>{t("pageTitle")}</h1>
          <p className={styles.pageLead}>{t("pageDesc")}</p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void refreshBranches()}
            disabled={isLoadingBranches}
            aria-label={tCommon("retry")}
            title={tCommon("retry")}
          >
            <RotateCcw
              size={18}
              className={isLoadingBranches ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            className={styles.createButton}
            onClick={handleOpenCreate}
          >
            <Plus size={18} />
            <span>{t("addBranch")}</span>
          </button>
        </div>
      </header>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoadingBranches && branches.length === 0 ? (
        <div className={styles.loadingState}>
          <Loader2 size={32} className="animate-spin" />
          <p>{tCommon("loading")}</p>
        </div>
      ) : branches.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Store size={40} strokeWidth={1.5} />
          </div>
          <h3>{t("emptyTitle")}</h3>
          <p>{t("emptyDesc")}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenCreate}
          >
            <Sparkles size={17} />
            <span>{t("addBranch")}</span>
          </button>
        </div>
      ) : (
        <div className={styles.branchGrid}>
          {branches.map((branch) => {
            const displayName = isRtl
              ? (branch.nameAr || branch.name || branch.nameEn)
              : (branch.nameEn || branch.name || branch.nameAr);
            const displayAddress = isRtl
              ? (branch.addressAr || branch.address || branch.addressEn)
              : (branch.addressEn || branch.address || branch.addressAr);

            return (
              <article key={branch.id} className={styles.branchCard}>
                <div className={styles.cardHead}>
                  <div className={styles.brandLock}>
                    <span className={styles.branchLogo}>
                      <Building2 size={22} strokeWidth={1.8} />
                    </span>
                    <div className={styles.branchTitles}>
                      <h2>{displayName}</h2>
                      <p>
                        ID: {branch.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <span className={styles.statusBadge}>
                    <i aria-hidden="true" />
                    <span>{tCommon("active")}</span>
                  </span>
                </div>

                <div className={styles.cardDetails}>
                  <div className={styles.detailRow}>
                    <MapPin size={15} />
                    <span>{displayAddress || "—"}</span>
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
                    title={t("menuManagement")}
                  >
                    <UtensilsCrossed size={16} />
                    <span>{t("menuManagement")}</span>
                  </Link>

                  <Link
                    href="/admin/qr-code"
                    className={styles.navAction}
                    onClick={() => setSelectedBranchId(branch.id)}
                    title={t("viewQrCodes")}
                  >
                    <QrCode size={16} />
                    <span>{t("viewQrCodes")}</span>
                  </Link>

                  <Link
                    href="/admin/settings"
                    className={styles.navAction}
                    onClick={() => setSelectedBranchId(branch.id)}
                    title={t("branchSettings")}
                  >
                    <Settings size={16} />
                    <span>{t("branchSettings")}</span>
                  </Link>
                </div>

                <button
                  type="button"
                  className={styles.editAction}
                  onClick={() => handleOpenEdit(branch)}
                >
                  <Edit3 size={15} />
                  <span>{t("editBranch")}</span>
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
          <Dialog.Content
            className={styles.dialogContent}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingBranch ? t("editBranch") : t("addBranch")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label={tCommon("cancel")}
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
                <label htmlFor="branch-name">{t("branchNameLabel")} *</label>
                <input
                  id="branch-name"
                  type="text"
                  required
                  placeholder={t("branchNamePlaceholder")}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="branch-address">{t("addressLabel")}</label>
                <input
                  id="branch-address"
                  type="text"
                  placeholder={t("addressPlaceholder")}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="branch-phone">{t("phoneLabel")}</label>
                <input
                  id="branch-phone"
                  type="tel"
                  dir="ltr"
                  placeholder={t("phonePlaceholder")}
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
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{tCommon("loading")}</span>
                    </>
                  ) : (
                    <span>{tCommon("save")}</span>
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
