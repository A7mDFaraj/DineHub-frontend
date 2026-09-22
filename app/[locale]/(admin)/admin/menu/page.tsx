"use client";

import { apiErrorMessage } from "@/lib/api-error";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  CheckCircle2,
  CloudCheck,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import { ImageUploader } from "@/components/ui/image-uploader";
import styles from "./menu.module.css";
import {
  FOOD_LABELS,
  ALLERGEN_KEYS,
  DIETARY_KEYS,
  INGREDIENT_KEYS,
} from "@/components/customer/food-labels";

interface Category {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
}

interface Attribute {
  id: string;
  branchId?: string;
  labelAr?: string;
  labelEn?: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn?: string;
  name?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  calories?: number | null;
  allergens?: string[];
  dietaryTags?: string[];
  ingredientTags?: string[];
  imageUrl?: string;
  isAvailable?: boolean;
  isHidden?: boolean;
  categoryId: string;
  category?: Category;
  attributes?: { attribute: Attribute }[];
}

type ProductForm = {
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  price: string;
  calories: string;
  allergens: string[];
  dietaryTags: string[];
  ingredientTags: string[];
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  price: "",
  calories: "",
  allergens: [],
  dietaryTags: [],
  ingredientTags: [],
  categoryId: "",
  imageUrl: "",
  isAvailable: true,
};

const isDraftMeaningful = (form: ProductForm) =>
  Boolean(
    form.nameAr.trim() || form.nameEn.trim() || form.descriptionAr.trim() ||
      form.descriptionEn.trim() || form.price || form.calories || form.imageUrl ||
      form.allergens.length || form.dietaryTags.length || form.ingredientTags.length,
  );

