"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MapPin,
  Phone,
  Plus,
  Search,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { menuThemeStyle, getMenuTheme } from "@/lib/menu-themes";
import type { PublicMenu, MenuProduct } from "@/lib/menu-types";
import { useCartStore } from "@/store/cart-store";
import { CelebrationBanner } from "./celebration-banner";
import { FoodLabels } from "./food-labels";
import { ProductModal } from "./product-modal";
import { CartDrawer } from "./cart-drawer";
import styles from "./menu-experience.module.css";

export function MenuImage({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.productImage}>
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <UtensilsCrossed size={30} strokeWidth={1} aria-label={name} />
      )}
    </div>
  );
}

export function MenuExperience({
  menu,
  table,
  tableError,
  onRetry,
  preview = false,
}: {
  menu: PublicMenu;
  table?: { id: string; number: number };
  tableError?: string;
  onRetry?: () => void;
  preview?: boolean;
}) {
  const ar = useLocale() === "ar";
  const t = useTranslations("CustomerMenu");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selected, setSelected] = useState<MenuProduct | null>(null);
  const { items, addItem } = useCartStore();
  const { branch, categories } = menu;
  const name = (value: { name?: string; nameAr?: string; nameEn?: string }) =>
    ar
      ? value.nameAr || value.name || value.nameEn || ""
      : value.nameEn || value.name || value.nameAr || "";
  const branchName = name(branch) || "DineHub";
  const theme = getMenuTheme(branch.menuTheme);
  const accent =
    theme.id === "signature" && /^#[0-9a-f]{6}$/i.test(branch.themeColor ?? "")
      ? branch.themeColor!
      : theme.accent;
  const q = query.trim().toLocaleLowerCase();
  const filtered = categories
    .filter((category) => categoryId === "all" || category.id === categoryId)
    .map((category) => ({
      ...category,
      products: category.products.filter(
        (product) =>
          !q ||
          [
            product.name,
            product.nameAr,
            product.nameEn,
            product.descriptionAr,
            product.descriptionEn,
          ].some((v) => v?.toLocaleLowerCase().includes(q)),
      ),
    }))
    .filter((category) => category.products.length);

  return (
    <div
      className={styles.page}
      style={menuThemeStyle(branch)}
      dir={ar ? "rtl" : "ltr"}
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            {branch.logoUrl ? (
              <img
                className={styles.logo}
                src={branch.logoUrl}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Store
                className={styles.logo}
                style={{ padding: 13 }}
                aria-hidden="true"
              />
            )}
            <div>
              <h1>{branchName}</h1>
              {branch.address && (
                <p>
                  <MapPin size={12} aria-hidden="true" />
                  {branch.address}
                </p>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            <AdminLanguageSwitcher variant="light" />
            {table && (
              <div className={styles.table}>
                {t("table")}
                <b>{String(table.number).padStart(2, "0")}</b>
              </div>
            )}
          </div>
        </header>
        <CelebrationBanner appearance={branch} ar={ar} />
        <div className={styles.toolbar}>
          <div>
            <h2>{ar ? "على ذوقك" : "Find your favourite."}</h2>
            <p>
              {table
                ? ar
                  ? "اختر طبقك، وخلي الباقي علينا."
                  : "Made to order. Enjoyed at your table."
                : t("digitalMenuDesc")}
            </p>
          </div>
          <div className={styles.search}>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label={t("searchPlaceholder")}
              placeholder={t("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label={ar ? "مسح البحث" : "Clear search"}
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        {categories.length > 0 && (
          <nav
            className={styles.categories}
            aria-label={ar ? "أقسام القائمة" : "Menu categories"}
          >
            {[{ id: "all", name: t("all") }, ...categories].map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {name(category)}
              </button>
            ))}
          </nav>
        )}
        {tableError && (
          <div className={styles.notice} role="alert">
            {tableError}{" "}
            <button type="button" className={styles.add} onClick={onRetry}>
              {ar ? "إعادة المحاولة" : "Try again"}
            </button>
          </div>
        )}
        {filtered.length === 0 ? (
          <div className={styles.empty} role="status">
            <UtensilsCrossed size={36} strokeWidth={1} />
            <h3>{q ? t("noMatchingItems") : t("emptyBranchMenu")}</h3>
            {q && (
              <button
                type="button"
                className={styles.add}
                onClick={() => {
                  setQuery("");
                  setCategoryId("all");
                }}
              >
                {ar ? "عرض القائمة كاملة" : "Show the full menu"}
              </button>
            )}
          </div>
        ) : (
          filtered.map((category) => (
            <section className={styles.section} key={category.id}>
              <div className={styles.sectionHead}>
                <h3>{name(category)}</h3>
                <span>{String(category.products.length).padStart(2, "0")}</span>
              </div>
              <div className={styles.grid}>
                {category.products.map((product) => {
                  const quantity = table
                    ? items
                        .filter((item) => item.productId === product.id)
                        .reduce((sum, item) => sum + item.quantity, 0)
                    : 0;
                  const description = ar
                    ? product.descriptionAr || product.descriptionEn
                    : product.descriptionEn || product.descriptionAr;
                  return (
                    <article className={styles.product} key={product.id}>
                      <MenuImage
                        key={product.imageUrl}
                        src={product.imageUrl}
                        name={name(product)}
                      />
                      <div className={styles.productBody}>
                        <div className={styles.productTitle}>
                          <h4>{name(product)}</h4>
                          <div className={styles.price}>
                            {Number(product.originalPrice) >
                              Number(product.price) && (
                              <del>
                                {Number(product.originalPrice).toFixed(2)}
                              </del>
                            )}
                            {Number(product.price).toFixed(2)}{" "}
                            <small>{t("currency")}</small>
                          </div>
                        </div>
                        {description && (
                          <p className={styles.description}>{description}</p>
                        )}
                        <FoodLabels
                          ingredientTags={product.ingredientTags}
                          allergens={product.allergens}
                          dietaryTags={product.dietaryTags}
                          calories={product.calories}
                          ar={ar}
                        />
                        <div className={styles.productFooter}>
                          {quantity > 0 && (
                            <small aria-live="polite">
                              {quantity} {ar ? "في السلة" : "in your order"}
                            </small>
                          )}
                          {table ? (
                            <button
                              className={styles.add}
                              type="button"
                              disabled={product.isAvailable === false}
                              aria-label={`${ar ? "إضافة" : "Add"} ${name(product)}`}
                              onClick={() => setSelected(product)}
                            >
                              {product.isAvailable === false ? (
                                t("unavailable")
                              ) : (
                                <>
                                  {ar ? "إضافة" : "Add"}
                                  <Plus size={15} aria-hidden="true" />
                                </>
                              )}
                            </button>
                          ) : (
                            product.isAvailable === false && (
                              <small>{t("unavailable")}</small>
                            )
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
        <footer className={styles.footer}>
          <p>
            {ar
              ? "للاستفسار عن المكونات أو الحساسية، يرجى سؤال فريقنا."
              : "Questions about ingredients or allergies? Please ask our team."}
          </p>
          {branch.phone && (
            <a href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`}>
              <Phone size={13} aria-hidden="true" />
              {branch.phone}
            </a>
          )}
          <span>
            {ar ? "بكل حب، عبر" : "Thoughtfully served with"} <b>DineHub</b>
          </span>
        </footer>
      </div>
      {table && (
        <>
          <ProductModal
            product={selected}
            isOpen={Boolean(selected)}
            onClose={() => setSelected(null)}
            themeColor={accent}
            onAddToCart={addItem}
          />
          <CartDrawer
            branchId={branch.id}
            tableId={table.id}
            themeColor={accent}
            preview={preview}
          />
        </>
      )}
    </div>
  );
}
