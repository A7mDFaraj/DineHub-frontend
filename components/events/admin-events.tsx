"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { useAccess } from "@/lib/access-context";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { ScheduleWidget } from "./schedule-widget";
import { MatchHeading } from "./match-heading";
import { eventError, eventErrorCode } from "./errors";
import {
  matchName,
  providerNames,
  type FootballSyncStatus,
  type FootballProvider,
  reservationStatus,
  type EventTable,
  type Fixture,
  type Reservation,
  type VenueEvent,
} from "./types";
import styles from "./events.module.css";

export function AdminEvents() {
  const locale = useLocale(),
    ar = locale === "ar";
  const {
    branches,
    selectedBranchId: branchId,
    selectedBranch,
    setSelectedBranchId,
    isLoadingBranches,
    branchError,
  } = useAdminBranch();
  const { can } = useAccess();
  const [events, setEvents] = useState<VenueEvent[]>([]),
    [fixtures, setFixtures] = useState<Fixture[]>([]),
    [tables, setTables] = useState<EventTable[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<Fixture | null>(null),
    [attempt, setAttempt] = useState(0),
    [token, setToken] = useState("");
  const [syncStatus, setSyncStatus] = useState<FootballSyncStatus | null>(null);
  const wasSyncing = useRef(false);
  const syncing = syncStatus?.running ?? false;
  const provider = syncStatus?.selectedProvider;
  const widgetProvider =
    provider === "365scores-widget" || provider === "sportscore-widget"
      ? provider
      : null;
  const providerConfigured =
    syncStatus?.providers.find((p) => p.id === provider)?.configured ?? false;
  const base = `/admin/events/${branchId}`;
  useEffect(() => {
    if (!branchId) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      setSelected(null);
      void Promise.all([
        apiClient.get<FootballSyncStatus>(`${base}/sync-status`, {
          signal: abort.signal,
        }),
        apiClient.get<VenueEvent[]>(base, { signal: abort.signal }),
        apiClient.get<Fixture[]>(`${base}/fixtures`, { signal: abort.signal }),
        apiClient.get<EventTable[]>(`${base}/tables`, { signal: abort.signal }),
        apiClient.get<Reservation[]>(`${base}/reservations`, {
          signal: abort.signal,
        }),
      ])
        .then(([status, a, b, c, d]) => {
          if (abort.signal.aborted) return;
          setSyncStatus(status.data);
          setEvents(a.data);
          setFixtures(b.data);
          setTables(c.data);
          setReservations(d.data);
        })
        .catch((e) => {
          if (!abort.signal.aborted) setError(eventError(e, ar));
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [base, branchId, ar, attempt]);
  useEffect(() => {
    if (!branchId) return;
    let disposed = false;
    const abort = new AbortController();
    const check = () => {
      void apiClient
        .get<FootballSyncStatus>(`${base}/sync-status`, {
          signal: abort.signal,
        })
        .then(({ data }) => {
          if (disposed) return;
          setSyncStatus(data);
          if (
            (wasSyncing.current && !data.running) ||
            (provider && provider !== data.selectedProvider)
          )
            setAttempt((n) => n + 1);
          wasSyncing.current = data.running;
        })
        .catch(() => {});
    };
    const timer = setInterval(check, 3000);
    return () => {
      disposed = true;
      abort.abort();
      clearInterval(timer);
    };
  }, [base, branchId, provider]);
  const refreshFixtures = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiClient.post(`${base}/sync`);
      wasSyncing.current = true;
      setSyncStatus((previous) =>
        previous ? { ...previous, running: true, lastError: null } : previous,
      );
    } catch (error) {
      setError(eventError(error, ar));
    } finally {
      setBusy(false);
    }
  };
  const act = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError("");
      setMessage("");
      try {
        await fn();
        setLoading(true);
        setAttempt((n) => n + 1);
        setMessage(ar ? "تم حفظ العملية." : "Action saved.");
      } catch (e) {
        setError(eventError(e, ar));
      } finally {
        setBusy(false);
      }
    },
    [ar],
  );
  return (
    <section className={styles.root} dir={ar ? "rtl" : "ltr"}>
      <header className={styles.header}>
        <div>
          <h1>{ar ? "الفعاليات والمباريات" : "Events & matches"}</h1>
          <p className={styles.muted}>
            {ar
              ? "اختر المباريات التي تعرضها، واستقبل حجوزات طاولاتك."
              : "Choose what you show and take table reservations."}
          </p>
        </div>
        {selectedBranch?.publicCode && (
          <Link
            className={styles.button}
            href={`/events/${selectedBranch.publicCode}`}
          >
            {ar ? "صفحة العميل" : "Customer page"}
          </Link>
        )}
      </header>
      <label className={styles.field}>
        {ar ? "الفرع" : "Branch"}
        <select
          value={branchId}
          disabled={isLoadingBranches || busy}
          onChange={(e) => setSelectedBranchId(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {ar ? b.nameAr || b.name : b.nameEn || b.name}
            </option>
          ))}
        </select>
      </label>
      {branchError && <p role="alert">{branchError}</p>}
      {error && (
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}{" "}
          <button onClick={() => setAttempt((n) => n + 1)}>
            {ar ? "إعادة المحاولة" : "Retry"}
          </button>
        </p>
      )}
      {message && (
        <p role="status" className={`${styles.notice} ${styles.success}`}>
          {message}
        </p>
      )}
      {!branchId ? (
        <p>{ar ? "أضف فرعًا أولًا." : "Create a branch first."}</p>
      ) : loading ? (
        <p role="status">{ar ? "جارٍ التحميل…" : "Loading…"}</p>
      ) : (
        <>
          {syncing && (
            <p role="status">
              {ar
                ? "جارٍ تحديث المباريات في الخلفية. ستتحدث القائمة تلقائيًا."
                : "Fixtures are updating in the background. The list will refresh automatically."}
            </p>
          )}
          <div className={styles.notice}>
            {ar
              ? "الدفع عند الكاشير. الحجز لا ينشئ طلب طعام، وتسجيل استلام الرسوم أو العربون يتم يدويًا بصلاحية الكاشير."
              : "Payment is collected at the cashier. Booking does not create a food order. Authorized staff record receipt of fees or deposits."}
          </div>
          {can("events.manage") && (
            <section className={styles.card}>
              <div className={styles.header}>
                <h2>{ar ? "المباريات القادمة" : "Upcoming fixtures"}</h2>
                <button
                  disabled={busy}
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {ar ? "تحديث القائمة" : "Reload list"}
                </button>
                {!widgetProvider && (
                  <button
                    disabled={busy || syncing || !providerConfigured}
                    onClick={() => void refreshFixtures()}
                  >
                    {busy
                      ? ar
                        ? "جارٍ التحديث…"
                        : "Updating…"
                      : ar
                        ? "تحديث من مزود المباريات"
                        : "Refresh fixtures"}
                  </button>
                )}
              </div>
              <label className={styles.field}>
                {ar ? "مصدر المباريات" : "Fixture provider"}
                <select
                  aria-label={ar ? "مصدر المباريات" : "Fixture provider"}
                  value={provider || "api-football"}
                  disabled={busy || !syncStatus}
                  aria-describedby="football-provider-help"
                  onChange={(e) => {
                    const next = e.target.value as FootballProvider;
                    wasSyncing.current = false;
                    void act(() =>
                      apiClient.put(`${base}/provider`, { provider: next }),
                    );
                  }}
                >
                  {Object.entries(providerNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p id="football-provider-help" className={styles.muted}>
                {ar
                  ? "يُحفظ الاختيار لهذا الفرع. الحجوزات والمباريات المفعّلة تبقى مرتبطة بمصدرها الأصلي."
                  : "Saved for this branch. Existing events and reservations keep their original source."}
              </p>
              {widgetProvider ? (
                <ScheduleWidget
                  key={`${branchId}:${widgetProvider}`}
                  provider={widgetProvider}
                  ar={ar}
                />
              ) : (
                <>
                  <p className={styles.muted}>
                    {provider === "thesportsdb"
                      ? ar
                        ? "يعمل بالمفتاح المجاني المشترك تلقائيًا. الخطة المجانية تعرض المباراة القادمة فقط لكل دوري."
                        : "Uses the shared free key automatically. The free plan returns only the next match per league."
                      : provider === "openfootapi"
                        ? ar
                          ? "يتطلب المفتاح السري الكامل من OpenFootAPI. معرّف المفتاح لا يكفي. بعض المباريات لا تتضمن شعارات."
                          : "Requires your full OpenFootAPI secret key. The key identifier is not enough. Some fixtures have no logos."
                        : ar
                          ? "قد لا تشمل الخطة المجانية الموسم الحالي. تحقق من تغطية حساب API-Football."
                          : "The free plan may exclude the current season. Check your API-Football account coverage."}
                  </p>
                  {!providerConfigured && (
                    <p role="status" className={styles.notice}>
                      {eventErrorCode("FOOTBALL_NOT_CONFIGURED", ar)}
                    </p>
                  )}
                  {syncStatus?.lastError && (
                    <p
                      role="alert"
                      className={`${styles.notice} ${styles.error}`}
                    >
                      {eventErrorCode(syncStatus.lastError, ar)}
                    </p>
                  )}
                  {syncStatus?.partial && (
                    <p role="status" className={styles.notice}>
                      {ar
                        ? "تغطية محدودة: قد تكون القائمة مختصرة بسبب قيود المزود أو الخطة."
                        : "Limited coverage: the provider or plan may return only part of the fixture list."}
                    </p>
                  )}
                  {syncStatus?.lastCompletedAt && (
                    <p className={styles.muted}>
                      {ar ? "آخر تحديث: " : "Last refresh: "}
                      {new Date(syncStatus.lastCompletedAt).toLocaleString(
                        locale,
                        { timeZone: "Asia/Riyadh" },
                      )}
                    </p>
                  )}
                  <label className={styles.field}>
                    {ar ? "اختر مباراة لإعداد عرضها" : "Choose a match to show"}
                    <select
                      aria-label={
                        ar
                          ? "اختر مباراة لإعداد عرضها"
                          : "Choose a match to show"
                      }
                      disabled={busy}
                      value={selected?.id || ""}
                      onChange={(e) =>
                        setSelected(
                          fixtures.find((f) => f.id === e.target.value) || null,
                        )
                      }
                    >
                      <option value="">
                        {ar ? "اختر مباراة" : "Select a match"}
                      </option>
                      {fixtures.map((f) => (
                        <option key={f.id} value={f.id}>
                          {matchName(f, ar)} ·{" "}
                          {new Date(f.kickoff).toLocaleDateString(locale, {
                            timeZone: "Asia/Riyadh",
                          })}
                        </option>
                      ))}
                    </select>
                  </label>
                  {fixtures.length === 0 && (
                    <p className={styles.muted}>
                      {ar
                        ? "لا توجد مباريات قادمة مخزنة لهذا المزود. حدّث المباريات أو اختر مصدرًا آخر."
                        : "No upcoming matches cached for this provider. Refresh fixtures or choose another source."}
                    </p>
                  )}
                </>
              )}
            </section>
          )}
          {selected && can("events.manage") && (
            <EventEditor
              key={`${branchId}:${selected.id}:${attempt}`}
              fixture={selected}
              existing={events.find((e) => e.fixtureId === selected.id)}
              tables={tables}
              busy={busy}
              onSave={(data) => act(() => apiClient.put(base, data))}
            />
          )}
          <section className={styles.form}>
            <h2>{ar ? "المباريات في هذا الفرع" : "This branch’s matches"}</h2>
            <div className={styles.grid}>
              {events.length === 0 ? (
                <p className={styles.muted}>
                  {ar ? "لم تفعّل أي مباراة بعد." : "No matches enabled yet."}
                </p>
              ) : (
                events.map((event) => (
                  <article key={event.id} className={styles.card}>
                    <MatchHeading fixture={event.fixture} locale={locale} />
                    <p>
                      {event.showing
                        ? ar
                          ? "تُعرض هنا"
                          : "Showing here"
                        : ar
                          ? "غير مفعّلة"
                          : "Not showing"}{" "}
                      ·{" "}
                      {event.bookingOpen
                        ? ar
                          ? "الحجز مفتوح"
                          : "Booking open"
                        : ar
                          ? "الحجز مغلق"
                          : "Booking closed"}
                    </p>
                    {event.reviewRequired && (
                      <p role="status" className={styles.notice}>
                        {ar
                          ? "تغير موعد المباراة أو حالتها. راجع الحجوزات قبل إعادة فتحها."
                          : "The match time or status changed. Review reservations before reopening."}
                      </p>
                    )}
                    {can("events.manage") && (
                      <div className={styles.row}>
                        <button
                          disabled={busy}
                          onClick={() => setSelected(event.fixture)}
                        >
                          {ar ? "الإعدادات" : "Settings"}
                        </button>
                        <button
                          disabled={busy || !event.showing}
                          onClick={() => {
                            if (
                              window.confirm(
                                ar
                                  ? "إلغاء الفعالية وكل حجوزاتها؟ المبالغ المستلمة تصبح مستحقة للاسترداد عند الكاشير."
                                  : "Cancel this event and its reservations? Collected payments become due for cashier refund.",
                              )
                            )
                              void act(() =>
                                apiClient.post(`${base}/${event.id}/cancel`),
                              );
                          }}
                        >
                          {ar ? "إلغاء الفعالية" : "Cancel event"}
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
          {can("events.checkin") && (
            <form
              className={styles.card}
              onSubmit={(e) => {
                e.preventDefault();
                void act(() =>
                  apiClient.post(`${base}/check-in`, { token: token.trim() }),
                );
              }}
            >
              <h2>{ar ? "تأكيد الحضور" : "Check in a guest"}</h2>
              <label className={styles.field}>
                {ar ? "رمز الحجز من العميل" : "Customer reservation code"}
                <input
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  pattern="[a-f0-9]{64}"
                  dir="ltr"
                />
              </label>
              <button className={styles.primary} disabled={busy}>
                {ar ? "تأكيد وصول العميل" : "Confirm arrival"}
              </button>
            </form>
          )}
          <section className={styles.form}>
            <div className={styles.header}>
              <h2>{ar ? "الحجوزات والكاشير" : "Reservations & cashier"}</h2>
              <button disabled={busy} onClick={() => setAttempt((n) => n + 1)}>
                {ar ? "تحديث" : "Refresh"}
              </button>
            </div>
            {reservations.length === 0 ? (
              <p>{ar ? "لا توجد حجوزات بعد." : "No reservations yet."}</p>
            ) : (
              reservations.map((r) => (
                <CashierReservation
                  key={r.id}
                  reservation={r}
                  base={base}
                  busy={busy}
                  canCashier={can("events.cashier")}
                  act={act}
                />
              ))
            )}
          </section>
          {can("events.manage") && (
            <section className={styles.card}>
              <h2>{ar ? "سعة الطاولات" : "Table capacity"}</h2>
              <p className={styles.muted}>
                {ar
                  ? "اضبط السعة الفعلية قبل فتح الحجز. القيمة الأولية 4 مقاعد لكل طاولة."
                  : "Set actual capacities before opening reservations. Existing tables start at 4 seats."}
              </p>
              {tables.map((table) => (
                <form
                  className={styles.row}
                  key={table.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const capacity = Number(
                      new FormData(e.currentTarget).get("capacity"),
                    );
                    void act(() =>
                      apiClient.put(`${base}/tables/${table.id}/capacity`, {
                        capacity,
                      }),
                    );
                  }}
                >
                  <label className={styles.field}>
                    {ar ? "طاولة" : "Table"} {table.number}
                    <input
                      name="capacity"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={table.capacity}
                      required
                    />
                  </label>
                  <button disabled={busy}>
                    {ar ? "حفظ السعة" : "Save capacity"}
                  </button>
                </form>
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
function EventEditor({
  fixture,
  existing,
  tables,
  busy,
  onSave,
}: {
  fixture: Fixture;
  existing?: VenueEvent;
  tables: EventTable[];
  busy: boolean;
  onSave: (data: unknown) => Promise<void>;
}) {
  const locale = useLocale(),
    ar = locale === "ar";
  const [mode, setMode] = useState(existing?.paymentMode || "free");
  const local = (date: string | number) =>
    new Date(new Date(date).getTime() + 3 * 3600000).toISOString().slice(0, 16);
  return (
    <form
      className={styles.card}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          fixtureId: fixture.id,
          showing: f.has("showing"),
          bookingOpen: f.has("open"),
          startsAt: new Date(`${f.get("start")}:00+03:00`).toISOString(),
          endsAt: new Date(`${f.get("end")}:00+03:00`).toISOString(),
          paymentMode: mode,
          amountMinor:
            mode === "free" ? 0 : Math.round(Number(f.get("amount")) * 100),
          cancellationHours: Number(f.get("hours")),
          tableIds: f.getAll("table"),
        });
      }}
    >
      <MatchHeading fixture={fixture} locale={locale} />
      <div className={styles.row}>
        <label className={styles.tableOption}>
          <input
            type="checkbox"
            name="showing"
            defaultChecked={existing?.showing ?? true}
          />
          {ar ? "تُعرض المباراة هنا" : "Showing this match"}
        </label>
        <label className={styles.tableOption}>
          <input
            type="checkbox"
            name="open"
            defaultChecked={existing?.bookingOpen ?? false}
          />
          {ar ? "فتح الحجز" : "Open reservations"}
        </label>
      </div>
      <div className={styles.grid}>
        <label className={styles.field}>
          {ar ? "بداية حجز الطاولة — الرياض" : "Table window starts — Riyadh"}
          <input
            name="start"
            type="datetime-local"
            defaultValue={local(
              existing?.startsAt ||
                new Date(fixture.kickoff).getTime() - 3600000,
            )}
            required
          />
        </label>
        <label className={styles.field}>
          {ar ? "نهاية حجز الطاولة — الرياض" : "Table window ends — Riyadh"}
          <input
            name="end"
            type="datetime-local"
            defaultValue={local(
              existing?.endsAt ||
                new Date(fixture.kickoff).getTime() + 3 * 3600000,
            )}
            required
          />
        </label>
      </div>
      <label className={styles.field}>
        {ar ? "نوع الحجز" : "Reservation policy"}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as VenueEvent["paymentMode"])}
        >
          <option value="free">{ar ? "مجاني" : "Free"}</option>
          <option value="fee">
            {ar
              ? "رسوم غير مستردة عند إلغاء العميل"
              : "Non-refundable booking fee"}
          </option>
          <option value="deposit">
            {ar ? "عربون يُخصم من الطلب" : "Deposit credited toward orders"}
          </option>
        </select>
      </label>
      {mode !== "free" && (
        <label className={styles.field}>
          {ar ? "المبلغ لكل طاولة — ريال" : "Amount per table — SAR"}
          <input
            name="amount"
            type="number"
            min={1}
            max={10000}
            step="0.01"
            defaultValue={(existing?.amountMinor || 2500) / 100}
            required
          />
        </label>
      )}
      <label className={styles.field}>
        {ar
          ? "مهلة استرداد العربون قبل بداية المباراة — ساعات"
          : "Deposit refund cutoff before kickoff — hours"}
        <input
          name="hours"
          type="number"
          min={0}
          max={720}
          defaultValue={existing?.cancellationHours ?? 24}
          required
        />
      </label>
      <fieldset className={styles.form}>
        <legend>
          {ar ? "الطاولات المتاحة للحجز" : "Tables offered for reservation"}
        </legend>
        <div className={styles.grid}>
          {tables.map((table) => (
            <label key={table.id} className={styles.tableOption}>
              <input
                type="checkbox"
                name="table"
                value={table.id}
                defaultChecked={
                  existing
                    ? existing.tables?.some((t) => t.tableId === table.id)
                    : true
                }
              />
              {ar ? "طاولة" : "Table"} {table.number} · {table.capacity}{" "}
              {ar ? "مقاعد" : "seats"}
            </label>
          ))}
        </div>
      </fieldset>
      <button className={styles.primary} disabled={busy || tables.length === 0}>
        {ar ? "حفظ إعدادات المباراة" : "Save match settings"}
      </button>
    </form>
  );
}
function CashierReservation({
  reservation: r,
  base,
  busy,
  canCashier,
  act,
}: {
  reservation: Reservation;
  base: string;
  busy: boolean;
  canCashier: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const ar = useLocale() === "ar";
  const [orders, setOrders] = useState<
      {
        id: string;
        orderNumber: number;
        totalMinor: number;
        creditMinor: number;
      }[]
    >([]),
    [error, setError] = useState("");
  const remaining =
    (r.amountMinor || 0) -
    (r.credits || []).reduce((sum, c) => sum + c.amountMinor, 0);
  const paymentNames: Record<string, string> = ar
    ? {
        unpaid: "مستحق عند الكاشير",
        paid: "تم الاستلام",
        refund_due: "مستحق للاسترداد",
        refunded: "تم الاسترداد",
        forfeited: "غير مسترد حسب السياسة",
        not_required: "مجاني",
        void: "لا يوجد مبلغ مستحق",
      }
    : {
        unpaid: "Due at cashier",
        paid: "Collected",
        refund_due: "Refund due",
        refunded: "Refunded",
        forfeited: "Retained under policy",
        not_required: "Free",
        void: "Nothing due",
      };
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h2>
          {r.customerName} · {ar ? "طاولة" : "Table"} {r.table.number}
        </h2>
        <span>{reservationStatus(r.status, ar)}</span>
      </div>
      <p>
        {matchName(r.event.fixture, ar)} · <bdi>{r.phone}</bdi> · {r.guests}{" "}
        {ar ? "ضيوف" : "guests"}
      </p>
      <p>
        {paymentNames[r.paymentStatus || "not_required"]} ·{" "}
        {((r.amountMinor || 0) / 100).toFixed(2)} SAR
      </p>
      {error && <p role="alert">{error}</p>}
      {canCashier && (
        <div className={styles.row}>
          {r.paymentStatus === "unpaid" &&
            ["confirmed", "checked_in"].includes(r.status) && (
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      ar
                        ? "هل استلمت المبلغ كاملًا بالفعل؟"
                        : "Have you actually received the full amount?",
                    )
                  )
                    void act(() =>
                      apiClient.post(`${base}/reservations/${r.id}/collect`),
                    );
                }}
              >
                {ar ? "تسجيل استلام المبلغ" : "Record payment received"}
              </button>
            )}
          {r.paymentStatus === "refund_due" && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    ar
                      ? "هل أعدت المبلغ كاملًا للعميل بالفعل؟"
                      : "Have you actually returned the full amount to the customer?",
                  )
                )
                  void act(() =>
                    apiClient.post(`${base}/reservations/${r.id}/refund`),
                  );
              }}
            >
              {ar ? "تسجيل إعادة المبلغ" : "Record refund handed over"}
            </button>
          )}
          {r.status === "checked_in" &&
            r.paymentMode === "deposit" &&
            r.paymentStatus === "paid" && (
              <>
                <p>
                  {ar ? "رصيد العربون المتبقي" : "Remaining deposit"}:{" "}
                  {(remaining / 100).toFixed(2)} SAR
                </p>
                <button
                  disabled={busy}
                  onClick={async () => {
                    try {
                      setError("");
                      const { data } = await apiClient.get(
                        `${base}/reservations/${r.id}/orders`,
                      );
                      setOrders(data);
                      if (!data.length)
                        setError(
                          ar
                            ? "لا توجد طلبات بعد تأكيد الحضور."
                            : "No orders since check-in.",
                        );
                    } catch (e) {
                      setError(eventError(e, ar));
                    }
                  }}
                >
                  {ar ? "عرض طلبات الزيارة" : "Show visit orders"}
                </button>
              </>
            )}
        </div>
      )}
      {orders.map((order) => (
        <div className={styles.row} key={order.id}>
          <span>
            #{order.orderNumber} · {ar ? "قيمة الطلب" : "Order total"}{" "}
            {(order.totalMinor / 100).toFixed(2)} SAR ·{" "}
            {ar ? "العربون المخصوم" : "Deposit applied"}{" "}
            {(
              (r.credits?.find((c) => c.orderId === order.id)?.amountMinor ||
                order.creditMinor) / 100
            ).toFixed(2)}{" "}
            SAR · {ar ? "المتبقي على الطلب" : "Remaining order amount"}{" "}
            {(
              (order.totalMinor -
                (r.credits?.find((c) => c.orderId === order.id)?.amountMinor ||
                  order.creditMinor)) /
              100
            ).toFixed(2)}{" "}
            SAR
          </span>
          {canCashier && (
            <button
              disabled={
                busy ||
                remaining <= 0 ||
                order.creditMinor > 0 ||
                r.credits?.some((c) => c.orderId === order.id)
              }
              onClick={() =>
                void act(() =>
                  apiClient.post(`${base}/reservations/${r.id}/credit`, {
                    orderId: order.id,
                  }),
                )
              }
            >
              {ar ? "خصم العربون من الطلب" : "Apply deposit to order"}
            </button>
          )}
        </div>
      ))}
    </article>
  );
}
