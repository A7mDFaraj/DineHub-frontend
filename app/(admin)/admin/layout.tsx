"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu as MenuIcon, QrCode, Settings, LogOut, Store, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Branches", href: "/admin/branches", icon: Store },
  { name: "Categories", href: "/admin/categories", icon: Tags },
  { name: "Products", href: "/admin/menu", icon: MenuIcon },
  { name: "QR Code", href: "/admin/qr-code", icon: QrCode },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4">
      {/* Sidebar */}
      <aside className="w-64 glass-panel flex flex-col justify-between hidden md:flex rounded-2xl relative z-10">
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="font-bold text-black text-2xl font-outfit">D</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-outfit">DineHub</span>
          </div>
          
          <nav className="mt-8 px-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                    isActive 
                      ? "bg-primary-500/10 text-primary-500 border border-primary-500/20 shadow-inner" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-300", 
                    !isActive && "group-hover:scale-110"
                  )} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 mt-auto">
          <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <div className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-semibold">Pro Plan</div>
            <div className="text-sm font-medium text-white">Active Subscription</div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-0">
        <div className="absolute top-0 left-0 w-full h-64 bg-primary-900/10 rounded-full blur-3xl -z-10 pointer-events-none translate-y-[-50%]"></div>
        <div className="glass-panel flex-1 overflow-y-auto p-8 rounded-2xl relative">
          {children}
        </div>
      </main>
    </div>
  );
}
