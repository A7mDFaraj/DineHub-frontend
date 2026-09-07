import type { Metadata } from "next";
import { AccountPasswordView } from "@/components/auth/account-password-view";

export const metadata: Metadata = {
  title: "أمان الحساب وإعداد كلمة المرور",
  description: "عيّن كلمة المرور الخاصة بمنشأتك لتأمين الوصول إلى لوحة التحكم ومركز العمليات.",
};

export default function AccountPasswordPage() {
  return <AccountPasswordView />;
}
