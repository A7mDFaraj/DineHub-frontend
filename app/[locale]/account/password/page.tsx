import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountPasswordView } from "@/components/auth/account-password-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountPassword" });
  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
  };
}

export default function AccountPasswordPage() {
  return <AccountPasswordView />;
}
