"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Copy, Loader2, Plus, UsersRound } from "lucide-react";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import styles from "@/components/admin/business.module.css";

interface Business {
  id: string; name: string; slug: string; active: boolean; createdAt: string;
  _count: { branches: number; users: number };
  users: { id: string; name: string; email: string }[];
}
interface Created {
  business: { id: string; name: string; slug: string };
  owner: { id: string; name: string; email: string };
  temporaryPassword: string; expiresAt: string;
}

export default function BusinessesPage() {
  const { access } = useAccess();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [resetOwnerId, setResetOwnerId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", ownerName: "", ownerEmail: "" });
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setBusinesses((await apiClient.get<Business[]>("/platform/businesses")).data); }
    catch { setError("تعذر تحميل أنشطة المنصة."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (!access?.isPlatformAdmin) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [access?.isPlatformAdmin, load]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setCreated(null);
    try {
      const { data } = await apiClient.post<Created>("/platform/businesses", form);
      setCreated(data); setCopyStatus(""); setForm({ name: "", slug: "", ownerName: "", ownerEmail: "" });
      await load();
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "تعذر إنشاء النشاط.");
    } finally { setBusy(false); }
  }
  async function resetOwner(business: Business) {
    const owner = business.users[0];
    if (!owner || busy) return;
    setBusy(true); setError("");
    try {
      const { data } = await apiClient.post<{ temporaryPassword: string; expiresAt: string }>(`/platform/users/${owner.id}/reset-password`);
      setCreated({ business: { id: business.id, name: business.name, slug: business.slug }, owner, ...data });
      setCopyStatus(""); setResetOwnerId(null);
    } catch (e) {
      setError(axios.isAxiosError(e) && typeof e.response?.data?.message === "string" ? e.response.data.message : "تعذر إصدار كلمة مرور للمالك.");
    } finally { setBusy(false); }
  }
  if (!access?.isPlatformAdmin) return <p role="alert">هذه الصفحة خاصة بإدارة منصة DineHub.</p>;
  return <div className={styles.section}>
    <header className={styles.heading}><div><p className={styles.muted}>إدارة المنصة</p><h1>أنشطة العملاء</h1><p className={styles.muted}>كل نشاط معزول بفروعه وفريقه وأدواره وسجلاته.</p></div></header>
    <section className={styles.panel}>
      <div className={styles.heading}><div><h2>إضافة عميل</h2><p className={styles.muted}>ينشأ حساب المالك بكلمة مؤقتة تظهر مرة واحدة.</p></div><Plus aria-hidden="true" /></div>
      <form className={styles.fields} onSubmit={submit}>
        <label className={styles.field}>اسم النشاط<input className={styles.input} required minLength={2} maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label className={styles.field}>المعرّف المختصر<input className={styles.input} dir="ltr" required pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?" placeholder="acme-store" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase() })} /></label>
        <label className={styles.field}>اسم المالك<input className={styles.input} required minLength={2} maxLength={120} value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} /></label>
        <label className={styles.field}>بريد المالك<input className={styles.input} dir="ltr" type="email" required maxLength={320} value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} /></label>
        <button className={`${styles.button} ${styles.primary}`} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} {busy ? "جارٍ الإنشاء…" : "إنشاء النشاط والمالك"}</button>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>
    {created && <section className={styles.panel} aria-live="polite"><h2>بيانات الدخول المؤقتة</h2><p className={styles.muted}>انسخها الآن وشاركها مع المالك بوسيلة خاصة. لن تظهر مرة أخرى، وتنتهي بعد 48 ساعة.</p><p>{created.business.name}</p><p dir="ltr">{created.owner.email}</p><input className={styles.input} dir="ltr" readOnly value={created.temporaryPassword} onFocus={e => e.target.select()} /><button className={styles.button} onClick={async () => { try { await navigator.clipboard.writeText(created.temporaryPassword); setCopyStatus("تم النسخ"); } catch { setCopyStatus("حدد الكلمة وانسخها يدوياً"); } }}><Copy />نسخ كلمة المرور</button><p role="status">{copyStatus}</p></section>}
    <section className={styles.panel}><h2>العملاء الحاليون</h2>{loading ? <p role="status">جارٍ التحميل…</p> : <ul className={styles.list}>{businesses.map(b => <li className={styles.row} key={b.id}><div><strong>{b.name}</strong><p className={styles.muted} dir="ltr">{b.slug}</p><small>{b.users[0]?.name ?? "بلا مالك"} · {b.users[0]?.email ?? "—"}</small></div><div className={styles.controls}><span><Building2 size={15} /> {b._count.branches}</span><span><UsersRound size={15} /> {b._count.users}</span>{b.users[0] && (resetOwnerId === b.users[0].id ? <><button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void resetOwner(b)}>تأكيد وإنهاء جلساته</button><button className={styles.button} disabled={busy} onClick={() => setResetOwnerId(null)}>إلغاء</button></> : <button className={styles.button} onClick={() => setResetOwnerId(b.users[0].id)}>استعادة دخول المالك</button>)}</div></li>)}</ul>}</section>
  </div>;
}
