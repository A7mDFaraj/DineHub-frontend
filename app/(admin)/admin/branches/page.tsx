"use client";

import { useState, useEffect } from "react";
import { Plus, Store, Loader2, MapPin, Phone } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface Branch {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  phone: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nameEn: "",
    nameAr: "",
    addressEn: "",
    addressAr: "",
    phone: "",
  });

  const fetchBranches = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get("/admin/branches");
      setBranches(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch branches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await apiClient.post("/admin/branches", formData);
      setFormData({
        nameEn: "",
        nameAr: "",
        addressEn: "",
        addressAr: "",
        phone: "",
      });
      fetchBranches();
    } catch (err) {
      console.error(err);
      setError("Failed to create branch.");
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-outfit text-white">Branches</h1>
          <p className="text-zinc-400 mt-1">Manage your restaurant locations</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch List */}
        <div className="lg:col-span-2 space-y-4">
          {branches.length === 0 ? (
            <div className="glass-panel p-12 text-center flex flex-col items-center justify-center">
              <Store className="w-12 h-12 text-zinc-500 mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No branches yet</h3>
              <p className="text-zinc-400">Create your first branch to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <div key={branch.id} className="glass-panel p-5 flex flex-col gap-3 group hover:border-primary-500/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors">
                        {branch.nameEn}
                      </h3>
                      <p className="text-sm text-zinc-400 font-arabic">{branch.nameAr}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-primary-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{branch.addressEn}</span>
                    </div>
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Branch Form */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold text-white mb-4">Add New Branch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Name (English)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. Downtown Branch"
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
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all font-arabic"
                  placeholder="مثال: فرع وسط البلد"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Address (English)</label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                  placeholder="Full address"
                  value={formData.addressEn}
                  onChange={(e) => setFormData({ ...formData, addressEn: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Address (Arabic)</label>
                <input
                  type="text"
                  dir="rtl"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all font-arabic"
                  placeholder="العنوان الكامل"
                  value={formData.addressAr}
                  onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Phone</label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary-500/50 transition-all"
                  placeholder="+1 234 567 890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
              >
                {isCreating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Branch
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
