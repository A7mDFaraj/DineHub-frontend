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
      setError("File size exceeds 5MB limit. Please choose a smaller image.")
      return
    }

    // Allowed MIME types
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Only JPG, PNG, WebP, SVG, and GIF are allowed.")
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
        throw new Error("No URL returned from upload server.")
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err?.response?.data?.message || err?.message || "Failed to upload image. Please try again.")
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
    <div className={cn("space-y-3 w-full", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-300">{label}</label>
          {description && (
            <span className="text-xs text-zinc-500 hidden sm:inline">{description}</span>
          )}
        </div>
      )}

      {/* Existing Image Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2.5 flex items-center gap-4 group">
          <div
            className={cn(
              "rounded-xl overflow-hidden bg-neutral-900 border border-white/5 relative shrink-0",
              aspectRatio === "banner" ? "w-32 h-20" : "w-20 h-20"
            )}
          >
            <img src={value} alt="Uploaded preview" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mb-1">
              <CheckCircle2 size={14} />
              <span>Image Attached</span>
            </div>
            <p className="text-xs text-zinc-400 truncate font-mono">{value}</p>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors shrink-0"
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-black/30 border border-white/10 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab("file")
                setError("")
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                activeTab === "file"
                  ? "bg-primary-500 text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Upload size={13} />
              <span>Upload from Device</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("url")
                setError("")
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                activeTab === "url"
                  ? "bg-primary-500 text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <LinkIcon size={13} />
              <span>Image URL</span>
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
                "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
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
                  <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                  <p className="text-xs text-primary-300 font-semibold">Uploading to server...</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-400 shadow-inner">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Click to choose photo or drag & drop
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Works with phone camera/gallery & computer files (Max 5MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Direct URL */}
          {activeTab === "url" && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary-500/50"
              />
              <button
                type="button"
                onClick={handleUrlApply}
                disabled={!urlInput.trim()}
                className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-black font-bold rounded-xl text-xs transition-colors shrink-0"
              >
                Apply
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
