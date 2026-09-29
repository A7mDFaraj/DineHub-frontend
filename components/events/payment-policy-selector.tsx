"use client";

import styles from "./events.module.css";
import type { VenueEvent } from "./types";

interface PaymentPolicySelectorProps {
  ar: boolean;
  mode: VenueEvent["paymentMode"];
  amount: number; // in SAR
  cancellationHours: number;
  requiresApproval: boolean;
  onModeChange: (mode: VenueEvent["paymentMode"]) => void;
  onAmountChange: (amount: number) => void;
  onCancellationHoursChange: (hours: number) => void;
  onRequiresApprovalChange: (requiresApproval: boolean) => void;
  disabled?: boolean;
}

export function PaymentPolicySelector({
  ar,
  mode,
  amount,
  cancellationHours,
  requiresApproval,
  onModeChange,
  onAmountChange,
  onCancellationHoursChange,
  onRequiresApprovalChange,
  disabled,
}: PaymentPolicySelectorProps) {
  const policies = [
    {
      id: "free" as const,
      icon: "🎟️",
      titleAr: "حجز مجاني",
      titleEn: "Free Reservation",
      descAr: "لا يتطلب دفع مسبق. رائع للجلسات العائلية وعروض المباريات المعتادة.",
      descEn: "No advance payment required. Ideal for casual visits and open viewings.",
    },
    {
      id: "fee" as const,
      icon: "💳",
      titleAr: "رسوم دخول / تذكرة غير مستردة",
      titleEn: "Non-Refundable Fee",
      descAr: "رسم دخول ثابت للطاولة أو المقعد مقابل الفعالية، لا يُخصم من الأكل.",
      descEn: "Fixed reservation fee for the event seat. Not credited toward food.",
    },
    {
      id: "deposit" as const,
      icon: "💰",
      titleAr: "عربون يُخصم من الفاتورة",
      titleEn: "Deposit Credited to Order",
      descAr: "مبلغ يُدفع لتأكيد الحجز، ويخصمه الكاشير تلقائيًا من حساب الوجبة عند الحضور.",
      descEn: "Upfront deposit credited directly against the guest's food bill by cashier.",
    },
    {
      id: "preorder" as const,
      icon: "🍽️",
      titleAr: "حد أدنى للطلب المسبق",
      titleEn: "Pre-order Minimum Spend",
      descAr: "اشتراط حد أدنى من الطلبات لضمان الطاولة في الأوقات ذات الطلب العالي.",
      descEn: "Minimum spending commitment required per table during peak events.",
    },
  ];

  return (
    <div className={styles.paymentSectionContainer}>
      <div className={styles.sectionHeading}>
        <h3>{ar ? "نظام الدفع وتسعير الحجوزات" : "Payment & Reservation Policy"}</h3>
        <p className={styles.muted}>
          {ar
            ? "اختر طريقة استلام المبالغ. يتم التعامل المالي وتسجيل السندات عند الكاشير."
            : "Choose how reservations are monetized. Staff records receipt at the cashier."}
        </p>
      </div>

      {/* 4 Cards Grid */}
      <div className={styles.policyCardsGrid}>
        {policies.map((p) => {
          const isSelected = mode === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              className={`${styles.policyCard} ${isSelected ? styles.policyCardSelected : ""}`}
              onClick={() => {
                onModeChange(p.id);
                if (p.id === "fee" && amount === 0) onAmountChange(25);
                if (p.id === "deposit" && amount === 0) onAmountChange(50);
                if (p.id === "preorder" && amount === 0) onAmountChange(100);
              }}
            >
              <div className={styles.policyCardHeader}>
                <span className={styles.policyIcon}>{p.icon}</span>
                <h4>{ar ? p.titleAr : p.titleEn}</h4>
              </div>
              <p className={styles.policyDesc}>{ar ? p.descAr : p.descEn}</p>
              {isSelected && <span className={styles.policySelectedTag}>✓ {ar ? "مفعل" : "Active"}</span>}
            </button>
          );
        })}
      </div>

      {/* Mode Amount & Settings */}
      {mode !== "free" && (
        <div className={styles.pricingInputsRow}>
          <label className={styles.field}>
            <span>
              {ar
                ? mode === "preorder"
                  ? "الحد الأدنى للطلب (ريال)"
                  : mode === "deposit"
                    ? "قيمة العربون المسترد من الطلب (ريال)"
                    : "مبلغ الرسوم غير المستردة (ريال)"
                : "Amount per table (SAR)"}
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              step="1"
              value={amount}
              onChange={(e) => onAmountChange(Number(e.target.value))}
              disabled={disabled}
              required
              className="tabular-nums"
            />
          </label>

          {/* Quick Amount Chips */}
          <div className={styles.chipRow} style={{ alignSelf: "flex-end" }}>
            {[25, 50, 75, 100, 150].map((sar) => (
              <button
                key={sar}
                type="button"
                disabled={disabled}
                className={`${styles.presetChip} ${amount === sar ? styles.presetChipActive : ""}`}
                onClick={() => onAmountChange(sar)}
              >
                {sar} {ar ? "ريال" : "SAR"}
              </button>
            ))}
          </div>

          <label className={styles.field}>
            <span>
              {ar
                ? "مهلة استرداد العربون قبل البداية (ساعات)"
                : "Refund Cutoff Window (Hours before start)"}
            </span>
            <input
              type="number"
              min={0}
              max={720}
              value={cancellationHours}
              onChange={(e) => onCancellationHoursChange(Number(e.target.value))}
              disabled={disabled}
              required
              className="tabular-nums"
            />
          </label>
        </div>
      )}

      {/* Approval Toggle */}
      <div className={styles.approvalToggleCard}>
        <label className={styles.approvalCheckboxLabel}>
          <input
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => onRequiresApprovalChange(e.target.checked)}
            disabled={disabled}
          />
          <div>
            <strong>
              {ar
                ? "يتطلب موافقة الإدارة قبل تأكيد الحجز"
                : "Require management approval before confirming"}
            </strong>
            <p className={styles.muted}>
              {ar
                ? "عند التفعيل، يدخل حجز العميل في حالة (بانتظار الموافقة) حتى يوافق الكاشير أو المسؤول يدويًا."
                : "When enabled, guest bookings stay pending until authorized staff explicitly approves them."}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
