"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, MoreVertical, Filter, Loader2, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
}

interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  categoryId: string;
  category?: Category;
}

export default function MenuManagement() {
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

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        apiClient.get("/admin/menu"),
        apiClient.get("/admin/categories")
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      
      if (categoriesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: categoriesRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch menu data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      setError("Please select a category first. You may need to create one.");
      return;
    }

    try {
      setIsCreating(true);
      await apiClient.post("/admin/menu", {
        ...formData,
        price: parseFloat(formData.price),
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
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Failed to create menu item.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.nameAr.includes(searchQuery)
  );

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white">Menu Management</h1>
          <p className="text-zinc-400 mt-1">Manage your restaurant&apos;s categories and items.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-500 hover:bg-primary-600 text-black font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-primary-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add New Item
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 shadow-none relative z-10">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search menu items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-zinc-300 focus:outline-none focus:border-primary-500/50 transition-colors"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 transition-colors">
            <Filter className="w-5 h-5" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
              <p>No menu items found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="px-6 py-4 text-sm font-medium text-zinc-400">Item</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-400">Category</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-400">Price</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((item) => {
                  const categoryName = categories.find(c => c.id === item.categoryId)?.nameEn || "Unknown";
                  return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl shadow-inner border border-white/5 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.nameEn} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-primary-400 transition-colors">{item.nameEn}</div>
                          <div className="text-xs text-zinc-500 font-arabic">{item.nameAr}</div>
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
                        item.isAvailable 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.isAvailable ? "bg-green-400" : "bg-zinc-400"
                        )} />
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                  <label className="text-sm font-medium text-zinc-300">Name (English)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Name (Arabic)</label>
                  <input
                    type="text"
                    required
                    dir="rtl"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all font-arabic"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Description (English)</label>
                  <textarea
                    rows={2}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all resize-none"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Description (Arabic)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all resize-none font-arabic"
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Category</label>
                  <select
                    required
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 transition-all appearance-none cursor-pointer"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    {categories.length === 0 && <option value="">No categories available</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-zinc-900">{c.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Image URL</label>
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
