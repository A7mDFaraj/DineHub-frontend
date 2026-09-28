"use client";

import { useEffect, useState, useRef } from "react";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { eventError } from "./errors";
import {
  matchName,
  matchTime,
  type TableStatusResponse,
} from "./types";
import {
  Calendar,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Users,
  X,
  Loader2,
  Ticket,
  ChevronRight,
} from "lucide-react";

export function TableEventBanner({
  branchCode,
  tableNumber,
}: {
  branchCode: string;
  tableNumber: string;
}) {
  const locale = useLocale();
  const ar = locale === "ar";
  const [data, setData] = useState<TableStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successToken, setSuccessToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const idempotencyRef = useRef<{ fingerprint: string; value: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const res = await apiClient.get<TableStatusResponse>(
          `/events/table-status/${encodeURIComponent(branchCode)}/${encodeURIComponent(tableNumber)}`
        );
        if (active) {
          setData(res.data);
        }
      } catch {
        // Table status failure shouldn't block the rest of the customer experience
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadStatus();
    // Poll every 10 seconds to catch online bookings in real time
    const interval = setInterval(loadStatus, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [branchCode, tableNumber, attempt]);

  if (loading || !data || !data.hasEvent || !data.event) {
    return null;
  }

  const { event, table, isBooked, reserverName, reservationStatus, userCanBook } = data;
  const fixture = event.fixture;
  const eventTime = matchTime(fixture.kickoff, locale);
  const windowStart = matchTime(event.startsAt, locale);
  const windowEnd = matchTime(event.endsAt, locale);

  const pricingLabel = () => {
    if (event.paymentMode === "free") {
      return ar ? "حجز مجاني" : "Free reservation";
    }
    const amount = ((event.amountMinor || 0) / 100).toFixed(2);
    if (event.paymentMode === "fee") {
      return ar ? `رسوم حجز غير مستردة: ${amount} ر.س` : `Non-refundable fee: ${amount} SAR`;
    }
    if (event.paymentMode === "deposit") {
      return ar ? `عربون يُخصم من الطلب: ${amount} ر.س` : `Deposit credited to order: ${amount} SAR`;
    }
    return ar ? `تأكيد بطلب مسبق (حد أدنى): ${amount} ر.س` : `Pre-order minimum spend: ${amount} SAR`;
  };

  const handleBookSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!table) return;
    setSubmitting(true);
    setSubmitError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      tableId: table.id,
      customerName: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      guests: Number(formData.get("guests") || 1),
      source: "instore" as const,
    };

    const fingerprint = JSON.stringify(payload);
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { fingerprint, value: crypto.randomUUID() };
    }

    try {
      const res = await apiClient.post<{ token: string; status: string }>(
        `/events/${event.id}/reservations`,
        {
          ...payload,
          idempotencyKey: idempotencyRef.current.value,
        }
      );
      setSuccessToken(res.data.token);
      setAttempt((n) => n + 1);
    } catch (err: unknown) {
      setSubmitError(eventError(err, ar));
      setAttempt((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section
        dir={ar ? "rtl" : "ltr"}
        style={{
          margin: "1rem",
          borderRadius: "1rem",
          overflow: "hidden",
          border: isBooked ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
          background: isBooked
            ? "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)"
            : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          color: "#1e293b",
          fontFamily: "inherit",
        }}
      >
        <div style={{ padding: "1.25rem" }}>
          {/* Header Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "9999px",
                fontSize: "0.825rem",
                fontWeight: 700,
                background: isBooked ? "#ef4444" : "#10b981",
                color: "#ffffff",
              }}
            >
              {isBooked ? (
                <>
                  <Lock size={14} />
                  {ar ? `طاولة ${table?.number} محجوزة` : `Table ${table?.number} Reserved`}
                </>
              ) : (
                <>
                  <Ticket size={14} />
                  {ar ? `طاولة ${table?.number} متاحة للحجز` : `Table ${table?.number} Available`}
                </>
              )}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#64748b",
              }}
            >
              <Clock size={14} />
              {eventTime}
            </span>
          </div>

          {/* Match Title */}
          <h3
            style={{
              fontSize: "1.15rem",
              fontWeight: 800,
              margin: "0 0 0.5rem 0",
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⚽ {matchName(fixture, ar)}
          </h3>

          {/* Window & Details */}
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.4,
            }}
          >
            {ar ? "فترة حجز الطاولة:" : "Table reservation window:"}{" "}
            <strong>
              {windowStart} — {windowEnd}
            </strong>
          </p>

          {/* Booking State Details */}
          {isBooked ? (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.7)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              <p
                style={{
                  margin: "0 0 0.35rem 0",
                  fontWeight: 700,
                  color: "#b91c1c",
                  fontSize: "0.95rem",
                }}
              >
                {ar
                  ? `محجوزة باسم: ${reserverName || "عميل آخر"}`
                  : `Reserved by: ${reserverName || "Another guest"}`}
                {reservationStatus === "pending_approval" && (
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, marginInlineStart: "0.5rem" }}>
                    ({ar ? "بانتظار موافقة الإدارة" : "Pending approval"})
                  </span>
                )}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#64748b",
                  lineHeight: 1.4,
                }}
              >
                {ar
                  ? `إذا لم تكن ${reserverName || "صاحب الحجز"}، يُرجى الجلوس على طاولة غير محجوزة لمتابعة المباراة براحة.`
                  : `If you are not ${reserverName || "the reserver"}, please move to an unreserved table to enjoy the match.`}
              </p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.85rem", color: "#065f46" }}>
                  <strong>{pricingLabel()}</strong>
                  {event.requiresApproval && (
                    <span style={{ display: "block", fontSize: "0.75rem", color: "#047857" }}>
                      {ar ? "• يتطلب موافقة الإدارة قبل التأكيد" : "• Requires venue approval"}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.8rem",
                    color: "#047857",
                  }}
                >
                  <Users size={14} />
                  {ar ? `حتى ${table?.capacity} ضيوف` : `Up to ${table?.capacity} guests`}
                </div>
              </div>

              {userCanBook ? (
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError("");
                    setSuccessToken(null);
                    setIsModalOpen(true);
                  }}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1.25rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                    transition: "background 0.2s",
                  }}
                >
                  {ar ? `احجز طاولة ${table?.number} الآن للمباراة` : `Reserve Table ${table?.number} for Match`}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                  {ar ? "الحجز غير متاح حاليًا لهذه المباراة." : "Reservations are currently closed for this match."}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Booking Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          dir={ar ? "rtl" : "ltr"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
              animation: "modalFadeIn 0.2s ease-out",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                  {ar ? `حجز طاولة ${table?.number}` : `Reserve Table ${table?.number}`}
                </h4>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  ⚽ {matchName(fixture, ar)} · {eventTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "0.25rem",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "1.25rem" }}>
              {successToken ? (
                <div style={{ textAlign: "center", padding: "1rem 0" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "#dcfce7",
                      color: "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1rem auto",
                    }}
                  >
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
                    {event.requiresApproval
                      ? ar
                        ? "تم إرسال طلب الحجز بنجاح!"
                        : "Reservation Request Submitted!"
                      : ar
                        ? "تم تأكيد حجزك بنجاح!"
                        : "Reservation Confirmed!"}
                  </h4>
                  <p style={{ color: "#475569", fontSize: "0.9rem", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                    {event.requiresApproval
                      ? ar
                        ? "طلبك الآن بانتظار موافقة الإدارة. سيتحدث الحجز فور الاعتماد."
                        : "Your request is awaiting venue approval. It will confirm shortly."
                      : ar
                        ? `طاولة ${table?.number} محجوزة باسمك للمباراة.`
                        : `Table ${table?.number} is now locked in for you.`}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "#64748b", wordBreak: "break-all", margin: "0 0 1.25rem 0" }}>
                    {ar ? "رمز الحجز:" : "Reservation Code:"} <br />
                    <code style={{ background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "0.25rem" }}>
                      {successToken}
                    </code>
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      width: "100%",
                      minHeight: "44px",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: "#059669",
                      color: "#ffffff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {ar ? "تم، متابعة القائمة" : "Done, View Menu"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookSubmit}>
                  {submitError && (
                    <div
                      role="alert"
                      style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        color: "#991b1b",
                        fontSize: "0.85rem",
                        marginBottom: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <AlertCircle size={16} />
                      {submitError}
                    </div>
                  )}

                  {/* Pricing info box */}
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                      fontSize: "0.85rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <strong>{pricingLabel()}</strong>
                    <div style={{ marginTop: "0.25rem", color: "#15803d", fontSize: "0.78rem" }}>
                      {ar
                        ? "الدفع والتسوية تتم عند الكاشير في المحل."
                        : "Payment is completed at the cashier in the venue."}
                    </div>
                  </div>

                  {/* Name field */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#334155",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {ar ? "الاسم الكامل" : "Full Name"} *
                    </label>
                    <input
                      name="name"
                      required
                      maxLength={100}
                      placeholder={ar ? "مثال: أحمد فرج" : "e.g. Ahmed Faraj"}
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.95rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Phone field */}
                  <div style={{ marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#334155",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {ar ? "رقم الجوال" : "Phone Number"} *
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      required
                      pattern="\+?[0-9]{8,15}"
                      placeholder="+9665xxxxxxxx"
                      dir="ltr"
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.95rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Guests count */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#334155",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {ar ? "عدد الضيوف" : "Number of Guests"} *
                    </label>
                    <input
                      name="guests"
                      type="number"
                      min={1}
                      max={table?.capacity || 20}
                      defaultValue={Math.min(2, table?.capacity || 2)}
                      required
                      style={{
                        width: "100%",
                        minHeight: "44px",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.95rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {ar ? `الحد الأقصى لسعة هذه الطاولة: ${table?.capacity} مقاعد` : `Maximum capacity: ${table?.capacity} seats`}
                    </span>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: "#059669",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "1rem",
                      cursor: submitting ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.3)",
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {ar ? "جارٍ إرسال الحجز…" : "Submitting…"}
                      </>
                    ) : (
                      ar ? "تأكيد حجز الطاولة" : "Confirm Table Reservation"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
