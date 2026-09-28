"use client";
import { Check } from "lucide-react";
import {
  MENU_THEMES,
  menuThemeStyle,
  type MenuAppearance,
} from "@/lib/menu-themes";
import {
  CelebrationArt,
  CelebrationBanner,
} from "@/components/customer/celebration-banner";
import { FoodLabels } from "@/components/customer/food-labels";
import styles from "@/components/customer/menu-experience.module.css";

export function MenuThemeSettings({
  value,
  onChange,
  ar,
}: {
  value: MenuAppearance;
  onChange: (value: MenuAppearance) => void;
  ar: boolean;
}) {
  return (
    <div className={styles.themePicker}>
      <div
        className={styles.themeGrid}
        role="group"
        aria-label={ar ? "اختيار مظهر القائمة" : "Choose menu theme"}
      >
        {MENU_THEMES.map((theme) => (
          <button
            type="button"
            key={theme.id}
            style={menuThemeStyle({ menuTheme: theme.id })}
            className={styles.themeOption}
            aria-pressed={(value.menuTheme || "signature") === theme.id}
            onClick={() => onChange({ ...value, menuTheme: theme.id })}
          >
            {(value.menuTheme || "signature") === theme.id && (
              <Check className={styles.selected} size={24} aria-hidden="true" />
            )}
            <div className={styles.themeThumb}>
              <CelebrationArt theme={theme.id} />
            </div>
            <strong>{ar ? theme.ar : theme.en}</strong>
            <small>{ar ? theme.descriptionAr : theme.description}</small>
          </button>
        ))}
      </div>
      <div className={styles.discountControl}>
        <label>
          <input
            type="checkbox"
            checked={value.showSpecialDiscount ?? false}
            onChange={(e) =>
              onChange({
                ...value,
                showSpecialDiscount: e.target.checked,
                discountPercent: value.discountPercent || 10,
              })
            }
          />
          {ar ? "إظهار وتطبيق خصم خاص" : "Show and apply a special discount"}
        </label>
        <label htmlFor="menu-discount">
          {ar ? "نسبة الخصم (%)" : "Discount (%)"}
          <input
            id="menu-discount"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            disabled={!value.showSpecialDiscount}
            value={value.discountPercent || ""}
            onChange={(e) =>
              onChange({
                ...value,
                discountPercent:
                  e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
        </label>
        <p>
          {ar
            ? "يُطبق على جميع أطباق الفرع ويظهر في الأسعار والسلة والطلب. إلغاء الاختيار يوقف الخصم ويُبقي مظهر المناسبة. فعّل المظهر عند بداية المناسبة وأوقفه عند انتهائها."
            : "Applies to every item in this branch, including menu prices, cart totals, and orders. Uncheck to stop the discount while keeping the theme. Activate and end each occasion manually."}
        </p>
      </div>
    </div>
  );
}

export function MenuThemePreview({
  value,
  ar,
  name,
}: {
  value: MenuAppearance;
  ar: boolean;
  name: string;
}) {
  const discount =
    value.showSpecialDiscount &&
    Number.isInteger(value.discountPercent) &&
    value.discountPercent! > 0 &&
    value.discountPercent! <= 100
      ? value.discountPercent!
      : 0;
  return (
    <div
      className={styles.preview}
      style={menuThemeStyle(value)}
      dir={ar ? "rtl" : "ltr"}
    >
      <p className={styles.eyebrow}>{ar ? "معاينة مباشرة" : "LIVE PREVIEW"}</p>
      <h3 style={{ marginBottom: 14, fontWeight: 650 }}>{name || "DineHub"}</h3>
      <CelebrationBanner appearance={value} ar={ar} />

      {/* Brand Accent Category Tabs */}
      <div style={{ display: "flex", gap: "8px", margin: "16px 0 14px", overflowX: "auto", paddingBottom: "2px" }}>
        <span
          style={{
            background: "var(--menu-accent)",
            color: "var(--menu-on-accent)",
            padding: "5px 12px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 650,
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.14)",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          {ar ? "الكل" : "All"}
        </span>
        <span
          style={{
            background: "var(--menu-surface)",
            color: "var(--menu-muted)",
            border: "1px solid var(--menu-border)",
            padding: "5px 12px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {ar ? "المقبلات" : "Starters"}
        </span>
        <span
          style={{
            background: "var(--menu-surface)",
            color: "var(--menu-muted)",
            border: "1px solid var(--menu-border)",
            padding: "5px 12px",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {ar ? "الأطباق الرئيسية" : "Mains"}
        </span>
      </div>

      <div className={styles.sectionHead} style={{ marginTop: 12 }}>
        <h3>{ar ? "من المطبخ" : "From the kitchen"}</h3>
      </div>
      <article className={styles.product} style={{ borderBottom: 0 }}>
        <div className={styles.productBody}>
          <div className={styles.productTitle}>
            <h4>{ar ? "سلطة الحلوم المشوي" : "Grilled halloumi salad"}</h4>
            <div className={styles.price}>
              {discount > 0 && <del>48.00</del>}
              <span style={{ color: "var(--menu-accent)", fontWeight: 700 }}>
                {((48 * (100 - discount)) / 100).toFixed(2)}{" "}
                <small>{ar ? "ر.س" : "SAR"}</small>
              </span>
            </div>
          </div>
          <p className={styles.description}>
            {ar
              ? "حلوم مشوي، أوراق خضراء وطماطم كرزية."
              : "Golden halloumi, garden greens, and cherry tomatoes."}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
            <FoodLabels
              allergens={["milk"]}
              dietaryTags={["vegetarian"]}
              calories={320}
              ar={ar}
            />
            <button
              type="button"
              style={{
                background: "var(--menu-accent)",
                color: "var(--menu-on-accent)",
                border: "none",
                borderRadius: "8px",
                padding: "5px 14px",
                fontSize: "0.75rem",
                fontWeight: 650,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.12)",
              }}
            >
              + {ar ? "إضافة" : "Add"}
            </button>
          </div>
        </div>
      </article>

      {/* Floating Mini Cart Bar */}
      <div
        style={{
          marginTop: "16px",
          padding: "10px 14px",
          borderRadius: "14px",
          background: "var(--menu-accent)",
          color: "var(--menu-on-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.8rem",
          fontWeight: 650,
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.16)",
        }}
      >
        <span>1 {ar ? "طبق في السلة" : "item in cart"}</span>
        <span>
          {((48 * (100 - discount)) / 100).toFixed(2)} {ar ? "ر.س" : "SAR"} • {ar ? "عرض السلة ←" : "View Cart →"}
        </span>
      </div>

      <p style={{ fontSize: 11, color: "var(--menu-muted)", marginTop: "14px", textAlign: "center" }}>
        {ar ? "طبق تجريبي للمعاينة فقط" : "Sample dish for preview only"}
      </p>
    </div>
  );
}
