import { MenuLoader } from "@/components/customer/menu-loader";
export default async function BranchMenuPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  return <MenuLoader branchId={branchId} />;
}
