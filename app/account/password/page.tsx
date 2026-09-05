"use client";
import { AccessProvider, useAccess } from "@/lib/access-context";
import { useSession } from "@/lib/auth-client";
import { PasswordChangeScreen } from "@/components/auth/password-change-screen";
import Link from "next/link";

function AccountPassword() {
  const { data: session, isPending } = useSession();
  const { access, loading, error, refresh } = useAccess();
  if (isPending || loading) return <p dir="rtl" role="status" className="p-8">جارٍ تحميل الحساب…</p>;
  if (!session) return <Link href="/admin/login" className="block p-8">تسجيل الدخول</Link>;
  if (error || !access) return <button className="p-8" onClick={() => void refresh()}>تعذر تحميل الحساب. إعادة المحاولة</button>;
  return <PasswordChangeScreen forced={access.mustChangePassword} expiresAt={access.temporaryPasswordExpiresAt} />;
}
export default function Page() { return <AccessProvider><AccountPassword /></AccessProvider>; }
