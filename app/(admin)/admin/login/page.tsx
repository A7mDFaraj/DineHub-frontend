import type { Metadata } from "next";
import { AdminAuthScreen } from "./admin-auth-screen";

export const metadata: Metadata = {
  title: "دخول الإدارة",
  description: "سجّل الدخول أو أنشئ حساب DineHub لإدارة فروعك وقوائمك وطلباتك.",
};

export default function AdminLoginPage() {
  return <AdminAuthScreen />;
}
