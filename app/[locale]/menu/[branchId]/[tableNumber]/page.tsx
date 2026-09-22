import { MenuLoader } from "@/components/customer/menu-loader";
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ branchId: string; tableNumber: string }>;
}) {
  const { branchId, tableNumber } = await params;
  return <MenuLoader branchId={branchId} tableNumber={tableNumber} />;
}
