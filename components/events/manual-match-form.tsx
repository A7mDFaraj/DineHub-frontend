"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { eventError } from "./errors";
import type { Fixture } from "./types";
import styles from "./events.module.css";

function getLocalDefault(offset: number) {
  return new Date(Date.now() + offset + 3 * 3600000).toISOString().slice(0, 16);
}

export function ManualMatchForm({
  base,
  busy: parentBusy,
  onCreated,
}: {
  base: string;
  busy: boolean;
  onCreated: (fixture: Fixture) => void;
}) {
  const ar = useLocale() === "ar";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [defaultTime] = useState(() => getLocalDefault(86400000));

  if (!open)
    return (
      <button
        type="button"
        className={styles.primary}
        disabled={parentBusy}
        onClick={() => setOpen(true)}
      >
        {ar ? "إضافة مباراة يدويًا" : "Add match manually"}
      </button>
    );

  return (
    <form
      className={styles.card}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          const { data } = await apiClient.post<Fixture>(
            `${base}/manual-fixture`,
            {
              homeEn: String(f.get("homeEn")).trim(),
              homeAr: String(f.get("homeAr")).trim(),
              awayEn: String(f.get("awayEn")).trim(),
              awayAr: String(f.get("awayAr")).trim(),
              leagueEn: String(f.get("leagueEn")).trim() || "Custom",
              leagueAr: String(f.get("leagueAr")).trim(),
              kickoff: new Date(
                `${f.get("kickoff")}:00+03:00`,
              ).toISOString(),
              homeLogo: String(f.get("homeLogo")).trim(),
              awayLogo: String(f.get("awayLogo")).trim(),
            },
          );
          onCreated(data);
        } catch (err) {
          setError(eventError(err, ar));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{ar ? "إضافة مباراة يدويًا" : "Add match manually"}</h2>
      <p className={styles.muted}>
        {ar
          ? "تصفّح الجدول أعلاه، ثم أدخل بيانات المباراة هنا لإعداد الحجز."
          : "Browse the schedule above, then enter match details here to set up bookings."}
      </p>
      {error && (
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}
        </p>
      )}
      <div className={styles.grid}>
        <label className={styles.field}>
          {ar ? "الفريق المضيف (إنجليزي)" : "Home team (English)"}
          <input name="homeEn" required maxLength={100} />
        </label>
        <label className={styles.field}>
          {ar ? "الفريق المضيف (عربي)" : "Home team (Arabic)"}
          <input name="homeAr" maxLength={100} dir="rtl" />
        </label>
      </div>
      <div className={styles.grid}>
        <label className={styles.field}>
          {ar ? "الفريق الضيف (إنجليزي)" : "Away team (English)"}
          <input name="awayEn" required maxLength={100} />
        </label>
        <label className={styles.field}>
          {ar ? "الفريق الضيف (عربي)" : "Away team (Arabic)"}
          <input name="awayAr" maxLength={100} dir="rtl" />
        </label>
      </div>
      <div className={styles.grid}>
        <label className={styles.field}>
          {ar ? "الدوري (إنجليزي)" : "League (English)"}
          <input
            name="leagueEn"
            maxLength={100}
            placeholder={ar ? "مثال: Saudi Pro League" : "e.g. Saudi Pro League"}
          />
        </label>
        <label className={styles.field}>
          {ar ? "الدوري (عربي)" : "League (Arabic)"}
          <input
            name="leagueAr"
            maxLength={100}
            dir="rtl"
            placeholder={ar ? "مثال: دوري روشن" : "e.g. دوري روشن"}
          />
        </label>
      </div>
      <label className={styles.field}>
        {ar ? "موعد الانطلاق — بتوقيت الرياض" : "Kickoff — Riyadh time"}
        <input
          name="kickoff"
          type="datetime-local"
          required
          defaultValue={defaultTime}
        />
      </label>
      <div className={styles.grid}>
        <label className={styles.field}>
          {ar ? "رابط شعار المضيف (اختياري)" : "Home logo URL (optional)"}
          <input
            name="homeLogo"
            type="url"
            maxLength={500}
            placeholder="https://..."
          />
        </label>
        <label className={styles.field}>
          {ar ? "رابط شعار الضيف (اختياري)" : "Away logo URL (optional)"}
          <input
            name="awayLogo"
            type="url"
            maxLength={500}
            placeholder="https://..."
          />
        </label>
      </div>
      <div className={styles.row}>
        <button type="submit" className={styles.primary} disabled={busy || parentBusy}>
          {busy
            ? ar ? "جارٍ الحفظ…" : "Saving…"
            : ar ? "إنشاء المباراة" : "Create match"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
        >
          {ar ? "إلغاء" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
