import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminAuthScreen } from "./admin-auth-screen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminLogin" });

  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
  };
}

export default function AdminLoginPage() {
  return <AdminAuthScreen />;
}
