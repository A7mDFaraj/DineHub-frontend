"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { useAccess } from "@/lib/access-context";
import { apiClient } from "@/lib/api-client";
import { Link } from "@/i18n/navigation";
import { MatchHeading } from "./match-heading";
import { eventError } from "./errors";
import { GeneralEventBuilder } from "./general-event-builder";
import { FootballHub } from "./football-hub";
import {
  matchName,
  matchTime,
  reservationStatus,
  type FootballSyncStatus,
  type FootballProvider,
  type EventTable,
  type Fixture,
  type Reservation,
  type VenueEvent,
} from "./types";
import {
  Globe,
  Sparkles,
  LayoutGrid,
  Receipt,
  Ticket,
  Clock,
  Hourglass,
  Music,
  Trophy,
  CalendarDays,
  CalendarX2,
  RefreshCw,
  Play,
  Pause,
  Ban,
  Trash2,
  Check,
  X,
  Banknote,
  RotateCcw,
  Utensils,
  ArrowRight,
} from "lucide-react";
import styles from "./events.module.css";

type EventTab = "general" | "football" | "scheduled" | "cashier";
type ScheduledFilter = "all" | "active" | "cancelled";

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

  const [activeTab, setActiveTab] = useState<EventTab>("general");
  const [scheduledFilter, setScheduledFilter] = useState<ScheduledFilter>("all");
  const [eventToDelete, setEventToDelete] = useState<VenueEvent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [events, setEvents] = useState<VenueEvent[]>([]),
    [fixtures, setFixtures] = useState<Fixture[]>([]),
    [tables, setTables] = useState<EventTable[]>([]),
    [reservations, setReservations] = useState<Reservation[]>([]);

  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(0),
    [token, setToken] = useState("");

  const [syncStatus, setSyncStatus] = useState<FootballSyncStatus | null>(null);
  const provider = syncStatus?.selectedProvider;
  const syncing = syncStatus?.running ?? false;

  const widgetProvider =
    provider === "365scores-widget" || provider === "sportscore-widget"
      ? provider
      : null;
  const isNoApiMode = Boolean(widgetProvider) || provider === "manual";
  const providerConfigured =
    syncStatus?.providers.find((p) => p.id === provider)?.configured ?? false;

  const base = `/admin/events/${branchId}`;

  // 1. Initial Load of all branch events data
  useEffect(() => {
    if (!branchId) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
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

  // 2. Fixed Bounded Sync-Status Polling
  // ONLY poll when syncStatus.running is true! Zero polling when idle!
  useEffect(() => {
    if (!branchId || !syncing) return;

    let disposed = false;
    let pollCount = 0;
    const maxPolls = 15; // 45s safety limit

    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        setSyncStatus((prev) => (prev ? { ...prev, running: false } : prev));
        return;
      }

      void apiClient
        .get<FootballSyncStatus>(`${base}/sync-status`)
        .then(({ data }) => {
          if (disposed) return;
          setSyncStatus(data);
          if (!data.running) {
            clearInterval(interval);
            // Reload fixtures and events once after sync finishes
            void Promise.all([
              apiClient.get<VenueEvent[]>(base),
              apiClient.get<Fixture[]>(`${base}/fixtures`),
            ]).then(([evRes, fixRes]) => {
              if (disposed) return;
              setEvents(evRes.data);
              setFixtures(fixRes.data);
              setMessage(
                ar
                  ? "اكتمل تحديث المباريات من المزود بنجاح."
                  : "Fixtures refreshed from provider successfully.",
              );
            }).catch(() => {});
          }
        })
        .catch(() => {
          if (!disposed) clearInterval(interval);
        });
    }, 3000);

    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [base, branchId, syncing, ar]);

  const refreshFixtures = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await apiClient.post(`${base}/sync`);
      setSyncStatus((previous) =>
        previous ? { ...previous, running: true, lastError: null } : previous,
      );
    } catch (error) {
      setError(eventError(error, ar));
    } finally {
      setBusy(false);
    }
  };

  const handleProviderChange = async (nextProvider: FootballProvider) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await apiClient.put<FootballSyncStatus>(
        `${base}/provider`,
        { provider: nextProvider },
      );
      setSyncStatus(data);
      const { data: updatedFixtures } = await apiClient.get<Fixture[]>(
        `${base}/fixtures`,
      );
      setFixtures(updatedFixtures);
      setMessage(
        ar
          ? "تم تحديث مصدر المباريات بنجاح."
          : "Match provider updated successfully.",
      );
    } catch (e) {
      setError(eventError(e, ar));
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
        setAttempt((n) => n + 1);
        setMessage(ar ? "تم حفظ العملية بنجاح." : "Action saved successfully.");
      } catch (e) {
        setError(eventError(e, ar));
      } finally {
        setBusy(false);
      }
    },
    [ar],
  );

  // Reservation stats
  const pendingApprovalsCount = reservations.filter(
    (r) => r.status === "pending_approval",
  ).length;

  const scheduledCounts = {
    all: events.length,
    active: events.filter((e) => e.showing || e.bookingOpen).length,
    cancelled: events.filter((e) => !e.showing && !e.bookingOpen).length,
  };

  const filteredScheduledEvents = events.filter((e) => {
    const isCancelled = !e.showing && !e.bookingOpen;
    if (scheduledFilter === "active") return !isCancelled;
    if (scheduledFilter === "cancelled") return isCancelled;
    return true;
  });

  const handleDeleteEvent = async (event: VenueEvent) => {
    setBusy(true);
    setDeletingId(event.id);
    setError("");
    setMessage("");
    try {
      await apiClient.delete(`${base}/${event.id}`);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setEventToDelete(null);
      setMessage(
        ar ? "تم حذف الفعالية نهائيًا بنجاح." : "Event permanently deleted successfully.",
      );
    } catch (err) {
      setError(eventError(err, ar));
    } finally {
      setBusy(false);
      setDeletingId(null);
    }
  };

  return (
    <section className={styles.root} dir={ar ? "rtl" : "ltr"}>
      {/* Top Header */}
      <header className={styles.header}>
        <div>
          <h1>{ar ? "إدارة الفعاليات والمباريات" : "Events & Match Management"}</h1>
          <p className={styles.muted}>
            {ar
              ? "استضف أمسيات موسيقية، مباريات دوري روشن، أو عروض حية، واستقبل حجوزات طاولاتك بسهولة."
              : "Host musical nights, Saudi Pro League matches, or live shows with seamless table booking."}
          </p>
        </div>
        {selectedBranch?.publicCode && (
          <Link
            className={styles.button}
            href={`/events/${selectedBranch.publicCode}`}
            target="_blank"
          >
            <Globe size={16} />
            <span>{ar ? "صفحة العميل للحجوزات" : "Customer Booking Page"}</span>
          </Link>
        )}
      </header>

      {/* Branch Selector */}
      <label className={styles.field}>
        <span>{ar ? "الفرع المختار" : "Selected Branch"}</span>
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

      {branchError && <p role="alert" className={`${styles.notice} ${styles.error}`}>{branchError}</p>}
      {error && (
        <p role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
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
        <p className={styles.notice}>{ar ? "يرجى اختيار فرع أولاً." : "Select a branch first."}</p>
      ) : loading ? (
        <p role="status" className={styles.notice}>{ar ? "جارٍ التحميل…" : "Loading…"}</p>
      ) : (
        <>
          {/* Quick Stats Strip */}
          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{events.length}</span>
                <span className={styles.statLabel}>
                  {ar ? "فعاليات مفعّلة" : "Active Events"}
                </span>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <LayoutGrid size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{tables.length}</span>
                <span className={styles.statLabel}>
                  {ar ? "طاولات بالفرع" : "Branch Tables"}
                </span>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statIcon}>
                <Receipt size={20} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{reservations.length}</span>
                <span className={styles.statLabel}>
                  {ar ? "إجمالي الحجوزات" : "Total Bookings"}
                </span>
              </div>
            </div>
            {pendingApprovalsCount > 0 && (
              <div className={styles.statItem} style={{ borderColor: "#f59e0b" }}>
                <div className={styles.statIcon} style={{ color: "#f59e0b" }}>
                  <Hourglass size={20} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statNumber} style={{ color: "#f59e0b" }}>
                    {pendingApprovalsCount}
                  </span>
                  <span className={styles.statLabel}>
                    {ar ? "بانتظار موافقتك" : "Pending Approval"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "general" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("general")}
            >
              <Music size={17} />
              <span>{ar ? "استضافة فعالية وعروض" : "Host Musical & Live Event"}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "football" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("football")}
            >
              <Trophy size={17} />
              <span>{ar ? "مباريات كرة القدم (دوري روشن)" : "Football Matches"}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "scheduled" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("scheduled")}
            >
              <CalendarDays size={17} />
              <span>{ar ? "الفعاليات المجدولة" : "Scheduled Events"}</span>
              <span className={styles.tabBadge}>{events.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "cashier" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("cashier")}
            >
              <Receipt size={17} />
              <span>{ar ? "الحجوزات والكاشير" : "Reservations & Cashier"}</span>
              {pendingApprovalsCount > 0 && (
                <span className={styles.tabBadge} style={{ background: "#f59e0b", color: "#000" }}>
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: General & Musical Events */}
          {activeTab === "general" && can("events.manage") && (
            <GeneralEventBuilder
              base={base}
              tables={tables}
              ar={ar}
              busy={busy}
              onEventCreated={(createdEvent) => {
                setEvents((prev) => [createdEvent, ...prev]);
                setMessage(
                  ar
                    ? "تم نشر الفعالية وتفعيل حجز الطاولات بنجاح!"
                    : "Event published and table bookings activated successfully!",
                );
                setActiveTab("scheduled");
              }}
            />
          )}

          {/* TAB 2: Football Matches */}
          {activeTab === "football" && can("events.manage") && (
            <FootballHub
              base={base}
              tables={tables}
              fixtures={fixtures}
              events={events}
              syncStatus={syncStatus}
              provider={provider}
              providerConfigured={providerConfigured}
              isNoApiMode={isNoApiMode}
              widgetProvider={widgetProvider}
              syncing={syncing}
              ar={ar}
              busy={busy}
              onRefreshFixtures={refreshFixtures}
              onProviderChange={handleProviderChange}
              onFixtureCreated={(newFixture) => {
                setFixtures((prev) => [newFixture, ...prev]);
              }}
              onEventSaved={(savedEvent) => {
                setEvents((prev) => {
                  const filtered = prev.filter((e) => e.id !== savedEvent.id);
                  return [savedEvent, ...filtered];
                });
                setMessage(
                  ar
                    ? "تم تفعيل حجز طاولات المباراة بنجاح!"
                    : "Match reservations configured successfully!",
                );
              }}
            />
          )}

          {/* TAB 3: Scheduled Events in this Branch */}
          {activeTab === "scheduled" && (
            <section className={styles.form}>
              <div className={styles.header}>
                <div>
                  <h2>{ar ? "الفعاليات المجدولة في هذا الفرع" : "Scheduled Events at this Branch"}</h2>
                  <p className={styles.muted}>
                    {ar
                      ? "جميع الأمسيات والمباريات التي تم تجهيزها وحجز طاولاتها للعملاء."
                      : "All events and match viewings prepared for guests."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className={styles.button}
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  <RefreshCw size={15} className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
                  <span>{ar ? "تحديث القائمة" : "Refresh"}</span>
                </button>
              </div>

              {/* Status Filter Toolbar */}
              <div className={styles.scheduledToolbar}>
                <div className={styles.scheduledFilters} role="group" aria-label="Filter events">
                  <button
                    type="button"
                    className={styles.scheduledFilterBtn}
                    aria-pressed={scheduledFilter === "all"}
                    onClick={() => setScheduledFilter("all")}
                  >
                    <span>{ar ? "الكل" : "All"}</span>
                    <span className={styles.scheduledFilterCount}>{scheduledCounts.all}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.scheduledFilterBtn}
                    aria-pressed={scheduledFilter === "active"}
                    onClick={() => setScheduledFilter("active")}
                  >
                    <span>{ar ? "نشطة ومفتوحة" : "Active & Open"}</span>
                    <span className={styles.scheduledFilterCount}>{scheduledCounts.active}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.scheduledFilterBtn}
                    aria-pressed={scheduledFilter === "cancelled"}
                    onClick={() => setScheduledFilter("cancelled")}
                  >
                    <span>{ar ? "ملغية أو مغلقة" : "Cancelled / Inactive"}</span>
                    <span className={styles.scheduledFilterCount}>{scheduledCounts.cancelled}</span>
                  </button>
                </div>
              </div>

              {filteredScheduledEvents.length === 0 ? (
                <div className={styles.card} style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                    <div
                      className={styles.modalIconDanger}
                      style={{
                        background: "rgba(223, 210, 235, 0.08)",
                        borderColor: "rgba(223, 210, 235, 0.16)",
                        color: "var(--admin-muted, #c5b9ca)",
                        width: "56px",
                        height: "56px",
                      }}
                    >
                      <CalendarX2 size={28} />
                    </div>
                  </div>
                  <h3>
                    {scheduledFilter === "cancelled"
                      ? ar
                        ? "لا توجد فعاليات ملغية"
                        : "No cancelled events"
                      : scheduledFilter === "active"
                        ? ar
                          ? "لا توجد فعاليات نشطة حاليًا"
                          : "No active events"
                        : ar
                          ? "لا توجد فعاليات أو مباريات مجدولة بعد"
                          : "No events scheduled yet"}
                  </h3>
                  <p className={styles.muted} style={{ maxWidth: "480px", marginInline: "auto" }}>
                    {ar
                      ? "ابدأ باستضافة أمسية موسيقية أو مباراة دوري روشن عبر التبويبات أعلاه لفتح الحجوزات لضيوفك."
                      : "Host a live music night or a football match from the tabs above to start taking table bookings."}
                  </p>
                  <div style={{ marginTop: "18px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={() => setActiveTab("general")}
                    >
                      <Music size={16} />
                      <span>{ar ? "استضافة فعالية موسيقية" : "Host Music Event"}</span>
                    </button>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={() => setActiveTab("football")}
                    >
                      <Trophy size={16} />
                      <span>{ar ? "إضافة مباراة دوري روشن" : "Add Saudi Match"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.grid}>
                  {filteredScheduledEvents.map((event) => {
                    const instoreCount =
                      (event.fixture?.sourceMeta?.inStoreOnlyTableIds as string[])
                        ?.length || 0;
                    const isCancelled = !event.showing && !event.bookingOpen;
                    return (
                      <article
                        key={event.id}
                        className={`${styles.card} ${isCancelled ? styles.cardCancelled : styles.cardActive}`}
                      >
                        <MatchHeading fixture={event.fixture} locale={locale} />
                        <div className={styles.row}>
                          {!isCancelled ? (
                            <>
                              <span
                                className={`${styles.statusBadge} ${
                                  event.showing ? styles.badgeOnline : styles.badgeExcluded
                                }`}
                              >
                                {event.showing ? (
                                  <>
                                    <Check size={12} />
                                    <span>{ar ? "معروض في المحل" : "Showing"}</span>
                                  </>
                                ) : (
                                  <>
                                    <X size={12} />
                                    <span>{ar ? "غير مفعّل" : "Hidden"}</span>
                                  </>
                                )}
                              </span>
                              <span
                                className={`${styles.statusBadge} ${
                                  event.bookingOpen ? styles.badgeOnline : styles.badgeExcluded
                                }`}
                              >
                                {event.bookingOpen ? (
                                  <>
                                    <Check size={12} />
                                    <span>{ar ? "الحجز مفتوح" : "Booking Open"}</span>
                                  </>
                                ) : (
                                  <>
                                    <X size={12} />
                                    <span>{ar ? "الحجز مغلق" : "Booking Closed"}</span>
                                  </>
                                )}
                              </span>
                            </>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.badgeExcluded}`}>
                              <Ban size={12} />
                              <span>{ar ? "ملغية / غير مفعّلة" : "Cancelled / Inactive"}</span>
                            </span>
                          )}
                          <span className={styles.statsPill}>
                            <Ticket size={13} style={{ display: "inline", verticalAlign: "-2px", marginInlineEnd: 4 }} />
                            {event.paymentMode === "free"
                              ? ar ? "حجز مجاني" : "Free"
                              : event.paymentMode === "deposit"
                                ? `${(event.amountMinor || 0) / 100} ${ar ? "ريال عربون" : "SAR deposit"}`
                                : `${(event.amountMinor || 0) / 100} ${ar ? "ريال رسوم" : "SAR fee"}`}
                          </span>
                        </div>

                        <p className={styles.muted} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={15} style={{ flexShrink: 0, color: "var(--admin-muted, #c5b9ca)" }} />
                          <span>{matchTime(event.startsAt, locale)}</span>
                          <ArrowRight size={13} style={{ flexShrink: 0 }} className="rtl:rotate-180" />
                          <span>{matchTime(event.endsAt, locale)}</span>
                        </p>

                        <p className={styles.muted} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <LayoutGrid size={15} style={{ flexShrink: 0, color: "var(--admin-muted, #c5b9ca)" }} />
                          <span>
                            {event.tables?.length || 0} {ar ? "طاولات محجوزة للفعالية" : "tables allocated"}
                            {instoreCount > 0 && (
                              <span> ({instoreCount} {ar ? "في المحل فقط" : "in-store only"})</span>
                            )}
                          </span>
                        </p>

                        {event.reviewRequired && (
                          <p role="status" className={`${styles.notice} ${styles.error}`}>
                            {ar
                              ? "تغير موعد المباراة أو حالتها. يرجى مراجعة الحجوزات قبل إعادة فتحها."
                              : "Match schedule changed. Review reservations before reopening."}
                          </p>
                        )}

                        {can("events.manage") && (
                          <div className={styles.row} style={{ marginTop: "10px", justifyContent: "space-between" }}>
                            {!isCancelled ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className={styles.button}
                                  onClick={() => {
                                    void act(() =>
                                      apiClient.put(base, {
                                        fixtureId: event.fixtureId,
                                        showing: event.showing,
                                        bookingOpen: !event.bookingOpen,
                                        requiresApproval: event.fixture?.sourceMeta?.requiresApproval,
                                        startsAt: event.startsAt,
                                        endsAt: event.endsAt,
                                        paymentMode: event.paymentMode,
                                        amountMinor: event.amountMinor,
                                        cancellationHours: event.cancellationHours,
                                        tableIds: event.tables?.map((t) => t.tableId) || [],
                                        inStoreOnlyTableIds:
                                          event.fixture?.sourceMeta?.inStoreOnlyTableIds || [],
                                      }),
                                    );
                                  }}
                                >
                                  {event.bookingOpen ? (
                                    <>
                                      <Pause size={15} />
                                      <span>{ar ? "إيقاف الحجز مؤقتًا" : "Pause Booking"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play size={15} />
                                      <span>{ar ? "فتح الحجز للعملاء" : "Open Booking"}</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className={styles.deleteBtn}
                                  style={{ borderColor: "rgba(244, 63, 94, 0.3)", color: "#ffadad" }}
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
                                  <Ban size={15} />
                                  <span>{ar ? "إلغاء الفعالية" : "Cancel Event"}</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className={styles.reopenBtn}
                                  onClick={() => {
                                    void act(() =>
                                      apiClient.put(base, {
                                        fixtureId: event.fixtureId,
                                        showing: true,
                                        bookingOpen: true,
                                        requiresApproval: event.fixture?.sourceMeta?.requiresApproval,
                                        startsAt: event.startsAt,
                                        endsAt: event.endsAt,
                                        paymentMode: event.paymentMode,
                                        amountMinor: event.amountMinor,
                                        cancellationHours: event.cancellationHours,
                                        tableIds: event.tables?.map((t) => t.tableId) || [],
                                        inStoreOnlyTableIds:
                                          event.fixture?.sourceMeta?.inStoreOnlyTableIds || [],
                                      }),
                                    );
                                  }}
                                >
                                  <Play size={15} />
                                  <span>{ar ? "إعادة تفعيل الحجز" : "Re-open Booking"}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busy || deletingId === event.id}
                                  className={styles.deleteBtn}
                                  onClick={() => setEventToDelete(event)}
                                >
                                  <Trash2 size={15} />
                                  <span>{ar ? "حذف الفعالية" : "Delete Event"}</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* TAB 4: Reservations, Cashier & Table Capacities */}
          {activeTab === "cashier" && (
            <section className={styles.form}>
              {/* Check-in Guest Form */}
              {can("events.checkin") && (
                <form
                  className={styles.card}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!token.trim()) return;
                    void act(() =>
                      apiClient.post(`${base}/check-in`, { token: token.trim() }),
                    );
                    setToken("");
                  }}
                >
                  <div className={styles.header}>
                    <div>
                      <h2>{ar ? "تأكيد وصول وحضور الضيف" : "Guest Arrival & Check-In"}</h2>
                      <p className={styles.muted}>
                        {ar
                          ? "أدخل رمز الحجز المكون من 64 خانة لتسجيل وصول العميل وإشغال الطاولة."
                          : "Enter guest reservation token to mark check-in and occupy table."}
                      </p>
                    </div>
                  </div>
                  <div className={styles.row}>
                    <input
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={ar ? "أدخل رمز الحجز هنا…" : "Enter 64-char reservation code…"}
                      pattern="[a-f0-9]{64}"
                      dir="ltr"
                      style={{ flex: "1 1 300px" }}
                    />
                    <button className={styles.primary} disabled={busy || !token.trim()}>
                      {ar ? "تأكيد الوصول" : "Confirm Arrival"}
                    </button>
                  </div>
                </form>
              )}

              {/* Reservations List */}
              <div className={styles.card}>
                <div className={styles.header}>
                  <div>
                    <h2>{ar ? "سجل الحجوزات والكاشير" : "Reservations & Cashier Ledger"}</h2>
                    <p className={styles.muted}>
                      {ar
                        ? "الدفع عند الكاشير. الحجز لا ينشئ طلب طعام تلقائيًا، وتسجيل استلام الرسوم أو العربون يتم يدويًا بصلاحية الكاشير."
                        : "Payment is recorded at cashier. Booking does not create a food order."}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    className={styles.button}
                    onClick={() => setAttempt((n) => n + 1)}
                  >
                    <RefreshCw size={15} className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
                    <span>{ar ? "تحديث" : "Refresh"}</span>
                  </button>
                </div>

                {reservations.length === 0 ? (
                  <p className={styles.muted}>{ar ? "لا توجد حجوزات مسجلة بعد." : "No reservations recorded yet."}</p>
                ) : (
                  <div className={styles.grid}>
                    {reservations.map((r) => (
                      <CashierReservation
                        key={r.id}
                        reservation={r}
                        base={base}
                        busy={busy}
                        canCashier={can("events.cashier")}
                        act={act}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Table Seat Capacity Settings */}
              {can("events.manage") && (
                <div className={styles.card}>
                  <h2>{ar ? "سعة مقاعد الطاولات في الفرع" : "Table Seat Capacities"}</h2>
                  <p className={styles.muted}>
                    {ar
                      ? "اضبط السعة الفعلية لكل طاولة لتحديد الحد الأقصى للمقاعد المتاحة للحجز."
                      : "Adjust table seat capacities before opening reservations."}
                  </p>
                  <div className={styles.grid}>
                    {tables.map((table) => (
                      <form
                        key={table.id}
                        className={styles.tableCard}
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
                        <div className={styles.tableCardTop}>
                          <strong className={styles.tableNumber}>
                            {ar ? "طاولة" : "Table"} {table.number}
                          </strong>
                        </div>
                        <div className={styles.row}>
                          <input
                            name="capacity"
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={table.capacity}
                            required
                            style={{ width: "90px" }}
                          />
                          <button type="submit" disabled={busy} className={styles.button}>
                            {ar ? "حفظ السعة" : "Save"}
                          </button>
                        </div>
                      </form>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setEventToDelete(null)}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconDanger}>
                <Trash2 size={24} />
              </div>
              <div>
                <h3>{ar ? "حذف الفعالية نهائيًا؟" : "Permanently Delete Event?"}</h3>
                <p className={styles.muted}>
                  {ar
                    ? "سيتم إزالة الفعالية الملغية من قائمة الفعاليات المجدولة ولن تظهر بعد الآن."
                    : "This cancelled event will be permanently removed from your scheduled list."}
                </p>
              </div>
            </div>
            <div className={styles.modalEventPreview}>
              <p className={styles.previewTitle}>
                {matchName(eventToDelete.fixture, ar)}
              </p>
              <p className={styles.muted} style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={14} />
                <span>{matchTime(eventToDelete.startsAt, locale)}</span>
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                disabled={busy}
                className={styles.button}
                onClick={() => setEventToDelete(null)}
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={busy}
                className={styles.modalConfirmDelete}
                onClick={() => void handleDeleteEvent(eventToDelete)}
              >
                {busy ? (
                  <RefreshCw size={16} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>
                  {busy
                    ? ar
                      ? "جارٍ الحذف…"
                      : "Deleting…"
                    : ar
                      ? "تأكيد الحذف"
                      : "Confirm Delete"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
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
  >([]);
  const [orderId, setOrderId] = useState("");
  const [loadedOrders, setLoadedOrders] = useState(false);

  const isPending = r.status === "pending_approval";
  const isHeld = r.status === "held";
  const isPaid = r.paymentStatus === "paid";
  const isRefundDue = r.paymentStatus === "refund_due";

  const loadOrders = async () => {
    try {
      const { data } = await apiClient.get<typeof orders>(
        `${base}/reservations/${r.id}/orders`,
      );
      setOrders(data);
      if (data[0]) setOrderId(data[0].id);
      setLoadedOrders(true);
    } catch {}
  };

  return (
    <article className={styles.tableCard}>
      <div className={styles.tableCardTop}>
        <div>
          <strong style={{ fontSize: "1.05rem" }}>{r.customerName}</strong>
          <span className={styles.muted} style={{ display: "block", fontSize: "0.82rem" }}>
            {r.phone} · {r.guests} {ar ? "ضيوف" : "guests"} · {ar ? "طاولة" : "Table"} {r.table.number}
          </span>
        </div>
        <span
          className={`${styles.statusBadge} ${
            r.status === "confirmed" || r.status === "checked_in"
              ? styles.badgeOnline
              : r.status === "pending_approval"
                ? styles.badgeInstore
                : styles.badgeExcluded
          }`}
        >
          {reservationStatus(r.status, ar)}
        </span>
      </div>

      <div className={styles.muted} style={{ fontSize: "0.82rem" }}>
        <strong>{matchName(r.event.fixture, ar)}</strong>
      </div>

      <div className={styles.row}>
        <span className={styles.statsPill}>
          {r.paymentMode === "free"
            ? ar ? "حجز مجاني" : "Free"
            : `${(r.amountMinor || 0) / 100} SAR (${r.paymentMode})`}
        </span>
        <span
          className={`${styles.statusBadge} ${
            isPaid ? styles.badgeOnline : isRefundDue ? styles.badgeInstore : styles.badgeExcluded
          }`}
        >
          {isPaid
            ? ar ? "تم الدفع للكاشير" : "Paid"
            : isRefundDue
              ? ar ? "مستحق للاسترداد" : "Refund Due"
              : ar ? "غير مدفوع" : "Unpaid"}
        </span>
      </div>

      {r.token && (
        <code className={styles.code} title={r.token}>
          {r.token.slice(0, 10)}…{r.token.slice(-6)}
        </code>
      )}

      {/* Cashier Actions */}
      {canCashier && (
        <div className={styles.row} style={{ marginTop: "6px" }}>
          {isPending && (
            <>
              <button
                type="button"
                disabled={busy}
                className={styles.primary}
                onClick={() =>
                  void act(() =>
                    apiClient.post(`${base}/reservations/${r.id}/approve`),
                  )
                }
              >
                <Check size={15} />
                <span>{ar ? "موافقة على الحجز" : "Approve"}</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    apiClient.post(`${base}/reservations/${r.id}/reject`),
                  )
                }
              >
                <X size={15} />
                <span>{ar ? "رفض الحجز" : "Reject"}</span>
              </button>
            </>
          )}

          {(isHeld || (!isPaid && r.paymentMode !== "free")) && !isPending && (
            <button
              type="button"
              disabled={busy}
              className={styles.primary}
              onClick={() =>
                void act(() =>
                  apiClient.post(`${base}/reservations/${r.id}/collect`),
                )
              }
            >
              <Banknote size={15} />
              <span>{ar ? "تسجيل استلام المبلغ" : "Collect Cash"}</span>
            </button>
          )}

          {isRefundDue && (
            <button
              type="button"
              disabled={busy}
              style={{ color: "#f87171" }}
              onClick={() =>
                void act(() =>
                  apiClient.post(`${base}/reservations/${r.id}/refund`),
                )
              }
            >
              <RotateCcw size={15} />
              <span>{ar ? "تسجيل استرداد المبلغ" : "Record Refund"}</span>
            </button>
          )}

          {/* Deposit credit toward order */}
          {r.paymentMode === "deposit" && isPaid && (
            <div style={{ width: "100%", marginTop: "6px" }}>
              {!loadedOrders ? (
                <button
                  type="button"
                  disabled={busy}
                  className={styles.button}
                  onClick={loadOrders}
                >
                  <Utensils size={15} />
                  <span>{ar ? "ربط بطلب طعام لخصم العربون" : "Apply Credit to Food Order"}</span>
                </button>
              ) : orders.length === 0 ? (
                <p className={styles.muted} style={{ fontSize: "0.8rem" }}>
                  {ar ? "لا توجد طلبات مفتوحة لهذه الطاولة." : "No open orders for this table."}
                </p>
              ) : (
                <div className={styles.row}>
                  <select
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    style={{ minHeight: "36px", fontSize: "0.82rem" }}
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {ar ? `طلب #${o.orderNumber}` : `Order #${o.orderNumber}`} · {(o.totalMinor / 100).toFixed(2)} SAR
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !orderId}
                    className={styles.primary}
                    style={{ minHeight: "36px", fontSize: "0.82rem" }}
                    onClick={() =>
                      void act(() =>
                        apiClient.post(`${base}/reservations/${r.id}/credit`, {
                          orderId,
                        }),
                      )
                    }
                  >
                    {ar ? "تطبيق الخصم" : "Apply"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
