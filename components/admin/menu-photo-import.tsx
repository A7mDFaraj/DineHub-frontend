"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Upload, ScanText, RotateCw, X, Plus } from "lucide-react";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import {
  FULL_CROP,
  preparePhoto,
  recognizePhoto,
  type Crop,
} from "@/lib/menu-ocr/browser";
import {
  itemErrors,
  normalizeDigits,
  normalizeName,
  parseMenuLines,
  type ExistingCategory,
  type ImportCategory,
  type ImportItem,
} from "@/lib/menu-ocr/parser";
import styles from "./menu-photo-import.module.css";

type Payload = {
  branchId: string;
  idempotencyKey: string;
  categories: {
    key: string;
    existingId?: string;
    nameAr?: string;
    nameEn?: string;
  }[];
  items: {
    categoryKey: string;
    nameAr: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    price: string;
    calories: number | null;
  }[];
};
type Product = { categoryId: string; nameAr?: string; nameEn?: string };
type Props = {
  branchId: string;
  isRtl: boolean;
  onClose: () => void;
  onImported: () => void;
};

export default function MenuPhotoImport({
  branchId,
  isRtl,
  onClose,
  onImported,
}: Props) {
  const { access, can } = useAccess();
  const text = (en: string, ar: string) => (isRtl ? ar : en);
  const storageKey = `dinehub:menu-import:${access?.id}:${branchId}`;
  const [pending, setPending] = useState<Payload | null>(() => {
    try {
      const value = JSON.parse(
        sessionStorage.getItem(storageKey) || "null",
      ) as Payload | null;
      return value?.branchId === branchId &&
        Array.isArray(value.items) &&
        Array.isArray(value.categories) &&
        typeof value.idempotencyKey === "string"
        ? value
        : null;
    } catch {
      return null;
    }
  });
  const [existing, setExisting] = useState<ExistingCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState<Crop>({ ...FULL_CROP });
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [language, setLanguage] = useState<"ara" | "eng" | "ara+eng">(
    "ara+eng",
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [categories, setCategories] = useState<ImportCategory[]>([]);
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [validation, setValidation] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const alert = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      apiClient.get(`/admin/categories/${branchId}`, {
        signal: controller.signal,
      }),
      apiClient.get(`/admin/products/branch/${branchId}`, {
        signal: controller.signal,
      }),
    ])
      .then(([c, p]) => {
        const cats: unknown = Array.isArray(c.data) ? c.data : c.data?.data;
        const prods: unknown = Array.isArray(p.data) ? p.data : p.data?.data;
        if (!Array.isArray(cats) || !Array.isArray(prods))
          throw new Error("Invalid menu response");
        if (!controller.signal.aborted) {
          setExisting(cats);
          setProducts(prods);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [branchId, refresh]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!file) return;
    let cancelled = false,
      url = "";
    const timer = setTimeout(() => {
      setPreparing(true);
      setPhoto(null);
      setError("");
      preparePhoto(file, rotation, crop)
        .then((blob) => {
          if (cancelled) return;
          url = URL.createObjectURL(blob);
          setPhoto({ blob, url });
        })
        .catch(() => {
          if (!cancelled)
            setError(
              isRtl
                ? "تعذر تجهيز الصورة. استخدم JPG أو PNG أو WebP حتى 15 ميغابايت و40 مليون بكسل، وتحقق من حدود القص."
                : "Could not prepare this image. Use JPG, PNG or WebP up to 15 MB and 40 megapixels, and check the crop bounds.",
            );
        })
        .finally(() => {
          if (!cancelled) setPreparing(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, rotation, crop, isRtl]);
  useEffect(() => {
    if (!error) return;
    alert.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!items.length && !pending) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [items.length, pending]);

  const locked = busy || saving || !!pending || saved !== null;
  function chooseFile(next?: File) {
    if (!next || locked) return;
    if (
      items.length &&
      !window.confirm(
        text(
          "Replace this photo and its unsaved suggestions?",
          "استبدال الصورة والاقتراحات غير المحفوظة؟",
        ),
      )
    )
      return;
    setItems([]);
    setCategories([]);
    setRawText("");
    setValidation(false);
    setPhoto(null);
    setPreparing(true);
    setFile(next);
    setRotation(0);
    setCrop({ ...FULL_CROP });
  }
  async function scan() {
    if (!photo || locked || preparing) return;
    if (
      items.length &&
      !window.confirm(
        text(
          "Read again and replace your edits?",
          "إعادة القراءة واستبدال تعديلاتك؟",
        ),
      )
    )
      return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setProgress(0);
    setError("");
    setValidation(false);
    try {
      const lines = await recognizePhoto(
        photo.blob,
        language,
        controller.signal,
        setProgress,
      );
      if (controller.signal.aborted) return;
      const draft = parseMenuLines(lines, existing);
      setRawText(lines.map((l) => l.text).join("\n"));
      setCategories(draft.categories);
      setItems(draft.items);
      if (!lines.length)
        setError(
          text(
            "No text found. Retake a sharper photo or crop closer to the text.",
            "لم يظهر نص. التقط صورة أوضح أو قرّب القص من النص.",
          ),
        );
      else if (draft.items.length > 100)
        setError(
          text(
            "More than 100 lines found. Crop a smaller section before importing.",
            "تم العثور على أكثر من 100 سطر. قص قسماً أصغر قبل الاستيراد.",
          ),
        );
    } catch (e) {
      if (!controller.signal.aborted)
        console.warn(
          "Browser OCR failed:",
          e instanceof Error ? e.message : "unknown",
        );
      if (!controller.signal.aborted)
        setError(
          text(
            "Reading failed or took too long. Check your connection for the first model download, then retry with a smaller crop.",
            "فشلت القراءة أو استغرقت وقتاً طويلاً. تحقق من الاتصال لتنزيل نموذج القراءة أول مرة، ثم أعد المحاولة بقص أصغر.",
          ),
        );
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      if (abortRef.current === controller) {
        setBusy(false);
        abortRef.current = null;
      }
    }
  }
  function updateItem(key: string, patch: Partial<ImportItem>) {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, ...patch, reviewed: patch.reviewed ?? false }
          : item,
      ),
    );
    setError("");
  }
  function addCategory(from?: ImportItem) {
    const category: ImportCategory = {
      key: crypto.randomUUID(),
      nameAr: from?.nameAr ?? "",
      nameEn: from?.nameEn ?? "",
      existingId: "",
    };
    setCategories((current) => [...current, category]);
    if (from) {
      // Only suggest this heading for following rows until the next detected heading.
      setItems((current) => {
        let following = false;
        return current.flatMap((item) => {
          if (item.key === from.key) {
            following = true;
            return [];
          }
          if (following && item.categoryKey !== from.categoryKey)
            following = false;
          return [
            following
              ? { ...item, categoryKey: category.key, reviewed: false }
              : item,
          ];
        });
      });
    }
  }
  function duplicate(item: ImportItem) {
    const category = categories.find((c) => c.key === item.categoryKey);
    const names = [item.nameAr, item.nameEn].filter(Boolean).map(normalizeName);
    return (
      products.some(
        (p) =>
          p.categoryId === category?.existingId &&
          [p.nameAr, p.nameEn].some(
            (n) => n && names.includes(normalizeName(n)),
          ),
      ) ||
      items.some(
        (other) =>
          other.key !== item.key &&
          other.selected &&
          other.categoryKey === item.categoryKey &&
          [other.nameAr, other.nameEn].some(
            (n) => n && names.includes(normalizeName(n)),
          ),
      )
    );
  }
  async function commit() {
    if (saveLock.current || !can("menu.create")) return;
    setError("");
    setValidation(true);
    const selected = items.filter((i) => i.selected);
    let payload = pending;
    if (!payload) {
      const used = categories.filter((c) =>
        selected.some((i) => i.categoryKey === c.key),
      );
      if (
        !selected.length ||
        selected.length > 100 ||
        used.length > 50 ||
        selected.some(
          (i) => itemErrors(i).length || !i.reviewed || duplicate(i),
        ) ||
        used.some(
          (c) =>
            !c.existingId &&
            (!can("categories.create") ||
              !(c.nameAr.trim() || c.nameEn.trim())),
        )
      ) {
        setError(
          text(
            "Review each selected item, resolve duplicates, and complete its Arabic name, price and category. Maximum 100 items per import.",
            "راجع كل صنف محدد وعالج التكرار وأكمل الاسم العربي والسعر والتصنيف. الحد الأقصى 100 صنف لكل استيراد.",
          ),
        );
        return;
      }
      payload = {
        branchId,
        idempotencyKey: crypto.randomUUID(),
        categories: used.map((c) => ({
          key: c.key,
          ...(c.existingId
            ? { existingId: c.existingId }
            : {
                nameAr: c.nameAr.trim() || undefined,
                nameEn: c.nameEn.trim() || undefined,
              }),
        })),
        items: selected.map((i) => ({
          categoryKey: i.categoryKey,
          nameAr: i.nameAr.trim(),
          nameEn: i.nameEn.trim() || undefined,
          descriptionAr: i.descriptionAr.trim() || undefined,
          descriptionEn: i.descriptionEn.trim() || undefined,
          price: Number(i.price).toFixed(2),
          calories: i.calories === "" ? null : Number(i.calories),
        })),
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        setError(
          text(
            "Browser storage is unavailable. Enable it before importing so interrupted requests can be recovered safely.",
            "التخزين في المتصفح غير متاح. فعّله قبل الاستيراد لضمان استعادة الطلبات المنقطعة بأمان.",
          ),
        );
        return;
      }
      setPending(payload);
    }
    saveLock.current = true;
    setSaving(true);
    try {
      const result = await apiClient.post("/admin/menu-imports", payload, {
        timeout: 30000,
      });
      if (!Number.isInteger(result.data?.productsCreated))
        throw new Error("Unconfirmed response");
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Retrying this receipt remains safe. */
      }
      setPending(null);
      setSaved(result.data.productsCreated);
      setItems([]);
      onImported();
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status && [400, 401, 403, 404, 409, 413, 422].includes(status)) {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          /* No write was accepted. */
        }
        setPending(null);
        if (!items.length) {
          setCategories(
            payload.categories.map((c) => ({
              key: c.key,
              existingId: c.existingId || "",
              nameAr: c.nameAr || "",
              nameEn: c.nameEn || "",
            })),
          );
          setItems(
            payload.items.map((i, index) => ({
              ...i,
              key: `recovered-${index}`,
              nameEn: i.nameEn || "",
              descriptionAr: i.descriptionAr || "",
              descriptionEn: i.descriptionEn || "",
              calories: i.calories == null ? "" : String(i.calories),
              source: text(
                "Recovered import draft — recheck before saving.",
                "مسودة مستعادة — راجعها قبل الحفظ.",
              ),
              confidence: 0,
              warnings: [],
              selected: true,
              reviewed: false,
            })),
          );
        }
        setError(
          status === 404
            ? text(
                "Import is not available on the server yet. Your draft has not been imported.",
                "الاستيراد غير متاح على الخادم بعد. لم يتم استيراد المسودة.",
              )
            : status === 409
              ? text(
                  "The menu changed or a duplicate was found. Nothing was added. Refresh the menu and review the category/item matches.",
                  "تغيرت القائمة أو وُجد تكرار. لم تتم إضافة أصناف. حدّث القائمة وراجع مطابقة التصنيفات والأصناف.",
                )
              : text(
                  "Import was rejected. Nothing was added. Check your access and the selected fields.",
                  "تم رفض الاستيراد. لم تتم إضافة أصناف. تحقق من الصلاحيات والحقول المحددة.",
                ),
        );
      } else {
        setError(
          text(
            "The result could not be confirmed. Use “Retry same import” to check or finish this exact batch without duplicating it. Do not start another import of these items.",
            "تعذر تأكيد النتيجة. استخدم «إعادة نفس الاستيراد» للتحقق أو إكمال هذه الدفعة دون تكرارها. لا تبدأ استيراداً آخر لهذه الأصناف.",
          ),
        );
      }
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  }
  function close() {
    if (saving) return;
    if (
      items.length &&
      !pending &&
      !window.confirm(
        text(
          "Discard the unsaved photo import?",
          "تجاهل مسودة الاستيراد غير المحفوظة؟",
        ),
      )
    )
      return;
    abortRef.current?.abort();
    onClose();
  }
  const selectedCount = items.filter((i) => i.selected).length;
  const labelFor = (field: string) =>
    ({
      nameAr: text("Arabic name", "الاسم العربي"),
      nameEn: text("English name", "الاسم الإنجليزي"),
      price: text("Price (SAR)", "السعر (ر.س)"),
      calories: text("Calories (kcal)", "السعرات الحرارية"),
      category: text("Category", "التصنيف"),
      description: text("Description", "الوصف"),
    })[field] ?? field;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          dir={isRtl ? "rtl" : "ltr"}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (saving) e.preventDefault();
          }}
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>
                {text("MENU ASSISTANT", "مساعد القائمة")}
              </p>
              <Dialog.Title>
                {text("Import from a menu photo", "استيراد من صورة القائمة")}
              </Dialog.Title>
              <Dialog.Description>
                {text(
                  "Read on your device. Check every item before adding it to your menu.",
                  "القراءة على جهازك. راجع كل صنف قبل إضافته إلى قائمتك.",
                )}
              </Dialog.Description>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={saving}
              aria-label={text("Close", "إغلاق")}
            >
              <X size={20} />
            </button>
          </header>
          <div className={styles.body}>
            {error && (
              <div
                ref={alert}
                className={styles.error}
                role="alert"
                tabIndex={-1}
              >
                {error}
              </div>
            )}
            {saved !== null ? (
              <div className={styles.notice} role="status">
                {text(
                  `${saved} items imported successfully.`,
                  `تم استيراد ${saved} صنف بنجاح.`,
                )}
              </div>
            ) : pending ? (
              <section className={styles.notice}>
                <h3>
                  {text(
                    "An import is awaiting confirmation",
                    "استيراد بانتظار التأكيد",
                  )}
                </h3>
                <p>
                  {text(
                    `${pending.items.length} items. Retry this exact batch to recover its result safely.`,
                    `${pending.items.length} صنف. أعد نفس الدفعة لاستعادة النتيجة بأمان.`,
                  )}
                </p>
                <details>
                  <summary>
                    {text("View items in this batch", "عرض أصناف هذه الدفعة")}
                  </summary>
                  {pending.items.map((item, i) => (
                    <p key={i} dir="auto">
                      {item.nameAr} / {item.nameEn} — {item.price} SAR{" "}
                      {item.calories == null ? "" : `· ${item.calories} kcal`}
                    </p>
                  ))}
                </details>
              </section>
            ) : (
              <>
                {loading ? (
                  <p role="status">
                    {text(
                      "Loading current menu…",
                      "جارٍ تحميل القائمة الحالية…",
                    )}
                  </p>
                ) : loadError ? (
                  <div className={styles.error} role="alert">
                    {text(
                      "Cannot load your menu for matching.",
                      "تعذر تحميل القائمة للمطابقة.",
                    )}
                    <button
                      onClick={() => {
                        setLoading(true);
                        setRefresh((n) => n + 1);
                      }}
                    >
                      {text("Retry", "إعادة المحاولة")}
                    </button>
                  </div>
                ) : null}
                <div className={styles.workspace}>
                  <section
                    className={styles.photoPanel}
                    aria-label={text("Source photograph", "الصورة الأصلية")}
                  >
                    <div className={styles.actions}>
                      <button
                        disabled={locked}
                        onClick={() => upload.current?.click()}
                      >
                        <Upload size={18} />
                        {text("Upload photo", "رفع صورة")}
                      </button>
                      <button
                        disabled={locked}
                        onClick={() => camera.current?.click()}
                      >
                        <Camera size={18} />
                        {text("Take photo", "التقاط صورة")}
                      </button>
                      <input
                        ref={upload}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => {
                          chooseFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <input
                        ref={camera}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        hidden
                        onChange={(e) => {
                          chooseFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    <p className={styles.hint}>
                      {text(
                        "JPG, PNG or WebP · up to 15 MB. Photograph straight on in good light. For columns or size tables, crop one section at a time. HEIC: export as JPEG first.",
                        "JPG أو PNG أو WebP · حتى 15 ميغابايت. صوّر باستقامة وإضاءة جيدة. قص قسماً واحداً للقوائم ذات الأعمدة أو الأحجام. حوّل HEIC إلى JPEG أولاً.",
                      )}
                    </p>
                    <div className={styles.preview}>
                      {photo ? (
                        <a
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={text(
                            "Open full-size photo",
                            "فتح الصورة بالحجم الكامل",
                          )}
                        >
                          <Image
                            src={photo.url}
                            unoptimized
                            width={1400}
                            height={1000}
                            alt={text(
                              "Menu photo being transcribed",
                              "صورة القائمة قيد القراءة",
                            )}
                          />
                        </a>
                      ) : (
                        <p>
                          {preparing
                            ? text("Preparing photo…", "جارٍ تجهيز الصورة…")
                            : text(
                                "Your menu photo appears here",
                                "ستظهر صورة القائمة هنا",
                              )}
                        </p>
                      )}
                    </div>
                    {file && (
                      <fieldset
                        disabled={locked || !!items.length}
                        className={styles.crop}
                      >
                        <legend>
                          {text(
                            "Rotate & crop before reading",
                            "التدوير والقص قبل القراءة",
                          )}
                        </legend>
                        <button
                          type="button"
                          onClick={() => {
                            setPhoto(null);
                            setPreparing(true);
                            setRotation((r) => (r + 90) % 360);
                            setCrop({ ...FULL_CROP });
                          }}
                        >
                          <RotateCw size={16} />
                          {text("Rotate 90°", "تدوير 90°")}
                        </button>
                        <div className={styles.fields}>
                          {(["left", "top", "width", "height"] as const).map(
                            (field) => (
                              <label key={field}>
                                {
                                  {
                                    left: text("Left %", "من اليسار ٪"),
                                    top: text("Top %", "من الأعلى ٪"),
                                    width: text("Width %", "العرض ٪"),
                                    height: text("Height %", "الارتفاع ٪"),
                                  }[field]
                                }
                                <input
                                  type="number"
                                  min={
                                    field === "left" || field === "top" ? 0 : 5
                                  }
                                  max={100}
                                  value={crop[field]}
                                  onChange={(e) => {
                                    setPhoto(null);
                                    setPreparing(true);
                                    setCrop((c) => ({
                                      ...c,
                                      [field]: Number(e.target.value),
                                    }));
                                  }}
                                />
                              </label>
                            ),
                          )}
                        </div>
                      </fieldset>
                    )}
                    {!!items.length && file && (
                      <button
                        disabled={locked}
                        onClick={() => {
                          if (
                            window.confirm(
                              text(
                                "Clear suggestions to adjust the crop and read again?",
                                "مسح الاقتراحات لتعديل القص وإعادة القراءة؟",
                              ),
                            )
                          ) {
                            setItems([]);
                            setCategories([]);
                            setRawText("");
                            setValidation(false);
                          }
                        }}
                      >
                        {text(
                          "Adjust photo & read again",
                          "تعديل الصورة وإعادة القراءة",
                        )}
                      </button>
                    )}
                    <label>
                      {text("Printed language", "لغة النص")}
                      <select
                        disabled={locked}
                        value={language}
                        onChange={(e) =>
                          setLanguage(e.target.value as typeof language)
                        }
                      >
                        <option value="ara+eng">العربية + English</option>
                        <option value="ara">العربية</option>
                        <option value="eng">English</option>
                      </select>
                    </label>
                    <p className={styles.hint}>
                      {text(
                        "First use downloads recognition models. Photos stay on this device. Automatic translation is not included; enter missing translations during review.",
                        "يتم تنزيل نماذج القراءة أول مرة. تبقى الصور على جهازك. الترجمة التلقائية غير متاحة؛ أكمل الترجمة أثناء المراجعة.",
                      )}
                    </p>
                    {busy ? (
                      <div role="status">
                        <label htmlFor="ocr-progress">
                          {text("Reading menu…", "جارٍ قراءة القائمة…")}{" "}
                          {progress}%
                        </label>
                        <progress
                          id="ocr-progress"
                          max={100}
                          value={progress}
                        />
                        <button onClick={() => abortRef.current?.abort()}>
                          {text("Cancel reading", "إلغاء القراءة")}
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.primary}
                        disabled={
                          !photo || preparing || loading || loadError || locked
                        }
                        onClick={scan}
                      >
                        <ScanText size={18} />
                        {text(
                          items.length ? "Read again" : "Read menu",
                          items.length ? "إعادة القراءة" : "قراءة القائمة",
                        )}
                      </button>
                    )}
                  </section>
                  <section
                    className={styles.review}
                    aria-label={text(
                      "Review extracted items",
                      "مراجعة الأصناف المقروءة",
                    )}
                  >
                    <div className={styles.sectionTitle}>
                      <h3>{text("Review & match", "المراجعة والمطابقة")}</h3>
                      <span>
                        {selectedCount} {text("selected", "محدد")}
                      </span>
                    </div>
                    <p className={styles.notice}>
                      {text(
                        "OCR can miss or misread text. Compare names, prices and calories with the photo. Unlabelled numbers are suggestions only. Do not infer allergens, calories or size prices.",
                        "قد تُخطئ القراءة أو تفوّت نصوصاً. قارن الأسماء والأسعار والسعرات بالصورة. الأرقام غير المسمّاة مجرد اقتراحات. لا تستنتج الحساسية أو السعرات أو أسعار الأحجام.",
                      )}
                    </p>
                    <fieldset
                      disabled={locked}
                      className={styles.categoryPanel}
                    >
                      <legend>
                        {text("Category mapping", "مطابقة التصنيفات")}
                      </legend>
                      {categories.map((c) => (
                        <div key={c.key} className={styles.categoryRow}>
                          <label>
                            {text("Use category", "استخدام تصنيف")}
                            <select
                              value={c.existingId}
                              onChange={(e) => {
                                setCategories((current) =>
                                  current.map((cat) =>
                                    cat.key === c.key
                                      ? { ...cat, existingId: e.target.value }
                                      : cat,
                                  ),
                                );
                                setItems((current) =>
                                  current.map((i) =>
                                    i.categoryKey === c.key
                                      ? { ...i, reviewed: false }
                                      : i,
                                  ),
                                );
                              }}
                            >
                              <option
                                value=""
                                disabled={!can("categories.create")}
                              >
                                {text(
                                  "Create new category",
                                  "إنشاء تصنيف جديد",
                                )}
                              </option>
                              {existing.map((cat) => (
                                <option value={cat.id} key={cat.id}>
                                  {(isRtl ? cat.nameAr : cat.nameEn) ||
                                    cat.name ||
                                    cat.nameAr ||
                                    cat.nameEn}
                                </option>
                              ))}
                            </select>
                          </label>
                          {!c.existingId && (
                            <div className={styles.fields}>
                              <label>
                                {text("Arabic category", "التصنيف بالعربية")}
                                <input
                                  dir="rtl"
                                  maxLength={120}
                                  value={c.nameAr}
                                  onChange={(e) => {
                                    setCategories((current) =>
                                      current.map((cat) =>
                                        cat.key === c.key
                                          ? { ...cat, nameAr: e.target.value }
                                          : cat,
                                      ),
                                    );
                                    setItems((current) =>
                                      current.map((i) =>
                                        i.categoryKey === c.key
                                          ? { ...i, reviewed: false }
                                          : i,
                                      ),
                                    );
                                  }}
                                />
                              </label>
                              <label>
                                {text(
                                  "English category",
                                  "التصنيف بالإنجليزية",
                                )}
                                <input
                                  dir="ltr"
                                  maxLength={120}
                                  value={c.nameEn}
                                  onChange={(e) => {
                                    setCategories((current) =>
                                      current.map((cat) =>
                                        cat.key === c.key
                                          ? { ...cat, nameEn: e.target.value }
                                          : cat,
                                      ),
                                    );
                                    setItems((current) =>
                                      current.map((i) =>
                                        i.categoryKey === c.key
                                          ? { ...i, reviewed: false }
                                          : i,
                                      ),
                                    );
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addCategory()}
                        disabled={categories.length >= 50}
                      >
                        <Plus size={16} />
                        {text("Add category mapping", "إضافة تصنيف للمطابقة")}
                      </button>
                    </fieldset>
                    {!items.length && (
                      <p className={styles.empty}>
                        {text(
                          "Read a photo to see suggestions here. You can also add an item manually.",
                          "اقرأ صورة لعرض الاقتراحات هنا. يمكنك أيضاً إضافة صنف يدوياً.",
                        )}
                      </p>
                    )}
                    {items.map((item, index) => {
                      const errors = itemErrors(item),
                        isDuplicate = duplicate(item);
                      return (
                        <fieldset
                          key={item.key}
                          disabled={locked}
                          className={styles.item}
                        >
                          <legend>
                            {text("Item", "صنف")} {index + 1}
                          </legend>
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  selected: e.target.checked,
                                })
                              }
                            />
                            {text("Include this item", "تضمين هذا الصنف")}
                          </label>
                          <blockquote dir="auto">
                            {item.source ||
                              text("Manually added", "أضيف يدوياً")}
                          </blockquote>
                          {!!item.warnings.length && (
                            <p className={styles.warning}>
                              {text("Check source: ", "راجع المصدر: ")}
                              {item.warnings
                                .map(
                                  (w) =>
                                    ({
                                      text: text(
                                        "uncertain text",
                                        "نص غير واضح",
                                      ),
                                      calories: text(
                                        "ambiguous calories",
                                        "سعرات غير مؤكدة",
                                      ),
                                      prices: text(
                                        "multiple/ambiguous prices",
                                        "أسعار متعددة أو غير مؤكدة",
                                      ),
                                      numbers: text(
                                        "unassigned numbers or units",
                                        "أرقام أو وحدات غير معيّنة",
                                      ),
                                      unlabelled: text(
                                        "price has no currency label",
                                        "السعر بلا رمز عملة",
                                      ),
                                      missingPrice: text(
                                        "price needs review",
                                        "السعر يحتاج مراجعة",
                                      ),
                                    })[w],
                                )
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {isDuplicate && (
                            <p className={styles.error}>
                              {text(
                                "Possible duplicate in this category. Exclude it or correct the name/category.",
                                "تكرار محتمل في هذا التصنيف. استبعده أو صحح الاسم والتصنيف.",
                              )}
                            </p>
                          )}
                          <div className={styles.fields}>
                            {(
                              ["nameAr", "nameEn", "price", "calories"] as const
                            ).map((field) => (
                              <label key={field}>
                                {labelFor(field)}
                                {field === "nameAr" || field === "price"
                                  ? " *"
                                  : ""}
                                <input
                                  id={`${item.key}-${field}`}
                                  dir={field === "nameAr" ? "rtl" : "ltr"}
                                  inputMode={
                                    field === "price"
                                      ? "decimal"
                                      : field === "calories"
                                        ? "numeric"
                                        : undefined
                                  }
                                  maxLength={
                                    field.startsWith("name") ? 120 : 12
                                  }
                                  value={item[field]}
                                  onChange={(e) =>
                                    updateItem(item.key, {
                                      [field]:
                                        field === "price" ||
                                        field === "calories"
                                          ? normalizeDigits(e.target.value)
                                          : e.target.value,
                                    })
                                  }
                                  aria-invalid={
                                    validation &&
                                    item.selected &&
                                    errors.includes(field)
                                  }
                                  aria-describedby={
                                    validation && errors.includes(field)
                                      ? `${item.key}-errors`
                                      : undefined
                                  }
                                />
                              </label>
                            ))}
                          </div>
                          <label>
                            {labelFor("category")} *
                            <select
                              value={item.categoryKey}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  categoryKey: e.target.value,
                                })
                              }
                              aria-invalid={
                                validation && item.selected && !item.categoryKey
                              }
                            >
                              <option value="">
                                {text("Choose a category", "اختر تصنيفاً")}
                              </option>
                              {categories.map((c) => {
                                const matched = existing.find(
                                  (e) => e.id === c.existingId,
                                );
                                return (
                                  <option value={c.key} key={c.key}>
                                    {matched
                                      ? (isRtl
                                          ? matched.nameAr
                                          : matched.nameEn) ||
                                        matched.name ||
                                        matched.nameAr ||
                                        matched.nameEn
                                      : c.nameAr ||
                                        c.nameEn ||
                                        text(
                                          "Unnamed new category",
                                          "تصنيف جديد بلا اسم",
                                        )}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <details>
                            <summary>
                              {text(
                                "Descriptions & line tools",
                                "الوصف وأدوات السطر",
                              )}
                            </summary>
                            <label>
                              {text("Arabic description", "الوصف بالعربية")}
                              <textarea
                                dir="rtl"
                                maxLength={1000}
                                value={item.descriptionAr}
                                onChange={(e) =>
                                  updateItem(item.key, {
                                    descriptionAr: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              {text("English description", "الوصف بالإنجليزية")}
                              <textarea
                                dir="ltr"
                                maxLength={1000}
                                value={item.descriptionEn}
                                onChange={(e) =>
                                  updateItem(item.key, {
                                    descriptionEn: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <button
                              onClick={() => addCategory(item)}
                              disabled={
                                !can("categories.create") ||
                                categories.length >= 50
                              }
                            >
                              {text(
                                "This line is a category heading",
                                "هذا السطر عنوان تصنيف",
                              )}
                            </button>
                            <p className={styles.hint}>
                              {text(
                                "For size variants, add separate rows with the size in the name and confirm each price.",
                                "للأحجام المختلفة، أضف أسطراً منفصلة مع الحجم في الاسم وأكد سعر كل منها.",
                              )}
                            </p>
                          </details>
                          {validation && item.selected && errors.length > 0 && (
                            <p
                              id={`${item.key}-errors`}
                              className={styles.error}
                            >
                              {text("Check: ", "تحقق من: ")}
                              {errors.map(labelFor).join(" · ")}
                            </p>
                          )}
                          <label className={styles.check}>
                            <input
                              type="checkbox"
                              checked={item.reviewed}
                              disabled={
                                !item.selected ||
                                errors.length > 0 ||
                                isDuplicate
                              }
                              onChange={(e) =>
                                updateItem(item.key, {
                                  reviewed: e.target.checked,
                                })
                              }
                            />
                            {text(
                              "I checked the name, price, calories and category against the photo.",
                              "راجعت الاسم والسعر والسعرات والتصنيف مقابل الصورة.",
                            )}
                          </label>
                        </fieldset>
                      );
                    })}
                    <button
                      disabled={locked || items.length >= 100}
                      onClick={() =>
                        setItems((current) => [
                          ...current,
                          {
                            key: crypto.randomUUID(),
                            categoryKey: categories[0]?.key || "",
                            nameAr: "",
                            nameEn: "",
                            descriptionAr: "",
                            descriptionEn: "",
                            price: "",
                            calories: "",
                            source: "",
                            confidence: 0,
                            warnings: [],
                            selected: true,
                            reviewed: false,
                          },
                        ])
                      }
                    >
                      <Plus size={16} />
                      {text("Add missed item", "إضافة صنف لم تتم قراءته")}
                    </button>
                    {rawText && (
                      <details>
                        <summary>
                          {text(
                            "All recognized text — check for missed items",
                            "النص المقروء كاملاً — تحقق من الأصناف المفقودة",
                          )}
                        </summary>
                        <pre dir="auto" className={styles.raw}>
                          {rawText}
                        </pre>
                      </details>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
          <footer className={styles.footer}>
            <button onClick={close} disabled={saving}>
              {text(
                saved !== null ? "Done" : "Close",
                saved !== null ? "تم" : "إغلاق",
              )}
            </button>
            {saved === null && (
              <>
                <button
                  disabled={loading || saving || busy}
                  onClick={() => {
                    setLoading(true);
                    setRefresh((n) => n + 1);
                  }}
                >
                  {text("Refresh menu", "تحديث القائمة")}
                </button>
                <button
                  className={styles.primary}
                  disabled={
                    saving ||
                    busy ||
                    loading ||
                    loadError ||
                    (!pending && !selectedCount) ||
                    !can("menu.create")
                  }
                  onClick={commit}
                >
                  {saving
                    ? text("Importing…", "جارٍ الاستيراد…")
                    : pending
                      ? text("Retry same import", "إعادة نفس الاستيراد")
                      : text(
                          `Import ${selectedCount} reviewed items`,
                          `استيراد ${selectedCount} صنفاً مراجعاً`,
                        )}
                </button>
              </>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
