"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Filter, Loader2, X, Image as ImageIcon, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

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
}

export default function MenuManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

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

  const fetchBranchData = async (branchId: string) => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        apiClient.get(`/admin/categories/${branchId}`),
        apiClient.get(`/admin/products/branch/${branchId}`),
      ]);
      const catList = Array.isArray(categoriesRes.data) ? categoriesRes.data : categoriesRes.data?.data || [];
      const prodList = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data || [];
      setCategories(catList);
      setProducts(prodList);
      if (catList.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: catList[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch menu items for this branch.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      setError("Please select a category first. You may need to create one.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      await apiClient.post("/admin/products", {
        categoryId: formData.categoryId,
        nameAr: formData.nameAr || formData.nameEn,
        nameEn: formData.nameEn || undefined,
        descriptionAr: formData.descriptionAr || undefined,
        descriptionEn: formData.descriptionEn || undefined,
        price: parseFloat(formData.price),
        imageUrl: formData.imageUrl || undefined,
        isAvailable: formData.isAvailable,
      });
      setIsModalOpen(false);
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
      if (selectedBranchId) {
        await fetchBranchData(selectedBranchId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create menu item.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const pEn = (p.nameEn || p.name || "").toLowerCase();
    const pAr = p.nameAr || "";
    const query = searchQuery.toLowerCase();
    return pEn.includes(query) || pAr.includes(query);
  });

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white">Menu Management</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">Manage your restaurant&apos;s categories and items.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl p-2 px-3 flex-1 sm:flex-initial">
              <Building2 className="w-4 h-4 text-primary-400 shrink-0" />
              <select 
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none text-sm w-full"
                value={selectedBranchId}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.name || b.nameEn || b.nameAr || "Branch"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button 
            onClick={() => setIsModalOpen(true)}
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
                placeholder="Search menu items..." 
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

          {/* Table with responsive horizontal overflow */}
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
                    <th className="px-6 py-4 text-sm font-medium text-zinc-400">Item</th>
                    <th className="px-6 py-4 text-sm font-medium text-zinc-400">Category</th>
                    <th className="px-6 py-4 text-sm font-medium text-zinc-400">Price</th>
                    <th className="px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProducts.map((item) => {
                    const categoryObj = categories.find(c => c.id === item.categoryId);
                    const categoryName = categoryObj ? (categoryObj.name || categoryObj.nameEn || categoryObj.nameAr || "Category") : "General";
                    const primaryName = item.nameAr || item.nameEn || item.name || "Untitled Item";
                    const secondaryName = (item.nameEn && item.nameAr) ? item.nameEn : null;

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/5 overflow-hidden">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={primaryName} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white group-hover:text-primary-400 transition-colors">{primaryName}</div>
                              {secondaryName && secondaryName !== primaryName ? (
                                <div className="text-xs text-zinc-500">{secondaryName}</div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-300 text-xs font-medium border border-white/10">
                            {categoryName}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-200">
                          ${Number(item.price).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit",
                            item.isAvailable !== false
                              ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.isAvailable !== false ? "bg-green-400" : "bg-zinc-400"
                            )} />
                            {item.isAvailable !== false ? "Available" : "Unavailable"}
                          </span>
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

      {/* Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white font-outfit">Add Menu Item</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Name (Arabic - Required)</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all font-arabic"
                    placeholder="مثال: برجر دجاج مقرمش"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Name (English - Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                    placeholder="e.g. Crispy Chicken Burger"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Description (Arabic)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all resize-none font-arabic"
                    placeholder="وصف مختصر للمنتج"
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Description (English)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all resize-none"
                    placeholder="Short product description"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Price (Required)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Category (Required)</label>
                  <select
                    required
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 transition-all appearance-none cursor-pointer"
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Image URL (Optional)</label>
                <input
                  type="url"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="w-5 h-5 rounded border-white/10 bg-black/20 text-primary-500 focus:ring-primary-500/50 focus:ring-offset-0"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Item is available for ordering
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
