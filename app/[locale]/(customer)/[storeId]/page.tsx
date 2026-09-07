import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function CustomerStoreCatchAll({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const locale = await getLocale();
  redirect({ href: `/menu/${storeId}`, locale });
}
