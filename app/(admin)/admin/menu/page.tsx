"use client";

import { useEffect, useState } from "react";
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
  Sparkles,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
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

  const fetchMenuData = async (branchId: string) => {
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
    } catch (err: any) {
      console.error(err);
      setErrorMsg("تعذر جلب بيانات القائمة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchMenuData(selectedBranchId);
    } else {
      setProducts([]);
      setCategories([]);
      setAttributes([]);
    }
  }, [selectedBranchId]);

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
      price: prod.price ? prod.price.toString() : "",
      categoryId: prod.categoryId || (categories[0]?.id ?? ""),
      imageUrl: prod.imageUrl || "",
      isAvailable: prod.isAvailable ?? true,
    });
    const currentAttrIds = (prod.attributes || []).map((a) => a.attribute.id);
    setSelectedAttrIds(currentAttrIds);
    setErrorMsg("");
    setIsProductModalOpen(true);
  };

  const handleToggleAvailability = async (prod: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !(prod.isAvailable ?? true);

    // Optimistic UI
    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, isAvailable: newStatus } : p))
    );

    try {
      await apiClient.patch(`/admin/products/${prod.id}`, {
        isAvailable: newStatus,
      });
      setSuccessMsg(`تم ${newStatus ? "تفعيل" : "إيقاف"} توفر صنف "${prod.nameAr || prod.name}".`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      if (selectedBranchId) fetchMenuData(selectedBranchId);
      setErrorMsg("تعذر تحديث حالة التوفر.");
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg("يرجى اختيار فرع أولاً.");
      return;
    }
    if (!formData.nameAr.trim() && !formData.nameEn.trim()) {
      setErrorMsg("يرجى إدخال اسم المنتج بالعربية أو الإنجليزية.");
      return;
    }
    if (!formData.categoryId) {
      setErrorMsg("يرجى اختيار تصنيف للمنتج.");
      return;
    }
    const numPrice = parseFloat(formData.price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg("يرجى إدخال سعر صالح.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const primaryName = formData.nameAr.trim() || formData.nameEn.trim();

      const payload = {
        branchId: selectedBranchId,
        categoryId: formData.categoryId,
        name: primaryName,
        nameAr: formData.nameAr.trim() || undefined,
        nameEn: formData.nameEn.trim() || undefined,
        descriptionAr: formData.descriptionAr.trim() || undefined,
        descriptionEn: formData.descriptionEn.trim() || undefined,
        price: numPrice,
        imageUrl: formData.imageUrl.trim() || undefined,
        isAvailable: formData.isAvailable,
        attributeIds: selectedAttrIds,
      };

      if (editingProductId) {
        await apiClient.patch(`/admin/products/${editingProductId}`, payload);
        setSuccessMsg("تم تعديل بيانات المنتج بنجاح.");
      } else {
        await apiClient.post("/admin/products", payload);
        setSuccessMsg("تمت إضافة المنتج بنجاح.");
      }

      await fetchMenuData(selectedBranchId);
      setIsProductModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "تعذر حفظ المنتج.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || !selectedBranchId) return;

    try {
      setIsDeleting(true);
      setErrorMsg("");
      await apiClient.delete(`/admin/products/${productToDelete.id}`);
      setSuccessMsg(`تم حذف منتج "${productToDelete.nameAr || productToDelete.name}" بنجاح.`);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      await fetchMenuData(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "تعذر حذف المنتج.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    if (!newAttrData.labelAr.trim() && !newAttrData.labelEn.trim()) {
      setAttrError("يرجى إدخال اسم الوسم.");
      return;
    }

    try {
      setIsSavingAttr(true);
      setAttrError("");
      const { data } = await apiClient.post("/admin/attributes", {
        branchId: selectedBranchId,
        labelAr: newAttrData.labelAr.trim() || undefined,
        labelEn: newAttrData.labelEn.trim() || undefined,
      });
      const newAttr = data?.data || data;
      setAttributes((prev) => [...prev, newAttr]);
      setNewAttrData({ labelAr: "", labelEn: "" });
    } catch (err: any) {
      console.error(err);
      setAttrError(err?.response?.data?.message || "تعذر إنشاء الوسم.");
    } finally {
      setIsSavingAttr(false);
    }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    try {
      await apiClient.delete(`/admin/attributes/${attrId}`);
      setAttributes((prev) => prev.filter((a) => a.id !== attrId));
      setSelectedAttrIds((prev) => prev.filter((id) => id !== attrId));
    } catch (err: any) {
      console.error(err);
      setAttrError("تعذر حذف الوسم.");
    }
  };

  const toggleAttributeSelection = (attrId: string) => {
    setSelectedAttrIds((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  // Filtered Products
  const filteredProducts = products.filter((prod) => {
    const query = searchQuery.toLowerCase().trim();
    const nameMatch =
      !query ||
      (prod.nameAr && prod.nameAr.toLowerCase().includes(query)) ||
      (prod.name && prod.name.toLowerCase().includes(query)) ||
      (prod.nameEn && prod.nameEn.toLowerCase().includes(query)) ||
      (prod.descriptionAr && prod.descriptionAr.toLowerCase().includes(query)) ||
      (prod.descriptionEn && prod.descriptionEn.toLowerCase().includes(query));

    const catMatch =
      selectedCatFilter === "all" || prod.categoryId === selectedCatFilter;

    const isAvail = prod.isAvailable !== false;
    const availMatch =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && isAvail) ||
      (availabilityFilter === "unavailable" && !isAvail);

    return nameMatch && catMatch && availMatch;
  });

  const availableCount = products.filter((p) => p.isAvailable !== false).length;
  const unavailableCount = products.length - availableCount;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            الإدارة • قائمة الطعام
          </p>
          <h1>إدارة المنتجات والأصناف</h1>
          <p>
            أضف وعدّل أصناف الطعام، وحدد الأسعار والوسوم وحالة التوفر في المطبخ فورياً.
          </p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => selectedBranchId && fetchMenuData(selectedBranchId)}
            disabled={isLoadingMenu || !selectedBranchId}
            aria-label="تحديث القائمة"
          >
            <RotateCcw
              size={17}
              className={isLoadingMenu ? "animate-spin" : undefined}
            />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenCreate}
            disabled={!selectedBranchId}
          >
            <Plus size={18} strokeWidth={2.2} />
            <span>إضافة منتج</span>
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label="ملخص المنتجات">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <UtensilsCrossed size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{products.length}</span>
            <span className={styles.kpiLabel}>إجمالي منتجات الفرع</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{availableCount}</span>
            <span className={styles.kpiLabel}>متاح للطلب الآن</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <XCircle size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{unavailableCount}</span>
            <span className={styles.kpiLabel}>غير متوفر مؤقتاً</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Tag size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{categories.length}</span>
            <span className={styles.kpiLabel}>أقسام مصنفة</span>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isProductModalOpen && !isDeleteModalOpen && (
        <div className={styles.errorBanner} role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control / Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterTopRow}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="ابحث عن صنف بالاسم أو الوصف…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterControls}>
            <select
              className={styles.availabilitySelect}
              value={availabilityFilter}
              onChange={(e: any) => setAvailabilityFilter(e.target.value)}
              aria-label="تصفية حسب التوفر"
            >
              <option value="all">كافة الحالات</option>
              <option value="available">المتوفر فقط</option>
              <option value="unavailable">غير المتوفر</option>
            </select>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsAttrModalOpen(true)}
              style={{ minHeight: "42px", padding: "0 14px", fontSize: "0.8rem" }}
            >
              <SlidersHorizontal size={15} />
              <span>إدارة الوسوم ({attributes.length})</span>
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
            <span>كافة الأصناف</span>
            <span className={styles.pillCount}>{products.length}</span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.categoryId === cat.id).length;
            const displayName = cat.nameAr || cat.name || cat.nameEn || "قسم";
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
          <h3>جارٍ تحميل قائمة الطعام…</h3>
        </div>
      ) : !selectedBranchId ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <UtensilsCrossed size={28} />
          </div>
          <h3>يرجى اختيار فرع لعرض قائمته</h3>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <UtensilsCrossed size={28} />
          </div>
          <h3>
            {products.length === 0
              ? "لا توجد منتجات مسجلة في هذا الفرع بعد"
              : "لا توجد نتائج مطابقة لبحثك"}
          </h3>
          <p>
            {products.length === 0
              ? "ابدأ بإضافة أول صنف لقائمتك لتظهر للعملاء عند مسح رمز الطاولة."
              : "جرب تغيير مصطلح البحث أو إزالة التصفية لعرض المزيد من الأصناف."}
          </p>
          {products.length === 0 && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleOpenCreate}
              style={{ marginTop: "10px" }}
            >
              <Plus size={18} />
              <span>إضافة أول صنف الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.productGrid}>
          {filteredProducts.map((prod) => {
            const displayNameAr = prod.nameAr || prod.name || "صنف بدون اسم";
            const displayNameEn = prod.nameEn || "";
            const cat = categories.find((c) => c.id === prod.categoryId);
            const catName = cat?.nameAr || cat?.name || cat?.nameEn || "";
            const isAvail = prod.isAvailable !== false;

            return (
              <article key={prod.id} className={styles.productCard}>
                <div className={styles.imageWrapper}>
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={displayNameAr}
                      className={styles.productImg}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.noImage}>
                      <ImageIcon size={32} />
                      <span>بدون صورة</span>
                    </div>
                  )}

                  {catName && (
                    <span className={styles.categoryTag}>{catName}</span>
                  )}

                  <span
                    className={styles.availabilityBadge}
                    data-available={String(isAvail)}
                  >
                    {isAvail ? "متوفر للطلب" : "غير متوفر"}
                  </span>
                </div>

                <div className={styles.productBody}>
                  <div className={styles.productHeader}>
                    <div className={styles.productTitles}>
                      <h3>{displayNameAr}</h3>
                      {displayNameEn && <p>{displayNameEn}</p>}
                    </div>
                    <span className={styles.priceTag}>
                      {Number(prod.price).toFixed(2)} ر.س
                    </span>
                  </div>

                  {(prod.descriptionAr || prod.descriptionEn) && (
                    <p className={styles.productDesc}>
                      {prod.descriptionAr || prod.descriptionEn}
                    </p>
                  )}

                  {prod.attributes && prod.attributes.length > 0 && (
                    <div className={styles.attributesList}>
                      {prod.attributes.map((a) => (
                        <span key={a.attribute.id} className={styles.attrChip}>
                          {a.attribute.labelAr || a.attribute.labelEn}
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
                    title={isAvail ? "إيقاف التوفر" : "تفعيل التوفر"}
                  >
                    <span
                      className={styles.switchTrack}
                      data-checked={String(isAvail)}
                    >
                      <span className={styles.switchThumb} />
                    </span>
                    <span>{isAvail ? "متوفر" : "معطل"}</span>
                  </button>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => handleOpenEdit(prod)}
                      title="تعديل المنتج"
                      aria-label={`تعديل ${displayNameAr}`}
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
                      title="حذف المنتج"
                      aria-label={`حذف ${displayNameAr}`}
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
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>
                {editingProductId ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}
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

            <form onSubmit={handleSubmitProduct} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>صورة المنتج</label>
                <ImageUploader
                  value={formData.imageUrl}
                  onChange={(url) =>
                    setFormData({ ...formData, imageUrl: url })
                  }
                  label="رفع صورة الصنف"
                  description="JPG, PNG, WebP بحد أقصى 5 ميجابايت"
                />
              </div>

              <div className={styles.twoCol}>
                <div className={styles.inputGroup}>
                  <label htmlFor="prod-name-ar">اسم المنتج (بالعربية) *</label>
                  <input
                    id="prod-name-ar"
                    type="text"
                    required
                    placeholder="مثال: فلات وايت كلاسيك"
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="prod-name-en">اسم المنتج (بالإنجليزية)</label>
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
                  <label htmlFor="prod-price">السعر (ر.س) *</label>
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
                  <label htmlFor="prod-cat">التصنيف *</label>
                  <select
                    id="prod-cat"
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                  >
                    {categories.length === 0 && (
                      <option value="">لا توجد تصنيفات معرفة</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr || c.name || c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="prod-desc-ar">وصف المنتج (بالعربية)</label>
                <textarea
                  id="prod-desc-ar"
                  placeholder="مزيج متوازن من الإسبريسو الفاخر مع حليب مبخر بقوام مخملي…"
                  value={formData.descriptionAr}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      descriptionAr: e.target.value,
                    })
                  }
                />
              </div>

              {attributes.length > 0 && (
                <div className={styles.inputGroup}>
                  <label>الوسوم والخصائص</label>
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
                          <span>{attr.labelAr || attr.labelEn}</span>
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
                    <span>
                      {editingProductId ? "حفظ التعديلات" : "إضافة المنتج"}
                    </span>
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
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>إدارة وسوم وخصائص المنتجات</Dialog.Title>
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
                  <label>الوسم (بالعربية)</label>
                  <input
                    type="text"
                    placeholder="مثال: الأكثر طلباً، نباتي، حار"
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
                  <label>الوسم (بالإنجليزية)</label>
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
                <span>إضافة الوسم</span>
              </button>
            </form>

            <div style={{ marginTop: "24px", borderTop: "1px solid rgba(223, 210, 235, 0.1)", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#fffdf9" }}>
                الوسوم المعرفة حالياً ({attributes.length})
              </h4>

              {attributes.length === 0 ? (
                <p style={{ color: "#b9aebd", fontSize: "0.85rem" }}>
                  لا توجد وسوم مضافة بعد لهذا الفرع.
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
                      <span>{attr.labelAr || attr.labelEn}</span>
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
                        title="حذف الوسم"
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
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>تأكيد حذف المنتج</Dialog.Title>
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
              هل أنت متأكد من رغبتك في حذف صنف{" "}
              <strong style={{ color: "#fffdf9" }}>
                "{productToDelete?.nameAr || productToDelete?.name}"
              </strong>
              ؟ سيتم حذفه نهائياً من قائمة هذا الفرع.
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteModalOpen(false)}
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
                  <span>نعم، احذف المنتج</span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
