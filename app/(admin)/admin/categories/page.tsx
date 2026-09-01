"use client";

import { useEffect, useState } from "react";
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

  const fetchCategories = async (branchId: string) => {
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
    } catch (err: any) {
      console.error(err);
      setErrorMsg("تعذر جلب تصنيفات هذا الفرع. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoadingCats(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchCategories(selectedBranchId);
    } else {
      setCategories([]);
    }
  }, [selectedBranchId]);

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
      setErrorMsg("يرجى اختيار فرع أولاً.");
      return;
    }
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) {
      setErrorMsg("يرجى إدخال اسم التصنيف بالعربية أو الإنجليزية.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const primaryName =
        formData.nameAr.trim() || formData.nameEn.trim();

      if (editingCategory) {
        await apiClient.patch(`/admin/categories/${editingCategory.id}`, {
          branchId: selectedBranchId,
          name: primaryName,
          nameAr: formData.nameAr.trim() || undefined,
          nameEn: formData.nameEn.trim() || undefined,
        });
        setSuccessMsg("تم تعديل التصنيف بنجاح.");
      } else {
        await apiClient.post("/admin/categories", {
          branchId: selectedBranchId,
          name: primaryName,
          nameAr: formData.nameAr.trim() || undefined,
          nameEn: formData.nameEn.trim() || undefined,
          sortOrder: categories.length + 1,
        });
        setSuccessMsg("تمت إضافة التصنيف بنجاح.");
      }

      await fetchCategories(selectedBranchId);
      setIsDialogOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.response?.data?.message || "تعذر حفظ التصنيف. يرجى المحاولة لاحقاً."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveCategory = async (
    index: number,
    direction: "up" | "down"
  ) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const currentCat = categories[index];
    const targetCat = categories[targetIndex];

    const currentOrder = currentCat.sortOrder ?? index + 1;
    const targetOrder = targetCat.sortOrder ?? targetIndex + 1;

    // Optimistic UI update
    const newCategories = [...categories];
    newCategories[index] = { ...targetCat, sortOrder: currentOrder };
    newCategories[targetIndex] = { ...currentCat, sortOrder: targetOrder };
    setCategories(newCategories);

    try {
      await Promise.all([
        apiClient.patch(`/admin/categories/${currentCat.id}`, {
          sortOrder: targetOrder,
        }),
        apiClient.patch(`/admin/categories/${targetCat.id}`, {
          sortOrder: currentOrder,
        }),
      ]);
      if (selectedBranchId) {
        await fetchCategories(selectedBranchId);
      }
    } catch (err) {
      console.error("Reordering error:", err);
      if (selectedBranchId) {
        await fetchCategories(selectedBranchId);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || !selectedBranchId) return;

    try {
      setIsDeleting(true);
      setErrorMsg("");
      await apiClient.delete(`/admin/categories/${categoryToDelete.id}`);
      setSuccessMsg(`تم حذف تصنيف "${categoryToDelete.nameAr || categoryToDelete.name || "المحدد"}" بنجاح.`);
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await fetchCategories(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Delete category error:", err);
      setErrorMsg(
        err?.response?.data?.message || "تعذر حذف التصنيف. قد يحتوي على منتجات مرتبطة."
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
            الإدارة • قائمة الطعام
          </p>
          <h1>التصنيفات وترتيب القائمة</h1>
          <p>
            رتّب أقسام قائمتك وحدد تسلسل ظهورها للعميل عند مسح رمز الطاولة.
          </p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => selectedBranchId && fetchCategories(selectedBranchId)}
            disabled={isLoadingCats || !selectedBranchId}
            aria-label="تحديث التصنيفات"
          >
            <RotateCcw
              size={17}
              className={isLoadingCats ? "animate-spin" : undefined}
            />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => handleOpenCreate()}
            disabled={!selectedBranchId}
          >
            <Plus size={18} strokeWidth={2.2} />
            <span>إضافة تصنيف</span>
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label="ملخص التصنيفات">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <Tags size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{categories.length}</span>
            <span className={styles.kpiLabel}>
              تصنيفات {selectedBranch?.nameAr || selectedBranch?.name || "الفرع"}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <Layers size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {categories.length > 0 ? "مرتبة ومباشرة" : "قائمة فارغة"}
            </span>
            <span className={styles.kpiLabel}>حالة عرض القائمة للعملاء</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {categories[0]?.nameAr || categories[0]?.name || "—"}
            </span>
            <span className={styles.kpiLabel}>التصنيف الأول في العرض</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>ثنائي اللغة</span>
            <span className={styles.kpiLabel}>دعم العربية والإنجليزية</span>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isDialogOpen && !isDeleteDialogOpen && (
        <div className={styles.errorBanner} role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories Content Section */}
      <section className={styles.categorySection}>
        <div className={styles.sectionHead}>
          <div>
            <h2>ترتيب أقسام القائمة</h2>
            <p>استخدم أسهم الترتيب لتغيير تسلسل ظهور الأقسام في هاتف العميل.</p>
          </div>
          {categories.length > 1 && (
            <span style={{ fontSize: "0.78rem", color: "#8cd1ca", fontWeight: 650 }}>
              يتم حفظ الترتيب فورياً تلقائياً
            </span>
          )}
        </div>

        {isLoadingCats && categories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h3>جارٍ تحميل التصنيفات…</h3>
          </div>
        ) : !selectedBranchId ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Tags size={28} />
            </div>
            <h3>يرجى اختيار فرع أولاً</h3>
            <p>حدد فرعاً من القائمة المنسدلة بالأعلى لعرض وإدارة تصنيفاته.</p>
          </div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Tags size={28} />
            </div>
            <h3>لا توجد تصنيفات معرفة لهذا الفرع</h3>
            <p>
              أضف أول تصنيف لتنظيم أصناف الطعام، أو اختر أحد الاقتراحات السريعة أدناه:
            </p>
            <div className={styles.quickStarters}>
              <span>اقتراحات سريعة:</span>
              {STARTER_SUGGESTIONS.map((item) => (
                <button
                  key={item.ar}
                  type="button"
                  className={styles.starterChip}
                  onClick={() => handleOpenCreate(item.ar, item.en)}
                >
                  <Plus size={13} />
                  <span>{item.ar}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.categoryList}>
            {categories.map((cat, idx) => {
              const displayNameAr = cat.nameAr || cat.name || "تصنيف بدون اسم";
              const displayNameEn = cat.nameEn || "";
              const formattedIndex = String(idx + 1).padStart(2, "0");

              return (
                <div key={cat.id} className={styles.categoryCard}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.orderBadge}>{formattedIndex}</span>
                    <div className={styles.categoryTitles}>
                      <h3>{displayNameAr}</h3>
                      {displayNameEn && <span>{displayNameEn}</span>}
                    </div>
                  </div>

                  <div className={styles.categoryActions}>
                    <div className={styles.orderControl}>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => handleMoveCategory(idx, "up")}
                        disabled={idx === 0}
                        title="تحريك لأعلى"
                        aria-label={`تحريك ${displayNameAr} لأعلى`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className={styles.orderBtn}
                        onClick={() => handleMoveCategory(idx, "down")}
                        disabled={idx === categories.length - 1}
                        title="تحريك لأسفل"
                        aria-label={`تحريك ${displayNameAr} لأسفل`}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleOpenEdit(cat)}
                      title="تعديل التصنيف"
                      aria-label={`تعديل تصنيف ${displayNameAr}`}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      data-variant="danger"
                      onClick={() => {
                        setCategoryToDelete(cat);
                        setIsDeleteDialogOpen(true);
                      }}
                      title="حذف التصنيف"
                      aria-label={`حذف تصنيف ${displayNameAr}`}
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
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingCategory ? "تعديل التصنيف" : "إضافة تصنيف جديد"}
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
                <label htmlFor="cat-name-ar">اسم التصنيف (بالعربية) *</label>
                <input
                  id="cat-name-ar"
                  type="text"
                  required
                  placeholder="مثال: المشروبات الساخنة"
                  value={formData.nameAr}
                  onChange={(e) =>
                    setFormData({ ...formData, nameAr: e.target.value })
                  }
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="cat-name-en">اسم التصنيف (بالإنجليزية - اختياري)</label>
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
                    <span>{editingCategory ? "حفظ التعديلات" : "إضافة التصنيف"}</span>
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
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>تأكيد حذف التصنيف</Dialog.Title>
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

            <p style={{ color: "#cbbfce", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 20px" }}>
              هل أنت متأكد من رغبتك في حذف تصنيف{" "}
              <strong style={{ color: "#fffdf9" }}>
                "{categoryToDelete?.nameAr || categoryToDelete?.name}"
              </strong>
              ؟ لن تتمكن من التراجع عن هذه الخطوة.
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                إلغاء
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
                    <span>جارٍ الحذف…</span>
                  </>
                ) : (
                  <span>نعم، احذف التصنيف</span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
