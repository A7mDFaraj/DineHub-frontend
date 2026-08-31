"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Edit2, Trash2, Loader2, X, Image as ImageIcon, 
  Building2, Sparkles, SlidersHorizontal, Check, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";

interface Branch {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
}

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

export default function MenuManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttributesModalOpen, setIsAttributesModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attrError, setAttrError] = useState("");

  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    price: "",
    categoryId: "",
    imageUrl: "",
    isAvailable: true,
  });

  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);

  // State for creating new attribute tag
  const [newAttrData, setNewAttrData] = useState({
    labelAr: "",
    labelEn: "",
  });
  const [isSavingAttr, setIsSavingAttr] = useState(false);

  const fetchBranchData = async (branchId: string) => {
    try {
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
        if (catList.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: catList[0].id }));
        }
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
    } catch (err) {
      console.error(err);
      setError("Failed to fetch menu data for this branch.");
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError("");
      const { data } = await apiClient.get("/admin/branches");
      const branchList = Array.isArray(data) ? data : data?.data || data?.branches || [];
      setBranches(branchList);

      if (branchList.length > 0) {
        const activeId = selectedBranchId || branchList[0].id;
        setSelectedBranchId(activeId);
        await fetchBranchData(activeId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch branches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    await fetchBranchData(branchId);
  };

  const handleOpenCreateModal = () => {
    setEditingProductId(null);
    setFormData({
      nameEn: "",
      nameAr: "",
      descriptionEn: "",
      descriptionAr: "",
      price: "",
      categoryId: categories.length > 0 ? categories[0].id : "",
      imageUrl: "",
      isAvailable: true,
    });
    setSelectedAttributeIds([]);
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setFormData({
      nameEn: product.nameEn || "",
      nameAr: product.nameAr || "",
      descriptionEn: product.descriptionEn || "",
      descriptionAr: product.descriptionAr || "",
      price: product.price ? product.price.toString() : "",
      categoryId: product.categoryId || (categories.length > 0 ? categories[0].id : ""),
      imageUrl: product.imageUrl || "",
      isAvailable: product.isAvailable !== false,
    });

    const existingAttrIds = (product.attributes || []).map((a) => a.attribute.id);
    setSelectedAttributeIds(existingAttrIds);
    setError("");
    setIsModalOpen(true);
  };

  const toggleAttributeSelection = (attrId: string) => {
    setSelectedAttributeIds((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId]
    );
  };

  const handleCreateAttributeQuick = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAttrData.labelAr.trim()) {
      setAttrError("Please enter Arabic label (e.g. سكر زيادة)");
      return;
    }
    if (!selectedBranchId) return;

    try {
      setIsSavingAttr(true);
      setAttrError("");
      const res = await apiClient.post("/admin/attributes", {
        branchId: selectedBranchId,
        labelAr: newAttrData.labelAr.trim(),
        labelEn: newAttrData.labelEn.trim() || undefined,
      });

      const newAttr = res.data?.id ? res.data : {
        id: res.data?.id || `attr-${Date.now()}`,
        branchId: selectedBranchId,
        labelAr: newAttrData.labelAr.trim(),
        labelEn: newAttrData.labelEn.trim() || undefined,
      };

      setAttributes((prev) => [...prev, newAttr]);
      setSelectedAttributeIds((prev) => [...prev, newAttr.id]);
      setNewAttrData({ labelAr: "", labelEn: "" });
    } catch (err: any) {
      console.error(err);
      setAttrError(err?.response?.data?.message || "Failed to create attribute tag.");
    } finally {
      setIsSavingAttr(false);
    }
  };

  const handleDeleteAttribute = async (attrId: string) => {
    if (!confirm("Are you sure you want to delete this option tag? It will be unassigned from all items.")) return;
    try {
      await apiClient.delete(`/admin/attributes/${attrId}`);
      setAttributes((prev) => prev.filter((a) => a.id !== attrId));
      setSelectedAttributeIds((prev) => prev.filter((id) => id !== attrId));
      if (selectedBranchId) {
        await fetchBranchData(selectedBranchId);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete attribute tag.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      setError("Please select a category first. You may need to create one.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");

      let targetProductId = editingProductId;

      if (editingProductId) {
        // Update product
        await apiClient.patch(`/admin/products/${editingProductId}`, {
          categoryId: formData.categoryId,
          nameAr: formData.nameAr || formData.nameEn,
          nameEn: formData.nameEn || undefined,
          descriptionAr: formData.descriptionAr || undefined,
          descriptionEn: formData.descriptionEn || undefined,
          price: parseFloat(formData.price),
          imageUrl: formData.imageUrl || undefined,
          isAvailable: formData.isAvailable,
        });
      } else {
        // Create product
        const res = await apiClient.post("/admin/products", {
          categoryId: formData.categoryId,
          nameAr: formData.nameAr || formData.nameEn,
          nameEn: formData.nameEn || undefined,
          descriptionAr: formData.descriptionAr || undefined,
          descriptionEn: formData.descriptionEn || undefined,
          price: parseFloat(formData.price),
          imageUrl: formData.imageUrl || undefined,
          isAvailable: formData.isAvailable,
        });
        targetProductId = res.data?.id || res.data?.product?.id;
      }

      // Sync attributes with product
      if (targetProductId) {
        try {
          await apiClient.post(`/admin/products/${targetProductId}/attributes`, {
            attributeIds: selectedAttributeIds,
          });
        } catch (attrErr) {
          console.error("Failed to sync attributes:", attrErr);
        }
      }

      setIsModalOpen(false);
      setEditingProductId(null);
      if (selectedBranchId) {
        await fetchBranchData(selectedBranchId);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to save menu item.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await apiClient.delete(`/admin/products/${id}`);
      if (selectedBranchId) {
        await fetchBranchData(selectedBranchId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete menu item.");
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      await apiClient.patch(`/admin/products/${id}/toggle-availability`);
      if (selectedBranchId) {
        await fetchBranchData(selectedBranchId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter((p) => {
    const pEn = (p.nameEn || p.name || "").toLowerCase();
    const pAr = p.nameAr || "";
    const query = searchQuery.toLowerCase();
    return pEn.includes(query) || pAr.includes(query);
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white">Menu Management</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
            Manage your dishes, drinks, prices, and interactive option tags.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-3 flex-1 sm:flex-initial">
              <Building2 className="w-4 h-4 text-primary-400 shrink-0" />
              <select 
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none text-sm w-full"
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.name || b.nameEn || b.nameAr || "Branch"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manage Attributes Button */}
          <button
            onClick={() => setIsAttributesModalOpen(true)}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all active:scale-95"
            title="Manage Option Tags (Sugar, Milk, Spicy, etc.)"
          >
            <SlidersHorizontal className="w-4 h-4 text-primary-400" />
            <span className="hidden sm:inline">Options / Attributes</span>
          </button>

          {/* Add Item Button */}
          <button 
            onClick={handleOpenCreateModal}
            disabled={categories.length === 0}
            className="bg-primary-500 hover:bg-primary-600 text-black font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:shadow-lg hover:shadow-primary-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {branches.length === 0 ? (
        <div className="glass-panel p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-2xl">
          <Building2 className="w-12 h-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No branches available</h3>
          <p className="text-zinc-400 text-sm">You need to create a branch first before managing menu items.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl flex flex-col border border-white/10 overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search menu items or Arabic names..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-primary-500/50 transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="bg-white/5 px-2.5 py-1 rounded-full border border-white/10 text-zinc-300 font-mono">
                {filteredProducts.length} {filteredProducts.length === 1 ? "Item" : "Items"}
              </span>
            </div>
          </div>

          {/* Table with responsive overflow */}
          <div className="w-full overflow-x-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <p>No menu items found for this branch.</p>
                {categories.length === 0 && (
                  <p className="text-xs text-zinc-500 mt-2">Create categories first in the Categories section.</p>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-black/20">
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Options & Tags</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map((item) => {
                    const categoryObj = categories.find((c) => c.id === item.categoryId);
                    const categoryName = categoryObj ? (categoryObj.name || categoryObj.nameEn || categoryObj.nameAr || "Category") : "General";
                    const primaryName = item.nameAr || item.nameEn || item.name || "Untitled Item";
                    const secondaryName = (item.nameEn && item.nameAr && item.nameEn !== item.nameAr) ? item.nameEn : null;
                    const itemAttrs = item.attributes || [];

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Item column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/5 overflow-hidden shrink-0">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={primaryName} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-white group-hover:text-primary-400 transition-colors">
                                {primaryName}
                              </div>
                              {secondaryName && (
                                <div className="text-xs text-zinc-400">{secondaryName}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-white/5 text-zinc-300 text-xs font-medium border border-white/10">
                            {categoryName}
                          </span>
                        </td>

                        {/* Options / Attributes */}
                        <td className="px-6 py-4">
                          {itemAttrs.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {itemAttrs.map((attrItem) => {
                                const attr = attrItem.attribute;
                                const label = attr?.labelAr || attr?.labelEn || "Option";
                                return (
                                  <span 
                                    key={attr?.id || Math.random()} 
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-primary-500/10 text-primary-300 border border-primary-500/20 font-medium"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 italic">No options</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 font-bold font-mono text-zinc-200">
                          SAR {Number(item.price).toFixed(2)}
                        </td>

                        {/* Availability Toggle */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleAvailability(item.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105",
                              item.isAvailable !== false
                                ? "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20" 
                                : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.isAvailable !== false ? "bg-green-400" : "bg-zinc-400"
                            )} />
                            {item.isAvailable !== false ? "Available" : "Sold Out"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors"
                              title="Edit item & options"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id, primaryName)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl p-6 bg-[#111114]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white font-outfit">
                {editingProductId ? "Edit Menu Item" : "Add Menu Item"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Name (Arabic - Required) *</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all font-arabic"
                    placeholder="مثال: كابتشينو كلاسيك"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Name (English - Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all"
                    placeholder="e.g. Classic Cappuccino"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Description (Arabic)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all resize-none font-arabic text-sm"
                    placeholder="إسبريسو غني مع رغوة حليب كريمية"
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Description (English)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all resize-none text-sm"
                    placeholder="Rich espresso balanced with velvety steamed milk"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  />
                </div>
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Price (SAR) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-sm">SAR</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-14 pr-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all font-mono"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-300">Category *</label>
                  <select
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 transition-all appearance-none cursor-pointer text-sm"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    {categories.length === 0 && <option value="">No categories available</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                        {c.name || c.nameEn || c.nameAr || "Category"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Photo Uploader */}
              <ImageUploader
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                label="Product Photo / صورة الصنف (Optional)"
                description="Upload from phone/computer or paste link"
                aspectRatio="square"
              />

              {/* Attributes / Customization Options Selector */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-400" />
                    <span>Interactive Options & Tags (خيارات إضافية)</span>
                  </label>
                  <span className="text-xs text-primary-400 font-mono">
                    {selectedAttributeIds.length} selected
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Select which custom options customers can choose for this item (e.g., &quot;Add Sugar&quot;, &quot;No Ice&quot;, &quot;Extra Spicy&quot;, &quot;Oat Milk&quot;).
                </p>

                {attributes.length === 0 ? (
                  <div className="p-3 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-xs text-zinc-400 text-center">
                    No option tags created for this branch yet. Create one below to enable customer choices!
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attributes.map((attr) => {
                      const isSelected = selectedAttributeIds.includes(attr.id);
                      const label = attr.labelAr || attr.labelEn;
                      const subLabel = attr.labelEn && attr.labelAr ? attr.labelEn : null;

                      return (
                        <button
                          key={attr.id}
                          type="button"
                          onClick={() => toggleAttributeSelection(attr.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all select-none",
                            isSelected
                              ? "bg-primary-500/20 border-primary-500 text-primary-300 shadow-[0_0_12px_rgba(212,175,55,0.2)]"
                              : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-md flex items-center justify-center border",
                            isSelected ? "bg-primary-500 border-primary-500 text-black" : "border-white/20"
                          )}>
                            {isSelected && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span>{label}</span>
                          {subLabel && <span className="text-[10px] opacity-70">({subLabel})</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Add Attribute Input Inside Product Modal */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2 items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                  <div className="flex-1 w-full flex gap-2">
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="اسم الخيار (مثال: سكر زيادة)"
                      value={newAttrData.labelAr}
                      onChange={(e) => setNewAttrData({ ...newAttrData, labelAr: e.target.value })}
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 font-arabic"
                    />
                    <input
                      type="text"
                      placeholder="English (e.g. Extra Sugar)"
                      value={newAttrData.labelEn}
                      onChange={(e) => setNewAttrData({ ...newAttrData, labelEn: e.target.value })}
                      className="w-1/2 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSavingAttr || !newAttrData.labelAr.trim()}
                    onClick={() => handleCreateAttributeQuick()}
                    className="w-full sm:w-auto px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors disabled:opacity-40 shrink-0 flex items-center justify-center gap-1"
                  >
                    {isSavingAttr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Add Option Tag</span>
                  </button>
                </div>
                {attrError && (
                  <p className="text-xs text-red-400">{attrError}</p>
                )}
              </div>

              {/* Availability Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-primary-500 focus:ring-primary-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Item is available for ordering (متاح للطلب)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 text-sm"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProductId ? "Update Item" : "Save Item")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Option Tags Management Modal */}
      {isAttributesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl p-6 bg-[#111114] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white font-outfit flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-primary-400" />
                  <span>Branch Option Tags</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage custom tags (e.g. Sugar, Milk, Spiciness, Sauces) available for this branch.
                </p>
              </div>
              <button 
                onClick={() => setIsAttributesModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Tag Form */}
            <form onSubmit={handleCreateAttributeQuick} className="space-y-3 bg-black/30 p-4 rounded-2xl border border-white/10">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Create New Option Tag</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  dir="rtl"
                  placeholder="الاسم بالعربي (مثال: بدون بصل)"
                  value={newAttrData.labelAr}
                  onChange={(e) => setNewAttrData({ ...newAttrData, labelAr: e.target.value })}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 font-arabic"
                />
                <input
                  type="text"
                  placeholder="English (e.g. No Onions)"
                  value={newAttrData.labelEn}
                  onChange={(e) => setNewAttrData({ ...newAttrData, labelEn: e.target.value })}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingAttr}
                className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
              >
                {isSavingAttr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Create Tag / إضافة مواصفة</span>
              </button>
            </form>

            {/* Existing Tags List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Existing Branch Tags ({attributes.length})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {attributes.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6">No option tags created yet.</p>
                ) : (
                  attributes.map((attr) => (
                    <div 
                      key={attr.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-primary-400" />
                        <span className="font-semibold">{attr.labelAr}</span>
                        {attr.labelEn && <span className="text-zinc-400">({attr.labelEn})</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteAttribute(attr.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete tag"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setIsAttributesModalOpen(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
