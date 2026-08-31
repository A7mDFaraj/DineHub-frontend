"use client";

import { useState, useEffect } from "react";
import { Plus, Tags, Loader2, GripVertical, Building2 } from "lucide-react";
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
  sortOrder?: number;
  branchId?: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    sortOrder: 0,
  });

  const fetchCategories = async (branchId: string) => {
    try {
      const { data } = await apiClient.get(`/admin/categories/${branchId}`);
      setCategories(Array.isArray(data) ? data : data?.data || data?.categories || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch categories for this branch.");
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
        await fetchCategories(activeId);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBranchChange = async (branchId: string) => {
    setSelectedBranchId(branchId);
    await fetchCategories(branchId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError("Please select a branch first.");
      return;
    }
    
    try {
      setIsCreating(true);
      setError("");
      await apiClient.post("/admin/categories", {
        branchId: selectedBranchId,
        name: formData.nameEn || formData.nameAr,
        nameEn: formData.nameEn || undefined,
        nameAr: formData.nameAr || undefined,
        sortOrder: categories.length,
      });
      setFormData({
        nameEn: "",
        nameAr: "",
        sortOrder: 0,
      });
      await fetchCategories(selectedBranchId);
    } catch (err) {
      console.error(err);
      setError("Failed to create category.");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white">Categories</h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">Organize your menu into categories</p>
        </div>
        
        {/* Branch Selector */}
        {branches.length > 0 && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 px-3 self-start sm:self-auto w-full sm:w-auto">
            <Building2 className="w-4 h-4 text-primary-400 shrink-0" />
            <select 
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none text-sm w-full pr-6"
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
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {branches.length === 0 ? (
        <div className="glass-panel p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-2xl">
          <Building2 className="w-12 h-12 text-zinc-500 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No branches available</h3>
          <p className="text-zinc-400 text-sm">You need to create a branch before adding categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Categories List */}
          <div className="lg:col-span-2 space-y-4">
            {categories.length === 0 ? (
              <div className="glass-panel p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-2xl">
                <Tags className="w-12 h-12 text-zinc-500 mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">No categories yet</h3>
                <p className="text-zinc-400 text-xs">Add categories like 'Main Course' or 'Drinks'</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const primaryName = category.name || category.nameEn || category.nameAr || "Untitled Category";
                  const secondaryName = (category.nameEn && category.nameAr) ? category.nameAr : null;

                  return (
                    <div key={category.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between group hover:border-primary-500/30 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="cursor-grab text-zinc-600 hover:text-white transition-colors shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white truncate">
                            {primaryName}
                          </h3>
                          {secondaryName && secondaryName !== primaryName ? (
                            <p className="text-xs text-zinc-400 font-arabic truncate">{secondaryName}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shrink-0 ml-2 font-mono">
                        Order: {category.sortOrder ?? 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Category Form */}
          <div className="lg:col-span-1 lg:sticky lg:top-4">
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4 font-outfit">Add Category</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Name (English)</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all text-sm"
                    placeholder="e.g. Main Course"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Name (Arabic)</label>
                  <input
                    type="text"
                    dir="rtl"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 transition-all font-arabic text-sm"
                    placeholder="مثال: الأطباق الرئيسية"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-[0.98] text-sm"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Category
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
