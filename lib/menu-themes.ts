import type { CSSProperties } from "react";

export const MENU_THEMES = [
  {
    id: "signature",
    en: "DineHub Signature",
    ar: "هوية داين هب",
    tagline: "Good food. Great company.",
    taglineAr: "أطيب الأطباق، وأجمل اللمّات",
    description: "Warm ivory & terracotta",
    descriptionAr: "عاجي دافئ ولمسات فخارية",
    background: "#faf7f0",
    surface: "#ffffff",
    text: "#272820",
    muted: "#69695e",
    border: "#e3dfd4",
    accent: "#a73e2c",
    hero: "#283c30",
    heroText: "#fff9e9",
    ornament: "#bfcdad",
  },
  {
    id: "charcoal",
    en: "Charcoal Table",
    ar: "مائدة الفحم",
    tagline: "A little fire. A lot of flavour.",
    taglineAr: "نكهة تستحق التجربة",
    description: "Midnight charcoal & antique gold",
    descriptionAr: "فحمي عميق وذهبي عتيق",
    background: "#141511",
    surface: "#1d1f19",
    text: "#f5f1e7",
    muted: "#b8b9aa",
    border: "#393b30",
    accent: "#dac28a",
    hero: "#20291f",
    heroText: "#fff8e5",
    ornament: "#b39c65",
  },
  {
    id: "national-day",
    en: "Saudi National Day",
    ar: "اليوم الوطني السعودي",
    tagline: "Our home. Our table.",
    taglineAr: "دارنا تجمعنا",
    description: "Palm green & sunlit gold · 23 September",
    descriptionAr: "أخضر النخيل وذهبي الشمس · ٢٣ سبتمبر",
    background: "#f3f6ed",
    surface: "#ffffff",
    text: "#18372a",
    muted: "#566657",
    border: "#d5e0cf",
    accent: "#216044",
    hero: "#123e2b",
    heroText: "#fff8dc",
    ornament: "#d4c284",
  },
  {
    id: "founding-day",
    en: "Founding Day",
    ar: "يوم التأسيس",
    tagline: "Rooted in generosity.",
    taglineAr: "جذورنا كرم",
    description: "Najdi earth & woven heritage · 22 February",
    descriptionAr: "ألوان نجد ونقوش التراث · ٢٢ فبراير",
    background: "#f4ecdf",
    surface: "#fffbf3",
    text: "#443326",
    muted: "#74604d",
    border: "#ddcbb5",
    accent: "#805137",
    hero: "#49392c",
    heroText: "#fff0d6",
    ornament: "#d3ae7d",
  },
  {
    id: "ramadan",
    en: "Ramadan Nights",
    ar: "ليالي رمضان",
    tagline: "Gather for the good things.",
    taglineAr: "لمة خير",
    description: "Indigo nights & lantern gold",
    descriptionAr: "ليالي نيليّة ووهج الفوانيس",
    background: "#f5f3fa",
    surface: "#ffffff",
    text: "#302c48",
    muted: "#6a647d",
    border: "#ded9e9",
    accent: "#514477",
    hero: "#29233f",
    heroText: "#fff2d8",
    ornament: "#d6b879",
  },
  {
    id: "eid",
    en: "Eid Gathering",
    ar: "فرحة العيد",
    tagline: "Joy tastes better together.",
    taglineAr: "عيدنا أحلى بجمعتنا",
    description: "Garden teal & festive florals",
    descriptionAr: "أخضر الحدائق وزهور البهجة",
    background: "#f2f8f5",
    surface: "#ffffff",
    text: "#24473f",
    muted: "#577268",
    border: "#d0e3d9",
    accent: "#286657",
    hero: "#254e44",
    heroText: "#fff4e3",
    ornament: "#e2bba3",
  },
] as const;

export type MenuThemeId = (typeof MENU_THEMES)[number]["id"];
export interface MenuAppearance {
  menuTheme?: string;
  showSpecialDiscount?: boolean;
  discountPercent?: number;
  themeColor?: string;
}
export function getMenuTheme(id?: string) {
  return MENU_THEMES.find((theme) => theme.id === id) ?? MENU_THEMES[0];
}
export function contrastInk(hex: string) {
  const rgb = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((v) => parseInt(v, 16) / 255) ?? [0, 0, 0];
  const [r, g, b] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#111111" : "#ffffff";
}
export function menuThemeStyle(appearance: MenuAppearance): CSSProperties {
  const theme = getMenuTheme(appearance.menuTheme);
  const accent =
    theme.id === "signature" &&
    /^#[0-9a-f]{6}$/i.test(appearance.themeColor ?? "")
      ? appearance.themeColor!
      : theme.accent;
  return {
    "--menu-bg": theme.background,
    "--menu-surface": theme.surface,
    "--menu-text": theme.text,
    "--menu-muted": theme.muted,
    "--menu-border": theme.border,
    "--menu-accent": accent,
    "--menu-on-accent": contrastInk(accent),
    "--menu-hero": theme.hero,
    "--menu-hero-text": theme.heroText,
    "--menu-ornament": theme.ornament,
  } as CSSProperties;
}
export function activeDiscount(appearance: MenuAppearance) {
  const value = appearance.discountPercent;
  return appearance.showSpecialDiscount &&
    Number.isInteger(value) &&
    value! > 0 &&
    value! <= 100
    ? value!
    : 0;
}
