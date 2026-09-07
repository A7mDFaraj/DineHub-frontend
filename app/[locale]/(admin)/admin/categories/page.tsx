"use client";

import { apiErrorMessage } from "@/lib/api-error";
import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import styles from "./categories.module.css";

interface Category {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  sortOrder?: number;
  branchId?: string;
}

const STARTER_SUGGESTIONS = [
  { ar: "المشروبات الساخنة", en: "Hot Drinks" },
  { ar: "المشروبات الباردة", en: "Cold Drinks" },
  { ar: "الأطباق الرئيسية", en: "Main Dishes" },
  { ar: "المقبلات والوجبات الخفيفة", en: "Appetizers" },
  { ar: "الحلويات والمخبوزات", en: "Desserts & Bakery" },
];

export default function CategoriesPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminCategories");
  const tCommon = useTranslations("AdminCommon");

  const {
    branches,
    selectedBranchId,
    selectedBranch,
    isLoadingBranches,
  } = useAdminBranch();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
  });

  const fetchCategories = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoadingCats(true);
      setErrorMsg("");
      const { data } = await apiClient.get(`/admin/categories/${branchId}`);
      const rawList = Array.isArray(data)
        ? data
        : data?.data || data?.categories || [];
      const sorted = rawList
        .slice()
        .sort(
          (a: Category, b: Category) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
      setCategories(sorted);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(tCommon("error"));
    } finally {
      setIsLoadingCats(false);
    }
  }, [tCommon]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedBranchId) {
        fetchCategories(selectedBranchId);
      } else {
        setCategories([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedBranchId, fetchCategories]);

  const handleOpenCreate = (presetAr?: string, presetEn?: string) => {
    setEditingCategory(null);
    setFormData({
      nameAr: presetAr || "",
      nameEn: presetEn || "",
    });
    setErrorMsg("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nameAr: category.nameAr || category.name || "",
      nameEn: category.nameEn || "",
    });
    setErrorMsg("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg(tCommon("currentBranch"));
      return;
    }
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) {
      setErrorMsg(t("nameArLabel"));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const primaryName =
        formData.nameAr.trim() || formData.nameEn.trim();

      if (editingCategory) {
        await apiClient.patch(
          `/admin/categories/${editingCategory.id}`,
          {
            name: primaryName,
            nameAr: formData.nameAr.trim() || undefined,
            nameEn: formData.nameEn.trim() || undefined,
          }
        );
        setSuccessMsg(tCommon("success"));
      } else {
        await apiClient.post("/admin/categories", {
          branchId: selectedBranchId,
          name: primaryName,
          nameAr: formData.nameAr.trim() || undefined,
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: categories.length,
        });
        setSuccessMsg(tCommon("success"));
      }

      await fetchCategories(selectedBranchId);
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

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!selectedBranchId) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setCategories(reordered);

    try {
      await Promise.all(
        reordered.map((cat, idx) =>
          apiClient.patch(`/admin/categories/${cat.id}`, {
            sortOrder: idx,
          })
        )
      );
    } catch (err) {
      console.error("Failed to persist category order:", err);
      void fetchCategories(selectedBranchId);
    }
  };

  const handleOpenDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !selectedBranchId) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/admin/categories/${categoryToDelete.id}`);
      setSuccessMsg(tCommon("success"));
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await fetchCategories(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        apiErrorMessage(err) || tCommon("error")
      );
    } finally {
      setIsDeleting(false);
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

        <div className={styles.headerControls}>
          <AdminBranchSelector className={styles.branchSelectWrap} />
          <button
            type="button"
            className={styles.createButton}
            onClick={() => handleOpenCreate()}
            disabled={!selectedBranchId}
          >
            <Plus size={18} />
            <span>{t("addCategory")}</span>
          </button>
        </div>
      </header>

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

      {categories.length === 0 && !isLoadingCats && (
        <section className={styles.starterSection} aria-label={t("starterTitle")}>
          <div className={styles.starterHeader}>
            <Sparkles size={18} className={styles.sparkleIcon} />
            <h2>{t("starterTitle")}</h2>
          </div>
          <p className={styles.starterLead}>
            {t("pageDesc")}
          </p>
          <div className={styles.starterChips}>
            {STARTER_SUGGESTIONS.map((s) => (
              <button
                key={s.ar}
                type="button"
                className={styles.starterChip}
                onClick={() => handleOpenCreate(s.ar, s.en)}
              >
                <Plus size={14} />
                <span>{isRtl ? s.ar : s.en}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.listSection}>
        <div className={styles.listSectionHeader}>
          <div className={styles.listHeadingWrap}>
            <Layers size={20} className={styles.listIcon} />
            <h2>
              {selectedBranch
                ? `${t("pageTitle")} (${isRtl ? (selectedBranch.nameAr || selectedBranch.name) : (selectedBranch.nameEn || selectedBranch.name)})`
                : t("pageTitle")}
            </h2>
            <span className={styles.badge}>
              {t("itemsCount", { count: categories.length })}
            </span>
          </div>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => selectedBranchId && fetchCategories(selectedBranchId)}
            disabled={isLoadingCats || !selectedBranchId}
            aria-label={tCommon("retry")}
            title={tCommon("retry")}
          >
            <RotateCcw
              size={16}
              className={isLoadingCats ? "animate-spin" : ""}
            />
          </button>
        </div>

        {isLoadingCats ? (
          <div className={styles.loadingState}>
            <Loader2 size={32} className="animate-spin" />
            <p>{tCommon("loading")}</p>
          </div>
        ) : !selectedBranchId ? (
          <div className={styles.emptyState}>
            <p>{tCommon("currentBranch")}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            <Tags size={40} strokeWidth={1.5} className={styles.emptyIcon} />
            <h3>{t("emptyTitle")}</h3>
            <p>{t("emptyDesc")}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => handleOpenCreate()}
            >
              <Plus size={17} />
              <span>{t("addCategory")}</span>
            </button>
          </div>
        ) : (
          <div className={styles.categoryList}>
            {categories.map((cat, index) => {
              const displayName = isRtl
                ? (cat.nameAr || cat.name || cat.nameEn)
                : (cat.nameEn || cat.name || cat.nameAr);
              const secondaryName = isRtl ? cat.nameEn : cat.nameAr;

              return (
                <div key={cat.id} className={styles.categoryRow}>
                  <div className={styles.orderControls}>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0}
                      aria-label={t("moveUp")}
                      title={t("moveUp")}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <span className={styles.orderIndex}>#{index + 1}</span>
                    <button
                      type="button"
                      className={styles.orderBtn}
                      onClick={() => handleMove(index, "down")}
                      disabled={index === categories.length - 1}
                      aria-label={t("moveDown")}
                      title={t("moveDown")}
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>

                  <div className={styles.catDetails}>
                    <span className={styles.catName}>{displayName}</span>
                    {secondaryName && (
                      <span className={styles.catSub} dir={isRtl ? "ltr" : "rtl"}>
                        {secondaryName}
                      </span>
                    )}
                  </div>

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleOpenEdit(cat)}
                      title={t("editCategory")}
                      aria-label={`${t("editCategory")} ${displayName}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleOpenDelete(cat)}
                      title={t("deleteConfirm")}
                      aria-label={`${t("deleteConfirm")} ${displayName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Category Dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={styles.dialogContent}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingCategory ? t("editCategory") : t("addCategory")}
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
                <label htmlFor="cat-name-ar">{t("nameArLabel")} *</label>
                <input
                  id="cat-name-ar"
                  type="text"
                  required
                  placeholder={isRtl ? "مثال: المشروبات الساخنة" : "e.g. Hot Drinks"}
                  value={formData.nameAr}
                  onChange={(e) =>
                    setFormData({ ...formData, nameAr: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="cat-name-en">{t("nameEnLabel")}</label>
                <input
                  id="cat-name-en"
                  type="text"
                  dir="ltr"
                  placeholder="e.g. Hot Beverages"
                  value={formData.nameEn}
                  onChange={(e) =>
                    setFormData({ ...formData, nameEn: e.target.value })
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

      {/* Delete Confirmation Dialog */}
      <Dialog.Root
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={styles.dialogContent}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("deleteConfirm")}</Dialog.Title>
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

            <p style={{ color: "#cbbfce", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 20px" }}>
              {t("deleteWarning")}
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ background: "#be4936" }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{tCommon("loading")}</span>
                  </>
                ) : (
                  <span>{tCommon("delete")}</span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
