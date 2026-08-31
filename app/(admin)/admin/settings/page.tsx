"use client"

import { useState, useEffect } from "react"
import { 
  Store, Palette, Building2, Save, Loader2, CheckCircle2, 
  Sparkles, Smartphone, MapPin, Sliders
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { ImageUploader } from "@/components/ui/image-uploader"
import { cn } from "@/lib/utils"

interface Branch {
  id: string
  name?: string
  nameEn?: string
  nameAr?: string
  address?: string
  logoUrl?: string
  themeColor?: string
}

const PRESET_COLORS = [
  { name: "Luxury Gold", hex: "#D4AF37" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Crimson Rose", hex: "#E11D48" },
  { name: "Royal Blue", hex: "#3B82F6" },
  { name: "Sunset Amber", hex: "#F59E0B" },
  { name: "Deep Violet", hex: "#8B5CF6" },
  { name: "Teal Mint", hex: "#14B8A6" },
  { name: "Ruby Red", hex: "#DC2626" },
]

export default function BranchSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    logoUrl: "",
    themeColor: "#D4AF37",
  })

  const fetchBranches = async () => {
    try {
      setIsLoading(true)
      setError("")
      const { data } = await apiClient.get("/admin/branches")
      const list: Branch[] = Array.isArray(data) ? data : data?.data || data?.branches || []
      setBranches(list)

      if (list.length > 0) {
        const activeBranch = list.find((b) => b.id === selectedBranchId) || list[0]
        setSelectedBranchId(activeBranch.id)
        setFormData({
          name: activeBranch.name || activeBranch.nameEn || activeBranch.nameAr || "",
          address: activeBranch.address || "",
          logoUrl: activeBranch.logoUrl || "",
          themeColor: activeBranch.themeColor || "#D4AF37",
        })
      }
    } catch (err: any) {
      console.error(err)
      setError("Failed to fetch store settings.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
  }, [])

  const handleBranchSelect = (branchId: string) => {
    setSelectedBranchId(branchId)
    const branch = branches.find((b) => b.id === branchId)
    if (branch) {
      setFormData({
        name: branch.name || branch.nameEn || branch.nameAr || "",
        address: branch.address || "",
        logoUrl: branch.logoUrl || "",
        themeColor: branch.themeColor || "#D4AF37",
      })
      setSuccessMsg("")
      setError("")
    }
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!selectedBranchId) return

    try {
      setIsSaving(true)
      setError("")
      setSuccessMsg("")

      await apiClient.patch(`/admin/branches/${selectedBranchId}`, {
        name: formData.name.trim() || undefined,
        address: formData.address.trim() || undefined,
        logoUrl: formData.logoUrl.trim() || undefined,
        themeColor: formData.themeColor.trim() || "#D4AF37",
      })

      setSuccessMsg("Brand settings saved successfully! The customer QR menu is now updated.")
      
      // Update local state
      setBranches((prev) =>
        prev.map((b) =>
          b.id === selectedBranchId
            ? {
                ...b,
                name: formData.name,
                address: formData.address,
                logoUrl: formData.logoUrl,
                themeColor: formData.themeColor,
              }
            : b
        )
      )

      setTimeout(() => setSuccessMsg(""), 5000)
    } catch (err: any) {
      console.error("Save settings error:", err)
      setError(err?.response?.data?.message || "Failed to save settings.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white">
            Brand & Store Settings
          </h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
            Customize your restaurant logo, brand colors, and public profile.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {branches.length > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 px-3 flex-1 sm:flex-initial">
              <Building2 className="w-4 h-4 text-primary-400 shrink-0" />
              <select
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer appearance-none text-sm w-full"
                value={selectedBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-zinc-900 text-white">
                    {b.name || b.nameEn || b.nameAr || "Branch"}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => handleSave()}
            disabled={isSaving || !selectedBranchId}
            className="bg-primary-500 hover:bg-primary-600 text-black font-bold py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {branches.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <Store className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No branches found</h3>
          <p className="text-zinc-400 text-sm">Create a branch first to customize its brand and logo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Settings Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Restaurant Info & Logo */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-2 text-white font-bold text-lg font-outfit border-b border-white/5 pb-4">
                <Store className="w-5 h-5 text-primary-400" />
                <span>Store Profile & Logo</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Restaurant / Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. DineHub Lounge"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Location / Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. King Fahd Road, Riyadh"
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 text-sm"
                    />
                  </div>
                </div>

                {/* Logo Image Uploader */}
                <div className="pt-2">
                  <ImageUploader
                    value={formData.logoUrl}
                    onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                    label="Store Logo / شعار المطعم"
                    description="Upload from phone/computer or paste link (Square ratio recommended)"
                    aspectRatio="square"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Theme & Brand Colors */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center gap-2 text-white font-bold text-lg font-outfit border-b border-white/5 pb-4">
                <Palette className="w-5 h-5 text-primary-400" />
                <span>Brand Colors & Theme</span>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                    Preset Luxury Color Palettes
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PRESET_COLORS.map((color) => {
                      const isSelected = formData.themeColor.toLowerCase() === color.hex.toLowerCase()
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() => setFormData({ ...formData, themeColor: color.hex })}
                          className={cn(
                            "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium transition-all select-none text-left",
                            isSelected
                              ? "bg-white/10 border-white/40 shadow-md"
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                          )}
                        >
                          <div
                            className="w-4 h-4 rounded-full shadow-sm shrink-0 border border-white/20"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-zinc-200 truncate">{color.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                      Custom Hex Color Picker
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Fine-tune the exact hex code of your restaurant brand.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-2xl shrink-0">
                    <input
                      type="color"
                      value={formData.themeColor}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="w-9 h-9 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      value={formData.themeColor}
                      onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                      className="w-24 bg-transparent font-mono text-sm text-white font-bold uppercase focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Mobile Customer Menu Preview Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-primary-400" />
                <span>Live Customer Menu Preview</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Mobile QR View</span>
            </div>

            {/* Mobile Device Mockup */}
            <div className="w-full max-w-sm mx-auto rounded-[32px] border-4 border-zinc-800 bg-[#0d0d10] p-4 shadow-2xl space-y-4 overflow-hidden relative">
              {/* Simulated Customer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  {formData.logoUrl ? (
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm"
                      style={{ backgroundColor: `${formData.themeColor}25`, color: formData.themeColor }}
                    >
                      {formData.name.slice(0, 2).toUpperCase() || "DH"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{formData.name || "Restaurant Name"}</h4>
                    <p className="text-[10px] text-zinc-400">Table #4</p>
                  </div>
                </div>

                <div
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: `${formData.themeColor}20`, color: formData.themeColor, border: `1px solid ${formData.themeColor}40` }}
                >
                  QR Active
                </div>
              </div>

              {/* Sample Dish Card in Customer Menu */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-xl bg-neutral-800 border border-white/5 flex items-center justify-center text-2xl shrink-0">
                    ☕
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-white">Caramel Macchiato</h5>
                      <span className="text-xs font-mono font-bold" style={{ color: formData.themeColor }}>
                        SAR 22.00
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">Espresso with vanilla syrup & caramel drizzle</p>
                    
                    {/* Custom Tag */}
                    <div className="flex gap-1 mt-1">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${formData.themeColor}15`, color: formData.themeColor }}
                      >
                        Extra Sugar
                      </span>
                    </div>
                  </div>
                </div>

                {/* Styled Action Button with Restaurant Color */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-black shadow-md transition-transform active:scale-95"
                    style={{ backgroundColor: formData.themeColor }}
                  >
                    + Add to Order
                  </button>
                </div>
              </div>

              {/* Simulated Floating Cart Bar */}
              <div
                className="rounded-2xl p-3 flex items-center justify-between shadow-lg text-black font-bold text-xs"
                style={{ backgroundColor: formData.themeColor }}
              >
                <span>View Order (1 Item)</span>
                <span>SAR 22.00</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
