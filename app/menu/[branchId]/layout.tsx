import { CartDrawer } from "@/components/customer/cart-drawer";

interface BranchLayoutProps {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}

export default async function BranchLayout({ children, params }: BranchLayoutProps) {
  const resolvedParams = await params;

  return (
    <div 
      className="min-h-screen bg-[#faf8f5] text-[#1c1917] font-sans antialiased relative selection:bg-[#f2644b]/20"
      dir="rtl"
      style={{
        fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif",
      }}
    >
      {/* Soft warm appetizing ambient light */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-60 bg-[radial-gradient(ellipse_at_top,_rgba(254,243,199,0.6),_transparent_75%)]" 
        aria-hidden="true" 
      />
      
      <main className="relative z-10 max-w-xl mx-auto w-full px-3.5 sm:px-4 py-3 sm:py-5 box-border">
        {children}
      </main>

      <CartDrawer branchId={resolvedParams.branchId} />
    </div>
  );
}
