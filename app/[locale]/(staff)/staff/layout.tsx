"use client";
import { PasswordChangeScreen } from "@/components/auth/password-change-screen";

import { AccessProvider, useAccess } from "@/lib/access-context";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Radio } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEffect, useState } from "react";

function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { access, can, loading: accessLoading } = useAccess();
  const { data: session, isPending } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin/login");
    }
  }, [isPending, router, session]);

  if (isPending || !session || accessLoading) {
    return (
      <div className="min-h-screen bg-[#130d1b] flex flex-col items-center justify-center gap-3 text-white">
        <LoadingSpinner size={36} />
        <p className="text-xs text-zinc-400 animate-pulse">
          جارٍ التحقق من الجلسة…
        </p>
      </div>
    );
  }

  if (access?.mustChangePassword) return <PasswordChangeScreen forced expiresAt={access.temporaryPasswordExpiresAt} businessName={access.businessName} />;

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[#110b17] text-[#fffdf9] font-sans antialiased"
      dir="rtl"
      style={{
        fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif",
      }}
    >
      {/* Sleek Operations Header */}
      <header className="h-16 border-b border-white/[0.08] bg-[#1a1222]/90 backdrop-blur-xl px-4 sm:px-6 sticky top-0 z-50 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f2644b]/20 border border-[#f2644b]/30 text-[#ff9d8c] flex items-center justify-center font-bold">
            <Radio size={16} className="text-[#ff9d8c]" />
          </div>
          <span className="font-extrabold text-base sm:text-lg text-white">
            شاشة الطلبات المباشرة
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-xl text-xs text-zinc-300">
            <User size={13} className="text-zinc-400" />
            <span className="font-bold truncate max-w-[120px] sm:max-w-none">
              {session?.user?.name || "طاقم الخدمة"}
            </span>
          </div>

          <Link href="/account/password" className="p-3 text-sm">أمان الحساب</Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-300 border border-white/[0.08] flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 box-border">
        {can("orders.read") ? (
          children
        ) : (
          <p role="alert">ليس لديك صلاحية لعرض العمليات.</p>
        )}
      </main>
    </div>
  );
}

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccessProvider>
      <StaffShell>{children}</StaffShell>
    </AccessProvider>
  );
}
