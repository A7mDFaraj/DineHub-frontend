"use client"

import { useState, useRef, ChangeEvent, DragEvent } from "react"
import { Upload, Link as LinkIcon, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface ImageUploaderProps {
  value?: string
  onChange: (url: string) => void
  label?: string
  description?: string
  aspectRatio?: "square" | "banner" | "auto"
  className?: string
}

export function ImageUploader({
  value,
  onChange,
  label,
  description,
  aspectRatio = "square",
  className,
}: ImageUploaderProps) {
  const [activeTab, setActiveTab] = useState<"file" | "url">("file")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [urlInput, setUrlInput] = useState(value || "")
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // 5MB limit check
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الملف يتجاوز الحد المسموح (5 ميغابايت). يرجى اختيار صورة أصغر.")
      return
    }

    // Allowed MIME types
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setError("صيغة الملف غير مدعومة. الصيغ المسموحة: JPG, PNG, WebP, SVG, GIF.")
      return
    }

    try {
      setIsUploading(true)
      setError("")

      const formData = new FormData()
      formData.append("file", file)

      const res = await apiClient.post("/admin/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const uploadedUrl = res.data?.url || res.data?.data?.url
      if (uploadedUrl) {
        onChange(uploadedUrl)
        setUrlInput(uploadedUrl)
      } else {
        throw new Error("لم يتم استلام رابط الصورة من الخادم.")
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err?.response?.data?.message || err?.message || "تعذر رفع الصورة. يرجى المحاولة مرة أخرى.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleUrlApply = () => {
    const trimmed = urlInput.trim()
    if (trimmed) {
      onChange(trimmed)
      setError("")
    }
  }

  const handleClear = () => {
    onChange("")
    setUrlInput("")
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("space-y-3 w-full max-w-full min-w-0 box-border", className)}>
      {label && (
        <div className="flex items-center justify-between flex-wrap gap-1">
          <label className="text-xs sm:text-sm font-semibold text-zinc-300">{label}</label>
          {description && (
            <span className="text-xs text-zinc-500">{description}</span>
          )}
        </div>
      )}

      {/* Existing Image Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2.5 flex items-center gap-3 group max-w-full">
          <div
            className={cn(
              "rounded-xl overflow-hidden bg-neutral-900 border border-white/5 relative shrink-0",
              aspectRatio === "banner" ? "w-28 h-18 sm:w-32 sm:h-20" : "w-16 h-16 sm:w-20 sm:h-20"
            )}
          >
            <img src={value} alt="معاينة الشعار" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 pr-1 sm:pr-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-0.5">
              <CheckCircle2 size={14} />
              <span>تم إرفاق الصورة</span>
            </div>
            <p className="text-xs text-zinc-400 truncate font-mono direction-ltr text-left" dir="ltr">{value}</p>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors shrink-0"
            title="حذف الصورة"
            aria-label="حذف الصورة"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 w-full max-w-full min-w-0">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-black/30 border border-white/10 p-1 rounded-xl w-full sm:w-fit max-w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab("file")
                setError("")
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                activeTab === "file"
                  ? "bg-primary-500 text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Upload size={13} />
              <span>رفع من الجهاز</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("url")
                setError("")
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
                activeTab === "url"
                  ? "bg-primary-500 text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <LinkIcon size={13} />
              <span>رابط الصورة</span>
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === "file" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 max-w-full box-border",
                isDragging
                  ? "border-primary-500 bg-primary-500/10 scale-[1.01]"
                  : "border-white/15 bg-black/20 hover:border-white/30 hover:bg-white/[0.02]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="w-7 h-7 animate-spin text-primary-400" />
                  <p className="text-xs text-primary-300 font-semibold">جارٍ رفع الصورة إلى الخادم…</p>
                </div>
              ) : (
                <>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 shadow-inner">
                    <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      انقر لاختيار صورة من جهازك أو اسحبها هنا
                    </p>
                    <p className="text-[0.72rem] text-zinc-500 mt-0.5">
                      يدعم كاميرا واستوديو الجوال وملفات الحاسوب (حتى 5 ميغابايت)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Direct URL */}
          {activeTab === "url" && (
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full">
              <input
                type="url"
                dir="ltr"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50 min-w-0"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                disabled={!urlInput.trim()}
                className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-colors shrink-0 w-full sm:w-auto"
              >
                تطبيق
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
