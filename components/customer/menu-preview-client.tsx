"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { MenuExperience } from "./menu-experience";
import {
  MenuThemeSettings,
  MenuThemePreview,
} from "@/components/admin/menu-theme-settings";
import type { MenuAppearance } from "@/lib/menu-themes";
import { activeDiscount } from "@/lib/menu-themes";
import type { PublicMenu } from "@/lib/menu-types";
import { useCartStore } from "@/store/cart-store";

// Development-only visual fixture. This page never submits orders or modifies a branch.
export function MenuPreviewClient() {
  const ar = useLocale() === "ar";
  const [appearance, setAppearance] = useState<MenuAppearance>({
    menuTheme: "signature",
    showSpecialDiscount: false,
    discountPercent: 20,
  });
  const discount = activeDiscount(appearance);
  const menu: PublicMenu = {
    branch: {
      id: "preview",
      nameEn: "The Gathering Table",
      nameAr: "مائدة اللمة",
      address: ar ? "حي النخيل، الرياض" : "Al Nakheel, Riyadh",
      ...appearance,
    },
    categories: [
      {
        id: "starters",
        nameEn: "For the table",
        nameAr: "للمشاركة",
        products: [
          {
            id: "salad",
            nameAr: "سلطة الحلوم المشوي",
            nameEn: "Grilled halloumi salad",
            descriptionEn:
              "Golden halloumi, garden greens, cherry tomatoes, and a bright citrus dressing.",
            descriptionAr:
              "حلوم مشوي، أوراق خضراء، طماطم كرزية وتتبيلة الحمضيات.",
            price: 48,
            calories: 320,
            allergens: ["milk"],
            dietaryTags: ["vegetarian"],
            ingredientTags: ["citrus"],
            imageUrl:
              "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80",
          },
          {
            id: "corn",
            nameAr: "ذرة مشوية بالعسل",
            nameEn: "Charred corn & honey",
            descriptionEn:
              "Sweet grilled corn, crumbled feta, herbs, and a drizzle of honey.",
            descriptionAr: "ذرة مشوية، جبن فيتا، أعشاب طازجة ولمسة عسل.",
            price: 36,
            calories: 285,
            allergens: ["milk"],
            ingredientTags: ["honey"],
            dietaryTags: ["vegetarian"],
          },
          {
            id: "prawns",
            nameAr: "روبيان حار",
            nameEn: "Chilli king prawns",
            descriptionEn:
              "Pan-seared prawns with garlic, fresh lime, and a little heat.",
            descriptionAr: "روبيان مشوح بالثوم والليمون ولمسة حارة.",
            price: 64,
            calories: 420,
            allergens: ["shellfish"],
            dietaryTags: ["spicy"],
            ingredientTags: ["garlic"],
          },
          {
            id: "bowl",
            nameAr: "طبق الحديقة",
            nameEn: "The garden bowl",
            descriptionEn:
              "Seasonal greens, roasted vegetables, toasted sesame, and lemon tahini.",
            descriptionAr: "خضار موسمية ومشوية، سمسم محمص وطحينة بالليمون.",
            price: 42,
            calories: 360,
            allergens: ["sesame"],
            dietaryTags: ["vegan"],
            imageUrl:
              "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80",
          },
        ],
      },
      {
        id: "drinks",
        nameEn: "Something refreshing",
        nameAr: "مشروبات منعشة",
        products: [
          {
            id: "coffee",
            nameAr: "قهوة سعودية",
            nameEn: "Saudi coffee",
            price: 18,
            descriptionEn: "A warm welcome, poured with cardamom.",
            descriptionAr: "ترحيبة دافئة بنكهة الهيل.",
          },
        ],
      },
    ].map((category) => ({
      ...category,
      products: category.products.map((product) => ({
        ...product,
        originalPrice: product.price,
        price: Math.round(product.price * (100 - discount)) / 100,
      })),
    })),
  };
  return (
    <>
      <details style={{ background: "#fff", color: "#272820", padding: 20 }}>
        <summary style={{ cursor: "pointer", minHeight: 44 }}>
          {ar
            ? "معاينة تصميم محلية — إعدادات المظهر"
            : "Local design preview — theme settings"}
        </summary>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 24,
            maxWidth: 1100,
            margin: "20px auto",
          }}
        >
          <MenuThemeSettings
            value={appearance}
            onChange={(value) => {
              setAppearance(value);
              useCartStore.getState().clearCart();
            }}
            ar={ar}
          />
          <MenuThemePreview
            value={appearance}
            ar={ar}
            name={ar ? "مائدة اللمة" : "The Gathering Table"}
          />
        </div>
      </details>
      <button
        type="button"
        style={{
          background: "#fff",
          color: "#272820",
          minHeight: 44,
          padding: "8px 20px",
        }}
        onClick={() => {
          useCartStore.getState().setContext("local-preview");
          useCartStore.getState().clearCart();
        }}
      >
        {ar ? "مسح سلة المعاينة" : "Clear preview cart"}
      </button>
      <MenuExperience
        menu={menu}
        table={{ id: "preview-table", number: 4 }}
        preview
      />
    </>
  );
}
