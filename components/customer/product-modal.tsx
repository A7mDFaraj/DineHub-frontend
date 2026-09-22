"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Minus, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { FoodLabels } from "./food-labels";
import { contrastInk } from "@/lib/menu-themes";

export interface ProductAttributeItem {
  attribute: { id: string; labelAr?: string; labelEn?: string };
}
export interface ModalProduct {
  id: string;
  nameAr: string;
  nameEn?: string;
  name?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  attributes?: ProductAttributeItem[];
  calories?: number | null;
  allergens?: string[];
  ingredientTags?: string[];
  dietaryTags?: string[];
}
interface ProductModalProps {
  product: ModalProduct | null;
  isOpen: boolean;
  themeColor?: string;
  onClose: () => void;
  onAddToCart: (item: {
    productId: string;
    nameAr: string;
    nameEn: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    selectedAttributes: string[];
    itemNote?: string;
  }) => void;
}

export function ProductModal({
  product,
  isOpen,
  themeColor = "#a73e2c",
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const ar = useLocale() === "ar";
  const t = useTranslations("CustomerProductModal");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [previous, setPrevious] = useState({ isOpen, product });
  if (previous.isOpen !== isOpen || previous.product !== product) {
    setPrevious({ isOpen, product });
    if (isOpen) {
      setSelectedAttributes([]);
      setItemNote("");
      setQuantity(1);
    }
  }
  if (!product) return null;
  const nameAr = product.nameAr || product.nameEn || product.name || "عنصر";
  const nameEn =
    product.nameEn || product.nameAr || product.name || "Menu item";
  const title = ar ? nameAr : nameEn;
  const description = ar
    ? product.descriptionAr || product.descriptionEn
    : product.descriptionEn || product.descriptionAr;
  const price = Number(product.price);
  const add = () => {
    if (product.isAvailable === false) return;
    onAddToCart({
      productId: product.id,
      nameAr,
      nameEn,
      price,
      quantity,
      imageUrl: product.imageUrl,
      selectedAttributes,
      itemNote: itemNote.trim() || undefined,
    });
    onClose();
  };
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed bottom-0 left-1/2 z-50 flex max-h-[90dvh] w-full max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-white text-stone-900 shadow-2xl sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          dir={ar ? "rtl" : "ltr"}
        >
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-3">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.Close
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-stone-100"
              aria-label={ar ? "إغلاق" : "Close"}
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {product.imageUrl && (
              <img
                src={product.imageUrl}
                alt={title}
                className="h-52 w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-black/10"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div>
              <p className="text-xl font-bold tabular-nums">
                {price.toFixed(2)} <small>{ar ? "ر.س" : "SAR"}</small>
              </p>
              {description && (
                <p className="mt-2 text-sm leading-7 text-stone-600">
                  {description}
                </p>
              )}
              <FoodLabels
                ingredientTags={product.ingredientTags}
                allergens={product.allergens}
                dietaryTags={product.dietaryTags}
                calories={product.calories}
                ar={ar}
              />
            </div>
            {product.attributes && product.attributes.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-sm font-bold">
                  {ar ? "الخيارات والإضافات" : "Options & add-ons"}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {product.attributes.map(({ attribute }) => {
                    const label = ar
                      ? attribute.labelAr || attribute.labelEn || ""
                      : attribute.labelEn || attribute.labelAr || "";
                    const checked = selectedAttributes.includes(label);
                    return (
                      <button
                        type="button"
                        key={attribute.id}
                        aria-pressed={checked}
                        onClick={() =>
                          setSelectedAttributes((current) =>
                            checked
                              ? current.filter((value) => value !== label)
                              : [...current, label],
                          )
                        }
                        className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border p-3 text-start text-xs ${checked ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50"}`}
                      >
                        <span>{label}</span>
                        {checked && <Check size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            <div>
              <label
                htmlFor="product-note"
                className="mb-2 block text-sm font-bold"
              >
                {t("specialNote")}
              </label>
              <textarea
                id="product-note"
                rows={2}
                maxLength={500}
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder={t("notePlaceholder")}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 bg-stone-50 p-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <div className="flex items-center rounded-full border border-stone-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                disabled={quantity === 1}
                className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
                aria-label={ar ? "تقليل الكمية" : "Decrease quantity"}
              >
                <Minus size={16} />
              </button>
              <span className="w-7 text-center font-bold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((v) => Math.min(99, v + 1))}
                disabled={quantity === 99}
                className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
                aria-label={ar ? "زيادة الكمية" : "Increase quantity"}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              type="button"
              disabled={product.isAvailable === false}
              onClick={add}
              style={{
                backgroundColor: themeColor,
                color: contrastInk(themeColor),
              }}
              className="flex min-h-12 flex-1 flex-wrap items-center justify-center gap-2 rounded-full px-4 text-sm font-bold active:scale-[0.96]"
            >
              <span>{t("addToCart")}</span>
              <span className="tabular-nums">
                {(price * quantity).toFixed(2)} {ar ? "ر.س" : "SAR"}
              </span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
