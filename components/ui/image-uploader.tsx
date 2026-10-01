"use client"

import { apiErrorMessage } from "@/lib/api-error";

import { useState, useRef, ChangeEvent, DragEvent } from "react"
import { useLocale } from "next-intl"
import { Upload, Link as LinkIcon, X, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import Image from "@/components/ui/menu-image"

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
  const locale = useLocale()
  const isRtl = locale === "ar"

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
      setError(
        isRtl
          ? "حجم الملف يتجاوز الحد المسموح (5 ميغابايت). يرجى اختيار صورة أصغر."
          : "File size exceeds the 5MB limit. Please choose a smaller image."
      )
      return
    }

    // Allowed MIME types
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setError(
        isRtl
          ? "صيغة الملف غير مدعومة. الصيغ المسموحة: JPG, PNG, WebP."
          : "Unsupported file format. Allowed formats: JPG, PNG, WebP."
      )
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
        throw new Error(isRtl ? "لم يتم استلام رابط الصورة من الخادم." : "No image URL returned from server.")
      }
    } catch (err: unknown) {
      console.error("Upload error:", err)
      setError(apiErrorMessage(err) || (isRtl ? "تعذر رفع الصورة. يرجى المحاولة مرة أخرى." : "Failed to upload image. Please try again."))
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
      {(label || description) && (
        <div className="flex items-center justify-between flex-wrap gap-1">
          {label && <label className="text-xs sm:text-sm font-semibold text-zinc-300">{label}</label>}
          {description && (
            <span className="text-xs text-zinc-500">{description}</span>
          )}
        </div>
      )}

      {/* Existing Image Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2.5 flex items-center gap-3 group max-w-full shadow-inner">
          <div
            className={cn(
              "rounded-xl overflow-hidden bg-neutral-900 border border-white/10 relative shrink-0 shadow-sm ring-1 ring-white/5",
              aspectRatio === "banner" ? "w-28 h-18 sm:w-32 sm:h-20" : "w-16 h-16 sm:w-20 sm:h-20"
            )}
          >
            <Image
              src={value}
              alt={isRtl ? "معاينة صورة الصنف" : "Item image preview"}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 pr-1 sm:pr-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-0.5">
              <CheckCircle2 size={14} />
              <span>{isRtl ? "تم إرفاق الصورة" : "Image attached"}</span>
            </div>
            <p className="text-xs text-zinc-400 truncate font-mono direction-ltr text-left" dir="ltr">{value}</p>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-[0.96] shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            title={isRtl ? "حذف الصورة" : "Delete image"}
            aria-label={isRtl ? "حذف الصورة" : "Delete image"}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 w-full max-w-full min-w-0">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl w-full sm:w-fit max-w-full">
            <button
              type="button"
              onClick={() => {
                setActiveTab("file")
                setError("")
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.96]",
                activeTab === "file"
                  ? "bg-[rgba(71,170,161,0.22)] text-[#8cd1ca] border border-[rgba(71,170,161,0.4)] shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Upload size={13} />
              <span>{isRtl ? "رفع من الجهاز" : "Upload file"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("url")
                setError("")
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.96]",
                activeTab === "url"
                  ? "bg-[rgba(71,170,161,0.22)] text-[#8cd1ca] border border-[rgba(71,170,161,0.4)] shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <LinkIcon size={13} />
              <span>{isRtl ? "رابط الصورة" : "Image URL"}</span>
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
                "border-2 border-dashed rounded-2xl p-5 sm:p-7 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 max-w-full box-border",
                isDragging
                  ? "border-[rgba(71,170,161,0.8)] bg-[rgba(71,170,161,0.12)] scale-[1.01]"
                  : "border-white/15 bg-black/25 hover:border-white/30 hover:bg-white/[0.03]"
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
                  <Loader2 className="w-7 h-7 animate-spin text-[#8cd1ca]" />
                  <p className="text-xs text-[#a9ded8] font-semibold">
                    {isRtl ? "جارٍ رفع الصورة إلى الخادم…" : "Uploading image to server…"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8cd1ca] shadow-inner">
                    <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      {isRtl
                        ? "انقر لاختيار صورة من جهازك أو اسحبها هنا"
                        : "Click to select an image from your device or drag it here"}
                    </p>
                    <p className="text-[0.72rem] text-zinc-500 mt-0.5">
                      {isRtl
                        ? "يدعم كاميرا واستوديو الجوال وملفات الحاسوب (حتى 5 ميغابايت)"
                        : "Supports camera, photo library, and local files (up to 5MB)"}
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
                placeholder="https://example.com/item.jpg"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[rgba(71,170,161,0.6)] min-w-0"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                disabled={!urlInput.trim()}
                className="px-4 py-2.5 bg-[var(--admin-teal,#47aaa1)] hover:bg-[#3d9890] disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.96] shrink-0 w-full sm:w-auto shadow-sm"
              >
                {isRtl ? "تطبيق" : "Apply"}
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
