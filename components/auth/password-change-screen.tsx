"use client";

import { useRef, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";

export function PasswordChangeScreen({ forced = false, expiresAt }: { forced?: boolean; expiresAt?: string | null }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const expired = forced && !!expiresAt && Date.parse(expiresAt) <= Date.now();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (newPassword !== confirmation) { setError("كلمتا المرور غير متطابقتين."); return; }
    if (newPassword === currentPassword) { setError("اختر كلمة مرور مختلفة عن الحالية."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      await apiClient.post("/account/password", { currentPassword, newPassword });
      setCurrent(""); setNew(""); setConfirmation(""); setDone(true);
      try { await signOut(); } catch { /* The backend has already revoked every session. */ }
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "تعذر تحديث كلمة المرور. حاول مجدداً.");
    } finally { lock.current = false; setBusy(false); }
  }
  const input = "w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white focus:outline-2 focus:outline-orange-300";
  return <main dir="rtl" className="min-h-screen bg-[#130d1b] text-white flex items-center justify-center p-5">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#201729] p-6 sm:p-8 space-y-5">
      <LockKeyhole size={30} className="text-orange-300" aria-hidden="true" />
      <h1 className="text-2xl font-bold">{done ? "تم تأمين حسابك" : forced ? "اختر كلمة مرور خاصة بك" : "تغيير كلمة المرور"}</h1>
      {done ? <><p role="status">تم حفظ كلمة المرور وإنهاء جميع الجلسات السابقة. سجّل الدخول بكلمتك الجديدة.</p><a className={input + " block text-center"} href="/admin/login">تسجيل الدخول</a></> : <>
        <p className="text-sm text-zinc-300">{forced ? "كلمة المرور التي استلمتها مؤقتة. اختر كلمة خاصة بك قبل متابعة العمل." : "بعد الحفظ ستنتهي جميع جلساتك، وتدخل مجدداً بكلمة المرور الجديدة."}</p>
        {expired ? <p role="alert">انتهت صلاحية كلمة المرور المؤقتة. المالك يتواصل مع دعم DineHub، وعضو الفريق مع مسؤول نشاطه، لإصدار كلمة جديدة.</p> : <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2"><span>{forced ? "كلمة المرور المؤقتة" : "كلمة المرور الحالية"}</span><input className={input} dir="ltr" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e => setCurrent(e.target.value)} disabled={busy} /></label>
          <label className="block space-y-2"><span>كلمة المرور الجديدة</span><input className={input} dir="ltr" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e => setNew(e.target.value)} disabled={busy} /></label>
          <p className="text-xs text-zinc-300">12 حرفاً على الأقل. يمكنك استخدام عبارة طويلة أو مدير كلمات المرور.</p>
          <label className="block space-y-2"><span>تأكيد كلمة المرور</span><input className={input} dir="ltr" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} /></label>
          {error && <p role="alert" className="text-red-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-orange-300 text-zinc-950 min-h-12 px-4 py-3 font-bold disabled:opacity-60 flex gap-2 justify-center">{busy && <Loader2 className="animate-spin" aria-hidden="true" />} {busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}</button>
        </form>}
        <button disabled={busy} className="min-h-11 underline text-zinc-300" onClick={async () => { try { await signOut(); } finally { window.location.assign('/admin/login'); } }}>تسجيل الخروج</button>
      </>}
    </section>
  </main>;
}
