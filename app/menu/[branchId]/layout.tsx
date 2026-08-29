import { redirect } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { CartDrawer } from "@/components/customer/cart-drawer";

interface BranchLayoutProps {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}

export default async function BranchLayout({ children, params }: BranchLayoutProps) {
  const resolvedParams = await params;
  
  // Here we would fetch branch settings for theming
  // e.g. const { data: branch } = await apiClient.get(`/branches/${resolvedParams.branchId}`);
  // For MVP, we mock some settings or rely on globals if backend isn't returning colors yet
  
  const primaryColor = "#d4af37"; // Mocking gold
  
  return (
    <div 
      className="min-h-screen relative flex flex-col pb-20"
      style={{
        // We can inject CSS variables based on branch settings here
        // "--color-primary-500": primaryColor,
      } as React.CSSProperties}
    >
      <main className="flex-1 max-w-2xl mx-auto w-full p-4">
        {children}
      </main>
      <CartDrawer branchId={resolvedParams.branchId} />
    </div>
  );
}
