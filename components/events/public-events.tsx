"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { MatchHeading } from "./match-heading";
import { eventError } from "./errors";
import {
  matchTime,
  reservationStatus,
  type EventTable,
  type Reservation,
  type VenueEvent,
} from "./types";
import styles from "./events.module.css";

export function PublicEvents({ branchCode }: { branchCode: string }) {
  const locale = useLocale(),
    ar = locale === "ar";
  const [events, setEvents] = useState<VenueEvent[]>([]),
    [name, setName] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<VenueEvent | null>(null),
    [receipt, setReceipt] = useState<Reservation | null>(null);
  const [lookup, setLookup] = useState(""),
    [busy, setBusy] = useState(false);
  const loadReceipt = useCallback(
    async (token: string) => {
      setBusy(true);
      setError("");
      try {
        const { data } = await apiClient.post<Reservation>(
          "/events/reservation/receipt",
          { token },
        );
        setReceipt(data);
        window.history.replaceState(null, "", `#${token}`);
        setSelected(null);
      } catch (e) {
        setError(eventError(e, ar));
      } finally {
        setBusy(false);
      }
    },
    [ar],
  );
  useEffect(() => {
    const token = window.location.hash.slice(1);
    const timer = setTimeout(() => {
      if (/^[a-f0-9]{64}$/.test(token)) void loadReceipt(token);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadReceipt]);
  useEffect(() => {
    const abort = new AbortController();
    apiClient
      .get(`/events/branch/${encodeURIComponent(branchCode)}`, {
        signal: abort.signal,
      })
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        setEvents(data.events);
        setName(
          ar
            ? data.branch.nameAr || data.branch.name
            : data.branch.nameEn || data.branch.name,
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(eventError(e, ar));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [branchCode, ar, attempt]);
  async function cancel() {
    if (!receipt?.token) return;
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/events/reservation/cancel", {
        token: receipt.token,
      });
      await loadReceipt(receipt.token);
      setAttempt((n) => n + 1);
    } catch (e) {
      setError(eventError(e, ar));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.public}>
      <main className={styles.root} dir={ar ? "rtl" : "ltr"}>
        <header className={styles.header}>
          <div>
            <p className={styles.muted}>{name}</p>
            <h1>{ar ? "المباريات والحجوزات" : "Matches & reservations"}</h1>
            <p className={styles.muted}>
              {ar
                ? "احجز طاولتك، واطلب عندما تصل."
                : "Reserve your table. Order when you arrive."}
            </p>
          </div>
          <Link className={styles.button} href={`/menu/${branchCode}`}>
            {ar ? "قائمة الطعام" : "View menu"}
          </Link>
        </header>
        {error && (
          <div role="alert" className={`${styles.notice} ${styles.error}`}>
            {error}{" "}
            <button
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              {ar ? "إعادة المحاولة" : "Retry"}
            </button>
          </div>
        )}
        {receipt && (
          <section className={styles.card} aria-live="polite">
            <h2>
              {ar ? "حجزك" : "Your reservation"} ·{" "}
              {reservationStatus(receipt.status, ar)}
            </h2>
            <MatchHeading fixture={receipt.event.fixture} locale={locale} />
            <p>
              {ar ? "فترة حجز الطاولة" : "Reserved table window"}:{" "}
              {matchTime(receipt.startsAt, locale)} —{" "}
              {matchTime(receipt.endsAt, locale)}
            </p>
            {receipt.event.reviewRequired && (
              <p className={styles.notice}>
                {ar
                  ? "تغير موعد المباراة أو حالتها. فترة حجزك الأصلية موضحة أعلاه؛ تواصل مع المحل لتأكيد الترتيبات."
                  : "The match schedule or status changed. Your original table window is shown above; contact the venue to confirm arrangements."}
              </p>
            )}
            <p>
              {ar ? "الطاولة" : "Table"} {receipt.table.number} ·{" "}
              {receipt.guests} {ar ? "ضيوف" : "guests"}
            </p>
            <p>
              {ar
                ? "احتفظ برمز الحجز وأظهره للموظف عند الوصول. لا تشاركه مع الآخرين."
                : "Keep your reservation code and show it to staff on arrival. Keep it private."}
            </p>
            <p>
              {receipt.paymentStatus === "unpaid"
                ? ar
                  ? "مستحق عند الكاشير"
                  : "Due at cashier"
                : receipt.paymentStatus === "refund_due"
                  ? ar
                    ? "راجع الكاشير لاستلام المبلغ المسترد"
                    : "Contact the cashier for your refund"
                  : receipt.paymentStatus === "paid"
                    ? ar
                      ? "تم استلام المبلغ"
                      : "Payment received"
                    : receipt.paymentStatus === "refunded"
                      ? ar
                        ? "تم رد المبلغ"
                        : "Refund handed over"
                      : receipt.paymentStatus === "forfeited"
                        ? ar
                          ? "المبلغ غير مسترد حسب السياسة"
                          : "Payment retained under cancellation policy"
                        : ""}{" "}
              · {((receipt.amountMinor || 0) / 100).toFixed(2)} SAR
            </p>
            <code className={styles.code}>{receipt.token}</code>
            <div className={styles.row}>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href);
                }}
              >
                {ar ? "نسخ رابط الحجز" : "Copy reservation link"}
              </button>
              {receipt.status === "confirmed" && (
                <button disabled={busy} onClick={cancel}>
                  {ar ? "إلغاء الحجز" : "Cancel reservation"}
                </button>
              )}
            </div>
          </section>
        )}
        {selected ? (
          <BookingForm
            key={selected.id}
            event={selected}
            onClose={() => setSelected(null)}
            onReserved={async (token) => {
              window.history.replaceState(null, "", `#${token}`);
              await loadReceipt(token);
              setAttempt((n) => n + 1);
            }}
          />
        ) : loading ? (
          <p role="status">
            {ar ? "جارٍ تحميل المباريات…" : "Loading matches…"}
          </p>
        ) : (
          <div className={styles.grid}>
            {events.length === 0 ? (
              <p>
                {ar
                  ? "لم يعلن المحل عن مباريات قادمة بعد."
                  : "This venue has not announced any upcoming matches."}
              </p>
            ) : (
              events.map((event) => (
                <article key={event.id} className={styles.card}>
                  <MatchHeading fixture={event.fixture} locale={locale} />
                  <p>{ar ? "تُعرض المباراة هنا" : "Showing here"}</p>
                  <p>
                    {event.paymentMode === "free"
                      ? ar
                        ? "حجز مجاني"
                        : "Free reservation"
                      : `${(event.amountMinor / 100).toFixed(2)} SAR`}
                  </p>
                  <button
                    className={styles.primary}
                    disabled={
                      !event.bookingOpen ||
                      event.reviewRequired ||
                      event.fixture.status !== "NS" ||
                      new Date(event.fixture.kickoff) <= new Date()
                    }
                    onClick={() => setSelected(event)}
                  >
                    {event.bookingOpen && !event.reviewRequired
                      ? ar
                        ? "احجز طاولتك"
                        : "Reserve a table"
                      : ar
                        ? "الحجز مغلق حاليًا"
                        : "Booking closed"}
                  </button>
                </article>
              ))
            )}
          </div>
        )}
        <form
          className={styles.card}
          onSubmit={(e) => {
            e.preventDefault();
            void loadReceipt(lookup.trim());
          }}
        >
          <h2>{ar ? "لديك حجز؟" : "Already have a reservation?"}</h2>
          <label className={styles.field}>
            {ar ? "رمز الحجز" : "Reservation code"}
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              required
              pattern="[a-f0-9]{64}"
              dir="ltr"
              autoComplete="off"
            />
          </label>
          <button disabled={busy}>
            {ar ? "عرض الحجز" : "Find reservation"}
          </button>
        </form>
      </main>
    </div>
  );
}
function BookingForm({
  event,
  onClose,
  onReserved,
}: {
  event: VenueEvent;
  onClose: () => void;
  onReserved: (token: string) => Promise<void>;
}) {
  const locale = useLocale(),
    ar = locale === "ar";
  const [tables, setTables] = useState<EventTable[]>([]),
    [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const key = useRef<{ fingerprint: string; value: string } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    apiClient
      .get<EventTable[]>(`/events/${event.id}/tables`, { signal: abort.signal })
      .then(({ data }) => setTables(data))
      .catch((e) => {
        if (!abort.signal.aborted) setError(eventError(e, ar));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [event.id, ar, attempt]);
  return (
    <form
      className={styles.card}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const form = new FormData(e.currentTarget);
        const payload = {
          tableId,
          customerName: String(form.get("name")).trim(),
          phone: String(form.get("phone")).trim(),
          guests: Number(form.get("guests")),
        };
        const fingerprint = JSON.stringify(payload);
        if (key.current?.fingerprint !== fingerprint)
          key.current = { fingerprint, value: crypto.randomUUID() };
        try {
          const { data } = await apiClient.post(
            `/events/${event.id}/reservations`,
            { ...payload, idempotencyKey: key.current.value },
          );
          await onReserved(data.token);
        } catch (err) {
          setError(eventError(err, ar));
          setAttempt((n) => n + 1);
        } finally {
          setBusy(false);
        }
      }}
    >
      <MatchHeading fixture={event.fixture} locale={locale} />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <label className={styles.field}>
        {ar ? "الطاولة" : "Table"}
        <select
          required
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          disabled={loading || busy}
        >
          <option value="">
            {loading
              ? ar
                ? "جارٍ التحميل…"
                : "Loading…"
              : ar
                ? "اختر طاولة"
                : "Choose a table"}
          </option>
          {tables.map((table) => (
            <option key={table.id} value={table.id} disabled={!table.available}>
              {ar ? "طاولة" : "Table"} {table.number} · {table.capacity}{" "}
              {ar ? "مقاعد" : "seats"}{" "}
              {!table.available ? (ar ? "— محجوزة" : "— Reserved") : ""}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        {ar ? "عدد الضيوف" : "Guests"}
        <input
          name="guests"
          type="number"
          min={1}
          max={tables.find((t) => t.id === tableId)?.capacity || 100}
          defaultValue={2}
          required
        />
      </label>
      <label className={styles.field}>
        {ar ? "الاسم" : "Name"}
        <input name="name" required maxLength={100} autoComplete="name" />
      </label>
      <label className={styles.field}>
        {ar ? "رقم الجوال" : "Phone number"}
        <input
          name="phone"
          type="tel"
          required
          pattern="\+?[0-9]{8,15}"
          dir="ltr"
          autoComplete="tel"
          placeholder="+9665xxxxxxxx"
        />
      </label>
      <div className={styles.notice}>
        {event.paymentMode === "free" ? (
          ar ? (
            "حجز مجاني"
          ) : (
            "Free reservation"
          )
        ) : (
          <>
            <p>
              {ar
                ? "المبلغ مستحق عند الكاشير، ولا يتم الدفع الإلكتروني الآن."
                : "Payment is due at the cashier. No online payment is taken."}{" "}
              {(event.amountMinor / 100).toFixed(2)} SAR
            </p>
            <p>
              {event.paymentMode === "fee"
                ? ar
                  ? "رسوم الحجز لا تُسترد عند إلغاء العميل."
                  : "Booking fees are not refunded for customer cancellations."
                : ar
                  ? `العربون يُخصم من طلبات الزيارة بعد استلامه. يُسترد عند الإلغاء قبل المباراة بـ ${event.cancellationHours} ساعة، ولا يُسترد بعدها أو عند عدم الحضور.`
                  : `The collected deposit is credited toward visit orders. Refundable until ${event.cancellationHours} hours before kickoff; retained after that or for no-shows.`}
            </p>
            <p>
              {ar
                ? "عند إلغاء المحل أو المباراة، تُعاد المبالغ المستلمة بالكامل عن طريق الكاشير."
                : "If the venue or match is cancelled, collected payments are fully refundable at the cashier."}
            </p>
          </>
        )}
      </div>
      <p className={styles.muted}>
        {ar
          ? "الحجز مستقل عن الطعام. عند الوصول أكد حضورك مع الموظف، ثم امسح QR الطاولة للطلب."
          : "This reservation does not include food. Check in with staff, then scan the table QR to order."}
      </p>
      <div className={styles.row}>
        <button
          type="submit"
          className={styles.primary}
          disabled={busy || !tableId}
        >
          {busy
            ? ar
              ? "جارٍ الحجز…"
              : "Reserving…"
            : ar
              ? "تأكيد الحجز"
              : "Confirm reservation"}
        </button>
        <button type="button" disabled={busy} onClick={onClose}>
          {ar ? "رجوع" : "Back"}
        </button>
      </div>
    </form>
  );
}
