"use client";

import { useMemo } from "react";
import styles from "./events.module.css";

interface TimeWindowPickerProps {
  ar: boolean;
  startsAt: string; // ISO string or YYYY-MM-DDTHH:mm
  endsAt: string; // ISO string or YYYY-MM-DDTHH:mm
  onChange: (startsAt: string, endsAt: string) => void;
  disabled?: boolean;
}

// Convert Date or ISO to local Riyadh "YYYY-MM-DDTHH:mm" for input
export function toRiyadhInput(dateOrIso: string | Date | number): string {
  const d = new Date(dateOrIso);
  if (isNaN(d.getTime())) return "";
  // Riyadh is UTC+3
  const riyadhMs = d.getTime() + 3 * 3600000;
  return new Date(riyadhMs).toISOString().slice(0, 16);
}

// Parse "YYYY-MM-DDTHH:mm" as Riyadh time (UTC+3) to ISO
export function riyadhInputToIso(val: string): string {
  if (!val) return new Date().toISOString();
  return new Date(`${val}:00+03:00`).toISOString();
}

export function TimeWindowPicker({
  ar,
  startsAt,
  endsAt,
  onChange,
  disabled,
}: TimeWindowPickerProps) {
  const startDate = useMemo(() => new Date(startsAt), [startsAt]);
  const endDate = useMemo(() => new Date(endsAt), [endsAt]);

  const durationHours = useMemo(() => {
    const diff = (endDate.getTime() - startDate.getTime()) / 3600000;
    return Math.max(0.5, Math.round(diff * 10) / 10);
  }, [startDate, endDate]);

  const formattedStart = useMemo(() => {
    if (isNaN(startDate.getTime())) return "";
    return new Intl.DateTimeFormat(ar ? "ar-SA" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Riyadh",
    }).format(startDate);
  }, [startDate, ar]);

  const formattedEndTime = useMemo(() => {
    if (isNaN(endDate.getTime())) return "";
    return new Intl.DateTimeFormat(ar ? "ar-SA" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Riyadh",
    }).format(endDate);
  }, [endDate, ar]);

  const setDatePreset = (daysOffset: number, targetHour = 20) => {
    const now = new Date();
    // Riyadh current date
    const d = new Date(now.getTime() + daysOffset * 86400000);
    const startStr = `${d.toISOString().slice(0, 10)}T${String(targetHour).padStart(2, "0")}:00`;
    const startIso = riyadhInputToIso(startStr);
    const endIso = new Date(
      new Date(startIso).getTime() + durationHours * 3600000,
    ).toISOString();
    onChange(startIso, endIso);
  };

  const setDuration = (hours: number) => {
    const newEndIso = new Date(
      startDate.getTime() + hours * 3600000,
    ).toISOString();
    onChange(startsAt, newEndIso);
  };

  const handleStartInputChange = (val: string) => {
    const newStartIso = riyadhInputToIso(val);
    const newEndIso = new Date(
      new Date(newStartIso).getTime() + durationHours * 3600000,
    ).toISOString();
    onChange(newStartIso, newEndIso);
  };

  const handleEndInputChange = (val: string) => {
    const newEndIso = riyadhInputToIso(val);
    onChange(startsAt, newEndIso);
  };

  return (
    <div className={styles.timeWindowContainer}>
      <div className={styles.timeWindowSummary}>
        <div className={styles.summaryBadge}>
          <span className={styles.summaryDot} />
          <span>
            {ar ? "نافذة حجز الطاولات (بتوقيت الرياض)" : "Table Reservation Window (Riyadh)"}
          </span>
        </div>
        <div className={styles.summaryDisplay}>
          <strong className="tabular-nums">
            {formattedStart} ➔ {formattedEndTime}
          </strong>
          <span className={styles.durationPill}>
            {durationHours} {ar ? "ساعات" : "hours"}
          </span>
        </div>
      </div>

      {/* Quick Date Presets */}
      <div className={styles.presetGroup}>
        <span className={styles.presetLabel}>
          {ar ? "موعد الفعالية السريع:" : "Quick Date:"}
        </span>
        <div className={styles.chipRow}>
          <button
            type="button"
            disabled={disabled}
            className={styles.presetChip}
            onClick={() => setDatePreset(0, 20)}
          >
            {ar ? "الليلة (8:00 م)" : "Tonight (8 PM)"}
          </button>
          <button
            type="button"
            disabled={disabled}
            className={styles.presetChip}
            onClick={() => setDatePreset(1, 20)}
          >
            {ar ? "غداً (8:00 م)" : "Tomorrow (8 PM)"}
          </button>
          <button
            type="button"
            disabled={disabled}
            className={styles.presetChip}
            onClick={() => {
              const now = new Date();
              const day = now.getDay(); // 0 is Sun, 4 is Thu, 5 is Fri
              const daysUntilFri = (5 - day + 7) % 7 || 7;
              setDatePreset(daysUntilFri, 20);
            }}
          >
            {ar ? "الجمعة القادمة" : "This Friday"}
          </button>
        </div>
      </div>

      {/* Quick Duration Presets */}
      <div className={styles.presetGroup}>
        <span className={styles.presetLabel}>
          {ar ? "مدة الحجز المقترحة:" : "Duration:"}
        </span>
        <div className={styles.chipRow}>
          {[1.5, 2, 3, 4].map((hours) => (
            <button
              key={hours}
              type="button"
              disabled={disabled}
              className={`${styles.presetChip} ${durationHours === hours ? styles.presetChipActive : ""}`}
              onClick={() => setDuration(hours)}
            >
              {hours} {ar ? "ساعات" : "hrs"}
            </button>
          ))}
        </div>
      </div>

      {/* Manual precise inputs for mobile/desktop */}
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>{ar ? "وقت البداية الفعلي" : "Starts at"}</span>
          <input
            type="datetime-local"
            value={toRiyadhInput(startsAt)}
            onChange={(e) => handleStartInputChange(e.target.value)}
            disabled={disabled}
            required
            className="tabular-nums"
          />
        </label>
        <label className={styles.field}>
          <span>{ar ? "وقت النهاية الفعلي" : "Ends at"}</span>
          <input
            type="datetime-local"
            value={toRiyadhInput(endsAt)}
            onChange={(e) => handleEndInputChange(e.target.value)}
            disabled={disabled}
            required
            className="tabular-nums"
          />
        </label>
      </div>
    </div>
  );
}
