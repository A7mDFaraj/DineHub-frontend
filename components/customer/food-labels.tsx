import {
  Milk,
  Egg,
  Wheat,
  Fish,
  Shrimp,
  Nut,
  Bean,
  Leaf,
  Flame,
  CircleDot,
  Shell,
  FlaskConical,
  Citrus,
  Flower2,
  Circle,
  Droplet,
  Vegan,
} from "lucide-react";
import styles from "./menu-experience.module.css";

export const FOOD_LABELS = {
  honey: { en: "Honey", ar: "عسل", icon: Droplet },
  citrus: { en: "Citrus", ar: "حمضيات", icon: Citrus },
  garlic: { en: "Garlic", ar: "ثوم", icon: Flower2 },
  onion: { en: "Onion", ar: "بصل", icon: Circle },
  truffle: { en: "Truffle", ar: "كمأة", icon: CircleDot },
  milk: { en: "Milk", ar: "حليب", icon: Milk },
  eggs: { en: "Eggs", ar: "بيض", icon: Egg },
  gluten: { en: "Cereals containing gluten", ar: "حبوب تحتوي على الغلوتين", icon: Wheat },
  fish: { en: "Fish", ar: "سمك", icon: Fish },
  shellfish: { en: "Crustaceans", ar: "قشريات", icon: Shrimp },
  nuts: { en: "Tree nuts", ar: "مكسرات", icon: Nut },
  peanuts: { en: "Peanuts", ar: "فول سوداني", icon: Bean },
  soy: { en: "Soy", ar: "صويا", icon: Bean },
  sesame: { en: "Sesame", ar: "سمسم", icon: CircleDot },
  mustard: { en: "Mustard", ar: "خردل", icon: CircleDot },
  celery: { en: "Celery", ar: "كرفس", icon: Leaf },
  sulphites: {
    en: "Sulphites",
    ar: "ثاني أكسيد الكبريت والكبريتيت",
    icon: FlaskConical,
  },
  lupin: { en: "Lupin", ar: "ترمس", icon: Bean },
  molluscs: { en: "Molluscs", ar: "رخويات", icon: Shell },
  vegetarian: { en: "Vegetarian", ar: "نباتي", icon: Leaf },
  vegan: { en: "Vegan", ar: "نباتي صرف", icon: Vegan },
  spicy: { en: "Spicy", ar: "حار", icon: Flame },
} as const;
export const ALLERGEN_KEYS = Object.keys(FOOD_LABELS).filter(
  (key) =>
    ![
      "vegetarian",
      "vegan",
      "spicy",
      "honey",
      "citrus",
      "garlic",
      "onion",
      "truffle",
    ].includes(key),
);
export const INGREDIENT_KEYS = [
  "honey",
  "citrus",
  "garlic",
  "onion",
  "truffle",
];
export const DIETARY_KEYS = ["vegetarian", "vegan", "spicy"];
export function FoodLabels({
  allergens = [],
  dietaryTags = [],
  ingredientTags = [],
  calories,
  ar = false,
}: {
  allergens?: string[];
  dietaryTags?: string[];
  ingredientTags?: string[];
  calories?: number | null;
  ar?: boolean;
}) {
  return (
    <div className={styles.foodLabels}>
      {calories != null && (
        <span className={styles.calories}>
          {calories} {ar ? "سعرة حرارية" : "kcal"}
        </span>
      )}
      {[...new Set([...allergens, ...ingredientTags, ...dietaryTags])].map(
        (key) => {
          const entry = FOOD_LABELS[key as keyof typeof FOOD_LABELS];
          if (!entry) return null;
          const Icon = entry.icon;
          const label = ar ? entry.ar : entry.en;
          return (
            <span
              key={key}
              className={styles.foodLabel}
              title={
                allergens.includes(key)
                  ? `${ar ? "يحتوي على" : "Contains"} ${label}`
                  : label
              }
            >
              <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </span>
          );
        },
      )}
    </div>
  );
}
