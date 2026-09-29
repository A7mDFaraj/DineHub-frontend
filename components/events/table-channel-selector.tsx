"use client";

import { useMemo } from "react";
import type { EventTable } from "./types";
import styles from "./events.module.css";

interface TableChannelSelectorProps {
  ar: boolean;
  tables: EventTable[];
  selectedTableIds: string[];
  inStoreOnlyTableIds: string[];
  onSelectedChange: (selectedIds: string[]) => void;
  onInStoreOnlyChange: (inStoreIds: string[]) => void;
  disabled?: boolean;
}

export function TableChannelSelector({
  ar,
  tables,
  selectedTableIds,
  inStoreOnlyTableIds,
  onSelectedChange,
  onInStoreOnlyChange,
  disabled,
}: TableChannelSelectorProps) {
  const selectedSet = useMemo(
    () => new Set(selectedTableIds),
    [selectedTableIds],
  );
  const inStoreSet = useMemo(
    () => new Set(inStoreOnlyTableIds),
    [inStoreOnlyTableIds],
  );

  const toggleSelectTable = (id: string) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(id)) {
      next.delete(id);
      // also remove from instore
      const nextInStore = new Set(inStoreSet);
      nextInStore.delete(id);
      onInStoreOnlyChange(Array.from(nextInStore));
    } else {
      next.add(id);
    }
    onSelectedChange(Array.from(next));
  };

  const toggleInStoreOnly = (id: string) => {
    if (disabled || !selectedSet.has(id)) return;
    const nextInStore = new Set(inStoreSet);
    if (nextInStore.has(id)) {
      nextInStore.delete(id);
    } else {
      nextInStore.add(id);
    }
    onInStoreOnlyChange(Array.from(nextInStore));
  };

  const selectAll = () => {
    if (disabled) return;
    onSelectedChange(tables.map((t) => t.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onSelectedChange([]);
    onInStoreOnlyChange([]);
  };

  const setAllOnline = () => {
    if (disabled) return;
    onInStoreOnlyChange([]);
  };

  const setAllInStoreOnly = () => {
    if (disabled) return;
    onInStoreOnlyChange(selectedTableIds);
  };

  const totalCapacity = useMemo(() => {
    return tables
      .filter((t) => selectedSet.has(t.id))
      .reduce((sum, t) => sum + (t.capacity || 4), 0);
  }, [tables, selectedSet]);

  const onlineCount = selectedTableIds.length - inStoreOnlyTableIds.length;

  return (
    <div className={styles.tableSelectorContainer}>
      <div className={styles.tableSelectorHeader}>
        <div>
          <h3>{ar ? "تخصيص الطاولات وقنوات الحجز" : "Tables & Booking Channels"}</h3>
          <p className={styles.muted}>
            {ar
              ? "حدد الطاولات المخصصة للفعالية، واختر ما إذا كانت متاحة للحجز أونلاين أو حصرية للمسح داخل المحل فقط."
              : "Choose tables for this event and designate whether each is bookable online or exclusive to in-store walk-in QR scans."}
          </p>
        </div>
        <div className={styles.tableSummaryStats}>
          <span className={styles.statsPill}>
            {ar ? "المحدد:" : "Selected:"}{" "}
            <strong className="tabular-nums">{selectedTableIds.length}</strong> / {tables.length}
          </span>
          <span className={styles.statsPill}>
            {ar ? "أونلاين:" : "Online:"}{" "}
            <strong className="tabular-nums">{Math.max(0, onlineCount)}</strong>
          </span>
          <span className={styles.statsPill}>
            {ar ? "في المحل فقط:" : "In-Store Only:"}{" "}
            <strong className="tabular-nums">{inStoreOnlyTableIds.length}</strong>
          </span>
          <span className={styles.statsPill}>
            {ar ? "إجمالي المقاعد:" : "Total seats:"}{" "}
            <strong className="tabular-nums">{totalCapacity}</strong>
          </span>
        </div>
      </div>

      {/* Quick Bulk Action Buttons */}
      <div className={styles.bulkActionRow}>
        <button
          type="button"
          disabled={disabled || selectedTableIds.length === tables.length}
          className={styles.bulkBtn}
          onClick={selectAll}
        >
          {ar ? "تحديد كل الطاولات" : "Select All"}
        </button>
        <button
          type="button"
          disabled={disabled || selectedTableIds.length === 0}
          className={styles.bulkBtn}
          onClick={clearAll}
        >
          {ar ? "إلغاء تحديد الكل" : "Deselect All"}
        </button>
        <button
          type="button"
          disabled={disabled || selectedTableIds.length === 0 || inStoreOnlyTableIds.length === 0}
          className={styles.bulkBtn}
          onClick={setAllOnline}
        >
          {ar ? "الكل أونلاين وحضوري" : "Make All Online"}
        </button>
        <button
          type="button"
          disabled={disabled || selectedTableIds.length === 0 || inStoreOnlyTableIds.length === selectedTableIds.length}
          className={styles.bulkBtn}
          onClick={setAllInStoreOnly}
        >
          {ar ? "الكل في المحل فقط (QR)" : "Make All In-Store Only"}
        </button>
      </div>

      {/* Tables Grid */}
      <div className={styles.tableCardsGrid}>
        {tables.map((table) => {
          const isSelected = selectedSet.has(table.id);
          const isInStoreOnly = inStoreSet.has(table.id);

          return (
            <div
              key={table.id}
              className={`${styles.tableCard} ${isSelected ? styles.tableCardSelected : ""}`}
            >
              <div className={styles.tableCardTop}>
                <label className={styles.tableCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectTable(table.id)}
                    disabled={disabled}
                  />
                  <div>
                    <strong className={styles.tableNumber}>
                      {ar ? "طاولة" : "Table"} {table.number}
                    </strong>
                    <span className={styles.tableCapacity}>
                      {table.capacity} {ar ? "مقاعد" : "seats"}
                    </span>
                  </div>
                </label>
                <span
                  className={`${styles.statusBadge} ${
                    !isSelected
                      ? styles.badgeExcluded
                      : isInStoreOnly
                        ? styles.badgeInstore
                        : styles.badgeOnline
                  }`}
                >
                  {!isSelected
                    ? ar
                      ? "غير مشمولة"
                      : "Excluded"
                    : isInStoreOnly
                      ? ar
                        ? "في المحل فقط"
                        : "In-Store Only"
                      : ar
                        ? "أونلاين وحضوري"
                        : "Online & Walk-in"}
                </span>
              </div>

              {isSelected && (
                <div className={styles.tableChannelButtons}>
                  <button
                    type="button"
                    disabled={disabled}
                    className={`${styles.channelToggleBtn} ${!isInStoreOnly ? styles.channelToggleActive : ""}`}
                    onClick={() => {
                      if (isInStoreOnly) toggleInStoreOnly(table.id);
                    }}
                  >
                    🌐 {ar ? "حجز أونلاين" : "Online & Walk-in"}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    className={`${styles.channelToggleBtn} ${isInStoreOnly ? styles.channelToggleActive : ""}`}
                    onClick={() => {
                      if (!isInStoreOnly) toggleInStoreOnly(table.id);
                    }}
                  >
                    📱 {ar ? "مسح QR بالمحل فقط" : "In-Store QR Only"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
