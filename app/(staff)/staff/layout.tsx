"use client"

import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { ChefHat, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/lib/auth-client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useEffect, useState } from "react"

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin/login")
    }
  }, [isPending, router, session])

  if (isPending || !session) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.replace("/admin/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c]">
      <header className="h-16 border-b border-white/10 glass-panel rounded-none border-t-0 border-x-0 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-amber-500 font-bold text-xl">
          <ChefHat />
          <span>Staff Kitchen</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">
            {session?.user?.name || "Staff Member"}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            disabled={isSigningOut}
            aria-label="تسجيل الخروج"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
