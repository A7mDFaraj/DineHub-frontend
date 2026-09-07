"use client";

import { apiErrorMessage } from "@/lib/api-error";
import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  CheckCircle2,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
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
  imageUrl?: string;
  isAvailable?: boolean;
  isHidden?: boolean;
  categoryId: string;
  category?: Category;
  attributes?: { attribute: Attribute }[];
}

export default function MenuManagementPage() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminMenu");
  const tCommon = useTranslations("AdminCommon");

  const {
    branches,
    selectedBranchId,
    selectedBranch,
  } = useAdminBranch();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");

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
  const [formData, setFormData] = useState({
    nameAr: "",
    nameEn: "",
    descriptionAr: "",
    descriptionEn: "",
    price: "",
    categoryId: "",
    imageUrl: "",
    isAvailable: true,
  });
  const [selectedAttrIds, setSelectedAttrIds] = useState<string[]>([]);

  // New Attribute Tag Form
  const [newAttrData, setNewAttrData] = useState({
    labelAr: "",
    labelEn: "",
  });

  const fetchMenuData = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoadingMenu(true);
      setErrorMsg("");

      const [categoriesRes, productsRes, attributesRes] = await Promise.allSettled([
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
  }, [tCommon]);

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
    setFormData({
      nameAr: "",
      nameEn: "",
      descriptionAr: "",
      descriptionEn: "",
      price: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
      imageUrl: "",
      isAvailable: true,
    });
    setSelectedAttrIds([]);
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
      categoryId: prod.categoryId,
      imageUrl: prod.imageUrl || "",
      isAvailable: prod.isAvailable !== false,
    });
    setSelectedAttrIds(prod.attributes?.map((a) => a.attribute.id) || []);
    setErrorMsg("");
    setIsProductModalOpen(true);
  };

  const handleToggleAvailability = async (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const nextStatus = !prod.isAvailable;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === prod.id ? { ...p, isAvailable: nextStatus } : p
        )
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
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) {
      setErrorMsg(t("nameAr"));
      return;
    }
    if (!formData.price || isNaN(Number(formData.price))) {
      setErrorMsg(t("price"));
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg(t("category"));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const payload = {
        branchId: selectedBranchId,
        categoryId: formData.categoryId,
        name: formData.nameAr.trim() || formData.nameEn.trim(),
        nameAr: formData.nameAr.trim() || undefined,
        nameEn: formData.nameEn.trim() || undefined,
        descriptionAr: formData.descriptionAr.trim() || undefined,
        descriptionEn: formData.descriptionEn.trim() || undefined,
        price: Number(formData.price),
        imageUrl: formData.imageUrl || undefined,
        isAvailable: formData.isAvailable,
        attributeIds: selectedAttrIds,
      };

      if (editingProductId) {
        await apiClient.patch(`/admin/products/${editingProductId}`, payload);
        setSuccessMsg(tCommon("success"));
      } else {
        await apiClient.post("/admin/products", payload);
        setSuccessMsg(tCommon("success"));
      }

      await fetchMenuData(selectedBranchId);
      setIsProductModalOpen(false);
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
      setAttrError(
        apiErrorMessage(err) || tCommon("error")
      );
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
        : [...prev, attrId]
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
      setErrorMsg(
        apiErrorMessage(err) || tCommon("error")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchSearch =
      searchQuery === "" ||
      (prod.nameAr && prod.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.nameEn && prod.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.name && prod.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prod.descriptionAr && prod.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()));

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
                  e.target.value as "all" | "available" | "unavailable"
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
              style={{ minHeight: "42px", padding: "0 14px", fontSize: "0.8rem" }}
            >
              <SlidersHorizontal size={15} />
              <span>{t("attributesTitle")} ({attributes.length})</span>
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
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const displayName = isRtl
              ? (cat.nameAr || cat.name || cat.nameEn || "قسم")
              : (cat.nameEn || cat.name || cat.nameAr || "Category");
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
              ? (prod.nameAr || prod.name || prod.nameEn || "صنف")
              : (prod.nameEn || prod.name || prod.nameAr || "Item");
            const secondaryName = isRtl ? prod.nameEn : prod.nameAr;
            const displayDesc = isRtl
              ? (prod.descriptionAr || prod.descriptionEn)
              : (prod.descriptionEn || prod.descriptionAr);
            const cat = categories.find((c) => c.id === prod.categoryId);
            const catName = isRtl
              ? (cat?.nameAr || cat?.name || cat?.nameEn || "")
              : (cat?.nameEn || cat?.name || cat?.nameAr || "");
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
                      <bdi dir="ltr">{Number(prod.price).toFixed(2)}</bdi> {tCommon("currency")}
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
                            ? (a.attribute.labelAr || a.attribute.labelEn)
                            : (a.attribute.labelEn || a.attribute.labelAr)}
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
        onOpenChange={setIsProductModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content
            className={styles.dialogContent}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingProductId ? t("editProduct") : t("addProduct")}
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

            <form onSubmit={handleSubmitProduct} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>{t("uploadImage")}</label>
                <ImageUploader
                  value={formData.imageUrl}
                  onChange={(url) =>
                    setFormData({ ...formData, imageUrl: url })
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
                    placeholder={isRtl ? "مثال: فلات وايت كلاسيك" : "e.g. Classic Flat White"}
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                  />
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
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prod-price">{t("price")} ({tCommon("currency")}) *</label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prod-cat">{t("category")} *</label>
                  <select
                    id="prod-cat"
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                  >
                    {categories.length === 0 && (
                      <option value="">{tCommon("all")}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isRtl
                          ? (c.nameAr || c.name || c.nameEn)
                          : (c.nameEn || c.name || c.nameAr)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    setFormData({
                      ...formData,
                      descriptionAr: e.target.value,
                    })
                  }
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
                    setFormData({
                      ...formData,
                      descriptionEn: e.target.value,
                    })
                  }
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
                              ? (attr.labelAr || attr.labelEn)
                              : (attr.labelEn || attr.labelAr)}
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
                  onClick={() => setIsProductModalOpen(false)}
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
                    placeholder={isRtl ? "مثال: الأكثر طلباً، نباتي، حار" : "e.g. Best Seller, Vegan, Spicy"}
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

            <div style={{ marginTop: "24px", borderTop: "1px solid rgba(223, 210, 235, 0.1)", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#fffdf9" }}>
                {t("attributesTitle")} ({attributes.length})
              </h4>

              {attributes.length === 0 ? (
                <p style={{ color: "#b9aebd", fontSize: "0.85rem" }}>
                  —
                </p>
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
                          ? (attr.labelAr || attr.labelEn)
                          : (attr.labelEn || attr.labelAr)}
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
      <Dialog.Root
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
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