export default function MenuManagementPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminMenu");
  const tCommon = useTranslations("AdminCommon");

  const { selectedBranchId } = useAdminBranch();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingAttr, setIsSavingAttr] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [attrError, setAttrError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Product Form State
  const [formData, setFormData] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [draftRestored, setDraftRestored] = useState(false);

  // New Attribute Tag Form
  const [newAttrData, setNewAttrData] = useState({
    labelAr: "",
    labelEn: "",
  });

  const fetchMenuData = useCallback(
    async (branchId: string) => {
      if (!branchId) return;
      try {
        setIsLoadingMenu(true);
        setErrorMsg("");

        const [categoriesRes, productsRes, attributesRes] =
          await Promise.allSettled([
            apiClient.get(`/admin/categories/${branchId}`),
            apiClient.get(`/admin/products/branch/${branchId}`),
            apiClient.get(`/admin/attributes/${branchId}`),
          ]);

        if (categoriesRes.status === "fulfilled") {
          const catList = Array.isArray(categoriesRes.value.data)
            ? categoriesRes.value.data
            : categoriesRes.value.data?.data || [];
          setCategories(catList);
        }

        if (productsRes.status === "fulfilled") {
          const prodList = Array.isArray(productsRes.value.data)
            ? productsRes.value.data
            : productsRes.value.data?.data || [];
          setProducts(prodList);
        } else {
          const message = apiErrorMessage(productsRes.reason);
          setErrorMsg(
            message === "Internal server error"
              ? isRtl
                ? "تعذر تحميل المنتجات لأن قاعدة بيانات الخادم لم تُحدَّث بعد. شغّل ترحيل قاعدة البيانات في بيئة الإنتاج ثم أعد المحاولة."
                : "Products could not load because the server database has not been updated yet. Run the production database migration, then try again."
              : message || tCommon("error"),
          );
        }

        if (attributesRes.status === "fulfilled") {
          const attrList = Array.isArray(attributesRes.value.data)
            ? attributesRes.value.data
            : attributesRes.value.data?.data || [];
          setAttributes(attrList);
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg(tCommon("error"));
      } finally {
        setIsLoadingMenu(false);
      }
    },
    [isRtl, tCommon],
  );

  const draftKey = selectedBranchId
    ? `dinehub:product-draft:${selectedBranchId}:${editingProductId || "new"}`
    : "";

  useEffect(() => {
    if (!isProductModalOpen || !draftKey || !isDraftMeaningful(formData)) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ formData, selectedAttrIds, savedAt: Date.now() }),
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftKey, formData, isProductModalOpen, selectedAttrIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedBranchId) {
        fetchMenuData(selectedBranchId);
      } else {
        setProducts([]);
        setCategories([]);
        setAttributes([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedBranchId, fetchMenuData]);

  const handleOpenCreate = () => {
    setEditingProductId(null);
    const key = selectedBranchId
      ? `dinehub:product-draft:${selectedBranchId}:new`
      : "";
    let next = { ...EMPTY_PRODUCT_FORM, categoryId: categories[0]?.id || "" };
    let nextAttributes: string[] = [];
    let restored = false;
    if (key) {
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as { formData?: ProductForm; selectedAttrIds?: string[] };
          if (parsed.formData) next = { ...next, ...parsed.formData };
          if (Array.isArray(parsed.selectedAttrIds)) nextAttributes = parsed.selectedAttrIds;
          restored = true;
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    }
    setFormData(next);
    setSelectedAttrIds(nextAttributes);
    setDraftRestored(restored);
    setFormErrors({});
    setErrorMsg("");
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProductId(prod.id);
    setFormData({
      nameAr: prod.nameAr || prod.name || "",
      nameEn: prod.nameEn || "",
      descriptionAr: prod.descriptionAr || "",
      descriptionEn: prod.descriptionEn || "",
      price: String(prod.price),
      calories: prod.calories == null ? "" : String(prod.calories),
      allergens: prod.allergens || [],
      dietaryTags: prod.dietaryTags || [],
      ingredientTags: prod.ingredientTags || [],
      categoryId: prod.categoryId,
      imageUrl: prod.imageUrl || "",
      isAvailable: prod.isAvailable !== false,
    });
    setSelectedAttrIds(prod.attributes?.map((a) => a.attribute.id) || []);
    setDraftRestored(false);
    setFormErrors({});
    setErrorMsg("");
    setIsProductModalOpen(true);
  };

  const handleToggleAvailability = async (
    prod: Product,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const nextStatus = !prod.isAvailable;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id ? { ...p, isAvailable: nextStatus } : p,
        ),
      );

      await apiClient.patch(`/admin/products/${prod.id}`, {
        isAvailable: nextStatus,
      });
    } catch (err) {
      console.error(err);
      if (selectedBranchId) fetchMenuData(selectedBranchId);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg(tCommon("currentBranch"));
      return;
    }
    const errors: Record<string, string> = {};
    if (!formData.nameAr.trim()) errors.nameAr = isRtl ? "اسم المنتج بالعربية مطلوب" : "Arabic product name is required";
    if (formData.nameAr.trim().length > 120) errors.nameAr = isRtl ? "الحد الأقصى 120 حرفاً" : "Use 120 characters or fewer";
    if (formData.nameEn.trim().length > 120) errors.nameEn = isRtl ? "الحد الأقصى 120 حرفاً" : "Use 120 characters or fewer";
    const price = Number(formData.price);
    if (!formData.price || !Number.isFinite(price) || price < 0 || price > 999999.99) errors.price = isRtl ? "أدخل سعراً صحيحاً بين 0 و999,999.99" : "Enter a valid price from 0 to 999,999.99";
    if (!/^\d+(\.\d{1,2})?$/.test(formData.price)) errors.price = isRtl ? "استخدم منزلتين عشريتين كحد أقصى" : "Use no more than two decimal places";
    if (formData.calories && (!Number.isInteger(Number(formData.calories)) || Number(formData.calories) < 0 || Number(formData.calories) > 100000)) errors.calories = isRtl ? "أدخل عدداً صحيحاً بين 0 و100,000" : "Enter a whole number from 0 to 100,000";
    if (!formData.categoryId) errors.categoryId = isRtl ? "اختر تصنيفاً" : "Choose a category";
    if (formData.descriptionAr.length > 1000 || formData.descriptionEn.length > 1000) errors.description = isRtl ? "الوصف يجب ألا يتجاوز 1000 حرف" : "Descriptions must be 1,000 characters or fewer";
    if (formData.imageUrl && !/^https?:\/\//i.test(formData.imageUrl)) errors.imageUrl = isRtl ? "رابط الصورة غير صالح" : "Enter a valid image URL";
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setErrorMsg(isRtl ? "راجع الحقول المحددة أدناه." : "Review the highlighted fields below.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const payload = {
        categoryId: formData.categoryId,
        nameAr: formData.nameAr.trim() || formData.nameEn.trim(),
        nameEn: formData.nameEn.trim() || undefined,
        descriptionAr: formData.descriptionAr.trim() || undefined,
        descriptionEn: formData.descriptionEn.trim() || undefined,
        price: Number(formData.price),
        calories: formData.calories === "" ? null : Number(formData.calories),
        allergens: formData.allergens,
        dietaryTags: formData.dietaryTags,
        ingredientTags: formData.ingredientTags,
        imageUrl: formData.imageUrl || undefined,
        isAvailable: formData.isAvailable,
      };

      if (editingProductId) {
        await apiClient.patch(`/admin/products/${editingProductId}`, payload);
        await apiClient.post(`/admin/products/${editingProductId}/attributes`, {
          attributeIds: selectedAttrIds,
        });
        setSuccessMsg(tCommon("success"));
      } else {
        const created = await apiClient.post("/admin/products", payload);
        setEditingProductId(created.data.id);
        await apiClient.post(`/admin/products/${created.data.id}/attributes`, {
          attributeIds: selectedAttrIds,
        });
        setSuccessMsg(tCommon("success"));
      }

      await fetchMenuData(selectedBranchId);
      if (draftKey) sessionStorage.removeItem(draftKey);
      setIsProductModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(apiErrorMessage(err) || tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const discardDraft = () => {
    if (draftKey) sessionStorage.removeItem(draftKey);
    setFormData({ ...EMPTY_PRODUCT_FORM, categoryId: categories[0]?.id || "" });
    setSelectedAttrIds([]);
    setDraftRestored(false);
    setFormErrors({});
  };

  const closeProductEditor = () => {
    setIsProductModalOpen(false);
    setErrorMsg("");
  };

  const completedRequiredFields = useMemo(
    () => [formData.nameAr.trim(), formData.price, formData.categoryId].filter(Boolean).length,
    [formData.categoryId, formData.nameAr, formData.price],
  );

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    if (!newAttrData.labelAr.trim() && !newAttrData.labelEn.trim()) {
      setAttrError(t("nameAr"));
      return;
    }

    try {
      setIsSavingAttr(true);
      setAttrError("");

      const res = await apiClient.post("/admin/attributes", {
        branchId: selectedBranchId,
        labelAr: newAttrData.labelAr.trim() || undefined,
        labelEn: newAttrData.labelEn.trim() || undefined,
      });

      const newAttr = res.data?.data || res.data;
      setAttributes((prev) => [...prev, newAttr]);
      setNewAttrData({ labelAr: "", labelEn: "" });
    } catch (err: unknown) {
      console.error(err);
      setAttrError(apiErrorMessage(err) || tCommon("error"));
    } finally {
      setIsSavingAttr(false);
    }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    try {
      await apiClient.delete(`/admin/attributes/${attrId}`);
      setAttributes((prev) => prev.filter((a) => a.id !== attrId));
      setSelectedAttrIds((prev) => prev.filter((id) => id !== attrId));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAttributeSelection = (attrId: string) => {
    setSelectedAttrIds((prev) =>
      prev.includes(attrId)
        ? prev.filter((id) => id !== attrId)
        : [...prev, attrId],
    );
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !selectedBranchId) return;
    try {
      setIsDeleting(true);
      await apiClient.delete(`/admin/products/${productToDelete.id}`);
      setSuccessMsg(tCommon("success"));
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      await fetchMenuData(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(apiErrorMessage(err) || tCommon("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchSearch =
      searchQuery === "" ||
      (prod.nameAr &&
        prod.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.nameEn &&
        prod.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.name &&
        prod.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.descriptionAr &&
        prod.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchCategory =
      selectedCatFilter === "all" || prod.categoryId === selectedCatFilter;

    const matchAvail =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && prod.isAvailable !== false) ||
      (availabilityFilter === "unavailable" && prod.isAvailable === false);

    return matchSearch && matchCategory && matchAvail;
  });

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
            onClick={handleOpenCreate}
            disabled={!selectedBranchId}
          >
            <Plus size={18} />
            <span>{t("addProduct")}</span>
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

      {/* Control Bar: Search & Category Pills */}
      <div className={styles.controlBar}>
        <div className={styles.searchRow}>
          <div className={styles.searchShell}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={styles.clearSearch}
                aria-label={tCommon("cancel")}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className={styles.filterGroup}>
            <select
              value={availabilityFilter}
              onChange={(e) =>
                setAvailabilityFilter(
                  e.target.value as "all" | "available" | "unavailable",
                )
              }
              className={styles.selectInput}
              aria-label={tCommon("filter")}
            >
              <option value="all">{tCommon("all")}</option>
              <option value="available">{t("available")}</option>
              <option value="unavailable">{t("unavailable")}</option>
            </select>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsAttrModalOpen(true)}
              style={{
                minHeight: "42px",
                padding: "0 14px",
                fontSize: "0.8rem",
              }}
            >
              <SlidersHorizontal size={15} />
              <span>
                {t("attributesTitle")} ({attributes.length})
              </span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className={styles.categoryPills}>
          <button
            type="button"
            className={styles.pillButton}
            data-active={selectedCatFilter === "all"}
            onClick={() => setSelectedCatFilter("all")}
          >
            <span>{t("filterAll")}</span>
            <span className={styles.pillCount}>{products.length}</span>
          </button>

          {categories.map((cat) => {
            const count = products.filter(
              (p) => p.categoryId === cat.id,
            ).length;
            const displayName = isRtl
              ? cat.nameAr || cat.name || cat.nameEn || "قسم"
              : cat.nameEn || cat.name || cat.nameAr || "Category";
            return (
              <button
                key={cat.id}
                type="button"
                className={styles.pillButton}
                data-active={selectedCatFilter === cat.id}
                onClick={() => setSelectedCatFilter(cat.id)}
              >
                <span>{displayName}</span>
                <span className={styles.pillCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {isLoadingMenu && products.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3>{tCommon("loading")}</h3>
        </div>
      ) : !selectedBranchId ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <UtensilsCrossed size={28} />
          </div>
          <h3>{tCommon("currentBranch")}</h3>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <UtensilsCrossed size={28} />
          </div>
          <h3>{t("emptyTitle")}</h3>
          <p>{t("emptyDesc")}</p>
          {products.length === 0 && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleOpenCreate}
              style={{ marginTop: "10px" }}
            >
              <Plus size={18} />
              <span>{t("addProduct")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.productGrid}>
          {filteredProducts.map((prod) => {
            const displayName = isRtl
              ? prod.nameAr || prod.name || prod.nameEn || "صنف"
              : prod.nameEn || prod.name || prod.nameAr || "Item";
            const secondaryName = isRtl ? prod.nameEn : prod.nameAr;
            const displayDesc = isRtl
              ? prod.descriptionAr || prod.descriptionEn
              : prod.descriptionEn || prod.descriptionAr;
            const cat = categories.find((c) => c.id === prod.categoryId);
            const catName = isRtl
              ? cat?.nameAr || cat?.name || cat?.nameEn || ""
              : cat?.nameEn || cat?.name || cat?.nameAr || "";
            const isAvail = prod.isAvailable !== false;

            return (
              <article key={prod.id} className={styles.productCard}>
                <div className={styles.imageWrapper}>
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={displayName}
                      className={styles.productImg}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.noImage}>
                      <ImageIcon size={32} />
                      <span>—</span>
                    </div>
                  )}

                  {catName && (
                    <span className={styles.categoryTag}>{catName}</span>
                  )}

                  <span
                    className={styles.availabilityBadge}
                    data-available={String(isAvail)}
                  >
                    {isAvail ? t("available") : t("unavailable")}
                  </span>
                </div>

                <div className={styles.productBody}>
                  <div className={styles.productHeader}>
                    <div className={styles.productTitles}>
                      <h3>{displayName}</h3>
                      {secondaryName && <p>{secondaryName}</p>}
                    </div>
                    <span className={styles.priceTag}>
                      <bdi dir="ltr">{Number(prod.price).toFixed(2)}</bdi>{" "}
                      {tCommon("currency")}
                    </span>
                  </div>

                  {displayDesc && (
                    <p className={styles.productDesc}>{displayDesc}</p>
                  )}

                  {prod.attributes && prod.attributes.length > 0 && (
                    <div className={styles.attributesList}>
                      {prod.attributes.map((a) => (
                        <span key={a.attribute.id} className={styles.attrChip}>
                          {isRtl
                            ? a.attribute.labelAr || a.attribute.labelEn
                            : a.attribute.labelEn || a.attribute.labelAr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.toggleSwitch}
                    onClick={(e) => handleToggleAvailability(prod, e)}
                    title={isAvail ? t("unavailable") : t("available")}
                  >
                    <span
                      className={styles.switchTrack}
                      data-checked={String(isAvail)}
                    >
                      <span className={styles.switchThumb} />
                    </span>
                    <span>{isAvail ? t("available") : t("unavailable")}</span>
                  </button>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleOpenEdit(prod)}
                      title={t("editProduct")}
                      aria-label={`${t("editProduct")} ${displayName}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      data-variant="danger"
                      onClick={() => {
                        setProductToDelete(prod);
                        setIsDeleteModalOpen(true);
                      }}
                      title={t("deleteConfirm")}
                      aria-label={`${t("deleteConfirm")} ${displayName}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <Dialog.Root
        open={isProductModalOpen}
        onOpenChange={(open) => open && setIsProductModalOpen(true)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={`${styles.dialogContent} ${styles.productEditor}`}
            dir={isRtl ? "rtl" : "ltr"}
            onPointerDownOutside={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => event.preventDefault()}
          >
            <div className={styles.dialogHead}>
              <div className={styles.editorTitleBlock}>
                <span className={styles.editorIcon}><UtensilsCrossed size={19} /></span>
                <div>
                  <Dialog.Title>
                    {editingProductId ? t("editProduct") : t("addProduct")}
                  </Dialog.Title>
                  <Dialog.Description>
                    {isRtl ? "أنشئ صنفاً واضحاً وجاهزاً للطلب" : "Create a clear, order-ready menu item"}
                  </Dialog.Description>
                </div>
              </div>
              <button type="button" className={styles.closeButton} onClick={closeProductEditor} aria-label={tCommon("cancel")}>
                <X size={19} />
              </button>
            </div>

            <div className={styles.draftBar} role="status">
              <CloudCheck size={17} aria-hidden="true" />
              <span>{draftRestored
                ? (isRtl ? "تمت استعادة المسودة من هذه الجلسة" : "Draft restored from this tab session")
                : (isRtl ? "تُحفظ المسودة تلقائياً في هذه الجلسة" : "Draft autosaves for this tab session")}</span>
              <span className={styles.formProgress}>{completedRequiredFields}/3</span>
              {isDraftMeaningful(formData) && (
                <button type="button" onClick={discardDraft}>{isRtl ? "حذف المسودة" : "Discard draft"}</button>
              )}
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

            <form onSubmit={handleSubmitProduct} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>{t("uploadImage")}</label>
                <ImageUploader
                  value={formData.imageUrl}
                  onChange={(url) =>
                    setFormData((current) => ({ ...current, imageUrl: url }))
                  }
                  label={t("uploadImage")}
                  description="JPG, PNG, WebP (max 5MB)"
                />
              </div>

              <div className={styles.twoCol}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prod-name-ar">{t("nameAr")} *</label>
                  <input
                    id="prod-name-ar"
                    type="text"
                    required
                    placeholder={
                      isRtl
                        ? "مثال: فلات وايت كلاسيك"
                        : "e.g. Classic Flat White"
                    }
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, nameAr: e.target.value }))
                    }
                    maxLength={120}
                    aria-invalid={Boolean(formErrors.nameAr)}
                  />
                  {formErrors.nameAr && <small className={styles.fieldError}>{formErrors.nameAr}</small>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prod-name-en">{t("nameEn")}</label>
                  <input
                    id="prod-name-en"
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Classic Flat White"
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, nameEn: e.target.value }))
                    }
                    maxLength={120}
                    aria-invalid={Boolean(formErrors.nameEn)}
                  />
                  {formErrors.nameEn && <small className={styles.fieldError}>{formErrors.nameEn}</small>}
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prod-price">
                    {t("price")} ({tCommon("currency")}) *
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.25"
                    min="0" max="999999.99"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, price: e.target.value }))
                    }
                    aria-invalid={Boolean(formErrors.price)}
                  />
                  {formErrors.price && <small className={styles.fieldError}>{formErrors.price}</small>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prod-cat">{t("category")} *</label>
                  <select
                    id="prod-cat"
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData((current) => ({ ...current, categoryId: e.target.value }))
                    }
                    aria-invalid={Boolean(formErrors.categoryId)}
                  >
                    {categories.length === 0 && (
                      <option value="">{tCommon("all")}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isRtl
                          ? c.nameAr || c.name || c.nameEn
                          : c.nameEn || c.name || c.nameAr}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && <small className={styles.fieldError}>{formErrors.categoryId}</small>}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="prod-calories">
                  {isRtl ? "السعرات الحرارية (اختياري)" : "Calories (optional)"}
                </label>
                <input
                  id="prod-calories"
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={formData.calories}
                  onChange={(e) =>
                    setFormData((current) => ({ ...current, calories: e.target.value }))
                  }
                  aria-invalid={Boolean(formErrors.calories)}
                />
                {formErrors.calories && <small className={styles.fieldError}>{formErrors.calories}</small>}
              </div>
              {[
                {
                  keys: INGREDIENT_KEYS,
                  field: "ingredientTags" as const,
                  title: isRtl ? "مكونات بارزة" : "Ingredient highlights",
                },
                {
                  keys: ALLERGEN_KEYS,
                  field: "allergens" as const,
                  title: isRtl
                    ? "مسببات الحساسية — يحتوي على"
                    : "Allergens — contains",
                },
                {
                  keys: DIETARY_KEYS,
                  field: "dietaryTags" as const,
                  title: isRtl ? "معلومات الطبق" : "Dietary labels",
                },
              ].map(({ keys, field, title }) => (
                <fieldset key={field} className={styles.inputGroup}>
                  <legend>{title}</legend>
                  <p className={styles.fieldHint}>{field === "allergens" ? (isRtl ? "اختر فقط مسببات الحساسية المؤكدة. يظهر الاسم دائماً بجانب الرمز." : "Select confirmed allergens only. The name always appears beside its symbol.") : (isRtl ? "معلومات اختيارية تساعد الضيف على فهم الطبق." : "Optional details that help guests understand the dish.")}</p>
                  <div className={styles.foodOptionGrid}>
                    {keys.map((key) => {
                      const entry =
                        FOOD_LABELS[key as keyof typeof FOOD_LABELS];
                      const Icon = entry.icon;
                      return (
                        <label
                          key={key}
                          className={styles.foodOption}
                          data-selected={String(formData[field].includes(key))}
                        >
                          <input
                            type="checkbox"
                            checked={formData[field].includes(key)}
                            onChange={(e) =>
                              setFormData((current) => ({
                                ...current,
                                [field]: e.target.checked
                                  ? [...current[field], key]
                                  : current[field].filter((v) => v !== key),
                              }))
                            }
                            style={{ width: 18, height: 18 }}
                          />
                          <Icon size={17} aria-hidden="true" />
                          {isRtl ? entry.ar : entry.en}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className={styles.inputGroup}>
                <label htmlFor="prod-desc-ar">{t("descAr")}</label>
                <textarea
                  id="prod-desc-ar"
                  placeholder={
                    isRtl
                      ? "مزيج متوازن من الإسبريسو الفاخر مع حليب مبخر بقوام مخملي…"
                      : "Balanced artisan espresso with velvety steamed milk…"
                  }
                  value={formData.descriptionAr}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      descriptionAr: e.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="prod-desc-en">{t("descEn")}</label>
                <textarea
                  id="prod-desc-en"
                  dir="ltr"
                  placeholder="Rich espresso balanced with velvety steamed milk…"
                  value={formData.descriptionEn}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      descriptionEn: e.target.value,
                    }))
                  }
                  maxLength={1000}
                />
              </div>

              {attributes.length > 0 && (
                <div className={styles.inputGroup}>
                  <label>{t("attributesTitle")}</label>
                  <div className={styles.attrSelectionGrid}>
                    {attributes.map((attr) => {
                      const isSelected = selectedAttrIds.includes(attr.id);
                      return (
                        <button
                          key={attr.id}
                          type="button"
                          className={styles.attrSelectableChip}
                          data-selected={String(isSelected)}
                          onClick={() => toggleAttributeSelection(attr.id)}
                        >
                          {isSelected && <Check size={13} />}
                          <span>
                            {isRtl
                              ? attr.labelAr || attr.labelEn
                              : attr.labelEn || attr.labelAr}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={closeProductEditor}
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
                    <span>{editingProductId ? tCommon("save") : (isRtl ? "إضافة المنتج" : "Add product")}</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Manage Attributes Modal */}
      <Dialog.Root open={isAttrModalOpen} onOpenChange={setIsAttrModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={styles.dialogContent}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("attributesTitle")}</Dialog.Title>
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

            {attrError && (
              <div
                className={styles.errorBanner}
                style={{ marginBottom: "14px" }}
                role="alert"
              >
                <span>{attrError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAttribute} className={styles.formGrid}>
              <div className={styles.twoCol}>
                <div className={styles.inputGroup}>
                  <label>{t("nameAr")}</label>
                  <input
                    type="text"
                    placeholder={
                      isRtl
                        ? "مثال: الأكثر طلباً، نباتي، حار"
                        : "e.g. Best Seller, Vegan, Spicy"
                    }
                    value={newAttrData.labelAr}
                    onChange={(e) =>
                      setNewAttrData({
                        ...newAttrData,
                        labelAr: e.target.value,
                      })
                    }
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>{t("nameEn")}</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="e.g. Bestseller, Vegan"
                    value={newAttrData.labelEn}
                    onChange={(e) =>
                      setNewAttrData({
                        ...newAttrData,
                        labelEn: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isSavingAttr}
                style={{ width: "fit-content" }}
              >
                {isSavingAttr ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                <span>{tCommon("add")}</span>
              </button>
            </form>

            <div
              style={{
                marginTop: "24px",
                borderTop: "1px solid rgba(223, 210, 235, 0.1)",
                paddingTop: "16px",
              }}
            >
              <h4
                style={{
                  margin: "0 0 12px",
                  fontSize: "0.95rem",
                  color: "#fffdf9",
                }}
              >
                {t("attributesTitle")} ({attributes.length})
              </h4>

              {attributes.length === 0 ? (
                <p style={{ color: "#b9aebd", fontSize: "0.85rem" }}>—</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {attributes.map((attr) => (
                    <div
                      key={attr.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(223, 210, 235, 0.14)",
                        color: "#fffdf9",
                        fontSize: "0.82rem",
                      }}
                    >
                      <span>
                        {isRtl
                          ? attr.labelAr || attr.labelEn
                          : attr.labelEn || attr.labelAr}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttribute(attr.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ff9d8c",
                          cursor: "pointer",
                          padding: "2px",
                          display: "grid",
                          placeItems: "center",
                        }}
                        title={tCommon("delete")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
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

            <p
              style={{
                color: "#cbbfce",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                margin: "0 0 20px",
              }}
            >
              {t("deleteWarning")}
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteModalOpen(false)}
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
