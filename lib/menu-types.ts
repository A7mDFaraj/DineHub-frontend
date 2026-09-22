import type { MenuAppearance } from "./menu-themes";
import type { ModalProduct } from "@/components/customer/product-modal";
export interface MenuBranch extends MenuAppearance {
  id: string;
  publicCode?: string;
  name?: string;
  nameAr?: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}
export interface MenuProduct extends ModalProduct {
  originalPrice?: number | string;
  calories?: number | null;
  allergens?: string[];
  ingredientTags?: string[];
  dietaryTags?: string[];
}
export interface MenuCategory {
  id: string;
  name?: string;
  nameAr?: string;
  nameEn?: string;
  products: MenuProduct[];
}
export interface PublicMenu {
  branch: MenuBranch;
  categories: MenuCategory[];
}
