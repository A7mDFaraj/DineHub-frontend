import { notFound } from "next/navigation";
import { MenuPreviewClient } from "@/components/customer/menu-preview-client";
export default function MenuPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MenuPreviewClient />;
}
