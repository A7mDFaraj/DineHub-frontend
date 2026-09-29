"use client";

import { useState } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/api-client";
import { eventError, eventErrorCode } from "./errors";
import {
  saudiLeagueTeams,
  popularDerbies,
  type TeamPreset,
} from "./football-data";
import { TimeWindowPicker, toRiyadhInput } from "./time-window-picker";
import { TableChannelSelector } from "./table-channel-selector";
import { PaymentPolicySelector } from "./payment-policy-selector";
import { ScheduleWidget } from "./schedule-widget";
import { MatchHeading } from "./match-heading";
import {
  matchName,
  providerNames,
  type EventTable,
  type Fixture,
  type FootballProvider,
  type FootballSyncStatus,
  type VenueEvent,
} from "./types";
import styles from "./events.module.css";

function getDefaultKickoff(): string {
  const d = new Date(Date.now() + 86400000);
  d.setUTCHours(17, 0, 0, 0); // 20:00 Riyadh
  return d.toISOString();
}

interface FootballHubProps {
  base: string;
  tables: EventTable[];
  fixtures: Fixture[];
  events: VenueEvent[];
  syncStatus: FootballSyncStatus | null;
  provider: FootballProvider | undefined;
  providerConfigured: boolean;
  isNoApiMode: boolean;
  widgetProvider: "365scores-widget" | "sportscore-widget" | null;
  syncing: boolean;
  ar: boolean;
  busy: boolean;
  onRefreshFixtures: () => Promise<void>;
  onProviderChange: (provider: FootballProvider) => void;
  onFixtureCreated: (fixture: Fixture) => void;
  onEventSaved: (event: VenueEvent) => void;
}

export function FootballHub({
  base,
  tables,
  fixtures,
  events,
  syncStatus,
  provider,
  providerConfigured,
  isNoApiMode,
  widgetProvider,
  syncing,
  ar,
  busy: parentBusy,
  onRefreshFixtures,
  onProviderChange,
  onFixtureCreated,
  onEventSaved,
}: FootballHubProps) {
  // Selected fixture to configure
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);

  // Saudi Matchup Builder State
  const [homeTeam, setHomeTeam] = useState<TeamPreset>(saudiLeagueTeams[0]); // Al-Hilal
  const [awayTeam, setAwayTeam] = useState<TeamPreset>(saudiLeagueTeams[1]); // Al-Nassr

  const [kickoffTime, setKickoffTime] = useState(getDefaultKickoff);

  // Custom / Any Match Fallback State
  const [showCustomMatchForm, setShowCustomMatchForm] = useState(false);
  const [customHomeEn, setCustomHomeEn] = useState("");
  const [customHomeAr, setCustomHomeAr] = useState("");
  const [customAwayEn, setCustomAwayEn] = useState("");
  const [customAwayAr, setCustomAwayAr] = useState("");
  const [customLeagueEn, setCustomLeagueEn] = useState("Saudi Pro League");
  const [customLeagueAr, setCustomLeagueAr] = useState("دوري روشن السعودي");
  const [customHomeLogo, setCustomHomeLogo] = useState("");
  const [customAwayLogo, setCustomAwayLogo] = useState("");

  const [showing, setShowing] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(true);
  const [startsAt, setStartsAt] = useState(getDefaultKickoff);
  const [endsAt, setEndsAt] = useState(() => {
    return new Date(new Date(getDefaultKickoff()).getTime() + 3 * 3600000).toISOString();
  });
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(tables.map((t) => t.id));
  const [inStoreOnlyTableIds, setInStoreOnlyTableIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState<VenueEvent["paymentMode"]>("deposit");
  const [amount, setAmount] = useState(50);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // When selected fixture changes, pre-populate event settings
  const handleSelectFixture = (f: Fixture | null) => {
    setSelectedFixture(f);
    if (!f) return;
    const existing = events.find((e) => e.fixtureId === f.id);
    if (existing) {
      setShowing(existing.showing);
      setBookingOpen(existing.bookingOpen);
      setStartsAt(existing.startsAt);
      setEndsAt(existing.endsAt);
      setPaymentMode(existing.paymentMode);
      setAmount((existing.amountMinor || 0) / 100);
      setCancellationHours(existing.cancellationHours ?? 24);
      setRequiresApproval(Boolean(existing.fixture?.sourceMeta?.requiresApproval));
      setSelectedTableIds(existing.tables?.map((t) => t.tableId) || tables.map((t) => t.id));
      setInStoreOnlyTableIds(
        (existing.fixture?.sourceMeta?.inStoreOnlyTableIds as string[]) || [],
      );
    } else {
      setShowing(true);
      setBookingOpen(true);
      const kickoffMs = new Date(f.kickoff).getTime();
      setStartsAt(new Date(kickoffMs - 3600000).toISOString());
      setEndsAt(new Date(kickoffMs + 3 * 3600000).toISOString());
      setPaymentMode("deposit");
      setAmount(50);
      setCancellationHours(24);
      setRequiresApproval(false);
      setSelectedTableIds(tables.map((t) => t.id));
      setInStoreOnlyTableIds([]);
    }
  };

  // 1-Click Create from Saudi Team Selection
  const handleCreateSaudiMatch = async (home: TeamPreset, away: TeamPreset, dateStr: string) => {
    if (busy || parentBusy) return;
    if (home.id === away.id) {
      setError(ar ? "يرجى اختيار فريقين مختلفين للمباراة." : "Please select two different teams.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccessMsg("");

    try {
      const { data: fixture } = await apiClient.post<Fixture>(`${base}/manual-fixture`, {
        homeEn: home.nameEn,
        homeAr: home.nameAr,
        awayEn: away.nameEn,
        awayAr: away.nameAr,
        leagueEn: home.leagueEn || "Saudi Pro League",
        leagueAr: home.leagueAr || "دوري روشن السعودي",
        kickoff: dateStr,
        homeLogo: home.logo,
        awayLogo: away.logo,
      });

      onFixtureCreated(fixture);
      handleSelectFixture(fixture);
      setSuccessMsg(ar ? `تم تجهيز مباراة ${home.nameAr} × ${away.nameAr}. قم بمراجعة الطاولات واحفظ الإعدادات أدناه.` : `Match ${home.nameEn} vs ${away.nameEn} created. Review tables and save settings below.`);
    } catch (e) {
      setError(eventError(e, ar));
    } finally {
      setBusy(false);
    }
  };

  // Create custom match
  const handleCreateCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || parentBusy) return;
    setBusy(true);
    setError("");
    setSuccessMsg("");

    try {
      const { data: fixture } = await apiClient.post<Fixture>(`${base}/manual-fixture`, {
        homeEn: customHomeEn.trim(),
        homeAr: customHomeAr.trim(),
        awayEn: customAwayEn.trim(),
        awayAr: customAwayAr.trim(),
        leagueEn: customLeagueEn.trim() || "Football",
        leagueAr: customLeagueAr.trim() || "كرة قدم",
        kickoff: kickoffTime,
        homeLogo: customHomeLogo.trim(),
        awayLogo: customAwayLogo.trim(),
      });

      onFixtureCreated(fixture);
      handleSelectFixture(fixture);
      setShowCustomMatchForm(false);
      setSuccessMsg(ar ? "تم إنشاء المباراة المخصصة بنجاح." : "Custom match created successfully.");
    } catch (err) {
      setError(eventError(err, ar));
    } finally {
      setBusy(false);
    }
  };

  // Save Event Settings
  const handleSaveEvent = async () => {
    if (!selectedFixture || busy || parentBusy) return;
    if (selectedTableIds.length === 0) {
      setError(ar ? "يرجى اختيار طاولة واحدة على الأقل." : "Please select at least one table.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccessMsg("");

    try {
      const { data: event } = await apiClient.put<VenueEvent>(base, {
        fixtureId: selectedFixture.id,
        showing,
        bookingOpen,
        requiresApproval,
        startsAt,
        endsAt,
        paymentMode,
        amountMinor: paymentMode === "free" ? 0 : Math.round(amount * 100),
        cancellationHours,
        tableIds: selectedTableIds,
        inStoreOnlyTableIds,
      });

      onEventSaved(event);
      setSuccessMsg(ar ? "تم حفظ إعدادات المباراة وتحديث الحجوزات بنجاح!" : "Match event settings saved successfully!");
    } catch (err) {
      setError(eventError(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.footballHubRoot}>
      {error && (
        <div role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className={`${styles.notice} ${styles.success}`}>
          {successMsg}
        </div>
      )}

      {/* SECTION 1: 1-Click Saudi League Match Maker */}
      <section className={styles.builderCard}>
        <div className={styles.builderHeader}>
          <div className={styles.footballIconBadge}>🇸🇦</div>
          <div>
            <h2>{ar ? "منشئ مباريات دوري روشن السعودي" : "Saudi Pro League Match Maker"}</h2>
            <p className={styles.muted}>
              {ar
                ? "اختر الفريقين بضغطة زر دون الحاجة لكتابة الأسماء أو البحث عن الشعارات!"
                : "Pick Saudi League clubs with verified logos and set up booking in 1 click."}
            </p>
          </div>
        </div>

        {/* Quick Derby Buttons */}
        <div className={styles.presetGroup}>
          <span className={styles.presetLabel}>
            {ar ? "قمم وديربيات سريعة:" : "Featured Derbies:"}
          </span>
          <div className={styles.chipRow}>
            {popularDerbies.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={busy || parentBusy}
                className={styles.presetChip}
                onClick={() => {
                  setHomeTeam(d.home);
                  setAwayTeam(d.away);
                  void handleCreateSaudiMatch(d.home, d.away, kickoffTime);
                }}
              >
                ⚽ {ar ? d.titleAr : d.titleEn} ({ar ? `${d.home.nameAr} × ${d.away.nameAr}` : `${d.home.nameEn} vs ${d.away.nameEn}`})
              </button>
            ))}
          </div>
        </div>

        {/* Team Selectors Grid */}
        <div className={styles.matchupSelectorGrid}>
          {/* Home Team */}
          <div className={styles.teamSelectCard}>
            <span className={styles.teamSideLabel}>
              {ar ? "الفريق المضيف (صاحب الأرض)" : "Home Team"}
            </span>
            <div className={styles.teamSelectedRow}>
              {homeTeam.logo && (
                <Image
                  unoptimized
                  src={homeTeam.logo}
                  alt=""
                  width={48}
                  height={48}
                  className={styles.teamLogoThumb}
                />
              )}
              <select
                value={homeTeam.id}
                onChange={(e) => {
                  const t = saudiLeagueTeams.find((x) => x.id === e.target.value);
                  if (t) setHomeTeam(t);
                }}
                disabled={busy || parentBusy}
                className={styles.teamDropdown}
              >
                {saudiLeagueTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {ar ? t.nameAr : t.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.versusBadge}>VS</div>

          {/* Away Team */}
          <div className={styles.teamSelectCard}>
            <span className={styles.teamSideLabel}>
              {ar ? "الفريق الضيف" : "Away Team"}
            </span>
            <div className={styles.teamSelectedRow}>
              {awayTeam.logo && (
                <Image
                  unoptimized
                  src={awayTeam.logo}
                  alt=""
                  width={48}
                  height={48}
                  className={styles.teamLogoThumb}
                />
              )}
              <select
                value={awayTeam.id}
                onChange={(e) => {
                  const t = saudiLeagueTeams.find((x) => x.id === e.target.value);
                  if (t) setAwayTeam(t);
                }}
                disabled={busy || parentBusy}
                className={styles.teamDropdown}
              >
                {saudiLeagueTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {ar ? t.nameAr : t.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kickoff Selector */}
        <div className={styles.matchKickoffRow}>
          <label className={styles.field} style={{ flex: "1 1 300px" }}>
            <span>{ar ? "موعد انطلاق المباراة (بتوقيت الرياض)" : "Kickoff (Riyadh Time)"}</span>
            <input
              type="datetime-local"
              value={toRiyadhInput(kickoffTime)}
              onChange={(e) => {
                const val = e.target.value;
                if (val) setKickoffTime(new Date(`${val}:00+03:00`).toISOString());
              }}
              disabled={busy || parentBusy}
              required
            />
          </label>
          <div className={styles.chipRow} style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              disabled={busy || parentBusy}
              className={styles.presetChip}
              onClick={() => {
                const d = new Date();
                d.setUTCHours(17, 0, 0, 0); // 20:00 Riyadh
                setKickoffTime(d.toISOString());
              }}
            >
              {ar ? "الليلة 8:00 م" : "Tonight 8 PM"}
            </button>
            <button
              type="button"
              disabled={busy || parentBusy}
              className={styles.presetChip}
              onClick={() => {
                const d = new Date(Date.now() + 86400000);
                d.setUTCHours(18, 0, 0, 0); // 21:00 Riyadh
                setKickoffTime(d.toISOString());
              }}
            >
              {ar ? "غداً 9:00 م" : "Tomorrow 9 PM"}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          disabled={busy || parentBusy || homeTeam.id === awayTeam.id}
          className={`${styles.primary} ${styles.largeActionBtn}`}
          onClick={() => handleCreateSaudiMatch(homeTeam, awayTeam, kickoffTime)}
        >
          {busy
            ? ar
              ? "جارٍ إنشاء وتجهيز المباراة…"
              : "Creating match…"
            : ar
              ? `⚡ إنشاء وتجهيز (${homeTeam.nameAr} × ${awayTeam.nameAr})`
              : `⚡ Create & Setup (${homeTeam.nameEn} vs ${awayTeam.nameEn})`}
        </button>
      </section>

      {/* SECTION 2: External Provider Sync & Dropdown */}
      <section className={styles.builderCard}>
        <div className={styles.header}>
          <div>
            <h3>{ar ? "مزود المباريات والقوائم المزامنة" : "Match Provider & Fixture Sync"}</h3>
            <p className={styles.muted}>
              {ar
                ? "يمكنك ربط مزودي المباريات المباشرة أو الاعتماد على القوائم المحدثة محليًا."
                : "Connect a live fixture provider or rely on local presets."}
            </p>
          </div>
          {!isNoApiMode && (
            <button
              type="button"
              disabled={busy || parentBusy || syncing || !providerConfigured}
              className={styles.button}
              onClick={onRefreshFixtures}
            >
              {syncing
                ? ar
                  ? "جارٍ التحديث في الخلفية…"
                  : "Syncing in background…"
                : ar
                  ? "تحديث من المزود"
                  : "Refresh from Provider"}
            </button>
          )}
        </div>

        {/* Provider Select */}
        <label className={styles.field}>
          <span>{ar ? "مصدر بيانات المباريات" : "Fixture Source"}</span>
          <select
            value={provider || "api-football"}
            disabled={busy || parentBusy || !syncStatus}
            onChange={(e) => onProviderChange(e.target.value as FootballProvider)}
          >
            {Object.entries(providerNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {/* Provider Notices */}
        {widgetProvider ? (
          <ScheduleWidget key={widgetProvider} provider={widgetProvider} ar={ar} />
        ) : !isNoApiMode ? (
          <div className={styles.notice}>
            <p className={styles.muted}>
              {provider === "thesportsdb"
                ? ar
                  ? "يعمل بالمفتاح المجاني المشترك تلقائيًا. إذا لم تظهر مباريات جديدة، استخدم منشئ مباريات دوري روشن أعلاه بضغطة زر واحدة."
                  : "Free shared key active. If current season fixtures are capped, use the 1-click Saudi Pro League maker above."
                : provider === "openfootapi"
                  ? ar
                    ? "يتطلب المفتاح السري الكامل من OpenFootAPI."
                    : "Requires your OpenFootAPI secret key."
                  : ar
                    ? "قد تتطلب الخطة المجانية حساب API-Football نشط."
                    : "Free API-Football tier may have rate limits."}
            </p>
            {syncStatus?.lastError && (
              <p role="alert" className={`${styles.notice} ${styles.error}`}>
                {eventErrorCode(syncStatus.lastError, ar)}
              </p>
            )}
          </div>
        ) : null}

        {/* Upcoming Fixtures Dropdown */}
        <label className={styles.field}>
          <span>
            {ar
              ? "اختر مباراة من القائمة لعرضها وضبط طاولاتها"
              : "Select a fixture to host & configure tables"}
          </span>
          <select
            value={selectedFixture?.id || ""}
            onChange={(e) => {
              const f = fixtures.find((x) => x.id === e.target.value) || null;
              handleSelectFixture(f);
            }}
            disabled={busy || parentBusy}
          >
            <option value="">
              {ar ? "-- اختر مباراة من القائمة --" : "-- Select a fixture --"}
            </option>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {matchName(f, ar)} · {new Date(f.kickoff).toLocaleDateString(ar ? "ar-SA" : "en-US", { timeZone: "Asia/Riyadh", month: "short", day: "numeric" })}
              </option>
            ))}
          </select>
        </label>

        {/* Quick Custom Match Toggle */}
        <div style={{ marginTop: "8px" }}>
          <button
            type="button"
            className={styles.button}
            onClick={() => setShowCustomMatchForm((prev) => !prev)}
          >
            {showCustomMatchForm
              ? ar ? "إخفاء نموذج المباراة المخصصة" : "Hide custom match form"
              : ar ? "➕ إضافة مباراة مخصصة أو بطولة عالمية أخرى" : "➕ Add any custom match manually"}
          </button>
        </div>

        {/* Collapsible Custom Match Form */}
        {showCustomMatchForm && (
          <form className={styles.card} onSubmit={handleCreateCustomMatch}>
            <h4>{ar ? "إضافة مباراة لأي بطولة أو فريقين" : "Host Any Custom Football Match"}</h4>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{ar ? "الفريق المضيف (إنجليزي)" : "Home Team (English)"}</span>
                <input
                  required
                  value={customHomeEn}
                  onChange={(e) => setCustomHomeEn(e.target.value)}
                  placeholder="e.g. Real Madrid"
                />
              </label>
              <label className={styles.field}>
                <span>{ar ? "الفريق المضيف (عربي)" : "Home Team (Arabic)"}</span>
                <input
                  value={customHomeAr}
                  onChange={(e) => setCustomHomeAr(e.target.value)}
                  placeholder="مثال: ريال مدريد"
                  dir="rtl"
                />
              </label>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{ar ? "الفريق الضيف (إنجليزي)" : "Away Team (English)"}</span>
                <input
                  required
                  value={customAwayEn}
                  onChange={(e) => setCustomAwayEn(e.target.value)}
                  placeholder="e.g. Barcelona"
                />
              </label>
              <label className={styles.field}>
                <span>{ar ? "الفريق الضيف (عربي)" : "Away Team (Arabic)"}</span>
                <input
                  value={customAwayAr}
                  onChange={(e) => setCustomAwayAr(e.target.value)}
                  placeholder="مثال: برشلونة"
                  dir="rtl"
                />
              </label>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{ar ? "البطولة أو الدوري (عربي)" : "League (Arabic)"}</span>
                <input
                  value={customLeagueAr}
                  onChange={(e) => setCustomLeagueAr(e.target.value)}
                  placeholder="مثال: دوري أبطال أوروبا"
                  dir="rtl"
                />
              </label>
              <label className={styles.field}>
                <span>{ar ? "البطولة أو الدوري (إنجليزي)" : "League (English)"}</span>
                <input
                  value={customLeagueEn}
                  onChange={(e) => setCustomLeagueEn(e.target.value)}
                  placeholder="e.g. Champions League"
                />
              </label>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>{ar ? "شعار المضيف (اختياري)" : "Home Logo URL (Optional)"}</span>
                <input
                  value={customHomeLogo}
                  onChange={(e) => setCustomHomeLogo(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className={styles.field}>
                <span>{ar ? "شعار الضيف (اختياري)" : "Away Logo URL (Optional)"}</span>
                <input
                  value={customAwayLogo}
                  onChange={(e) => setCustomAwayLogo(e.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <label className={styles.field}>
              <span>{ar ? "وقت الانطلاق" : "Kickoff"}</span>
              <input
                type="datetime-local"
                value={toRiyadhInput(kickoffTime)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) setKickoffTime(new Date(`${val}:00+03:00`).toISOString());
                }}
                required
              />
            </label>
            <div className={styles.row}>
              <button type="submit" disabled={busy || parentBusy} className={styles.primary}>
                {ar ? "حفظ المباراة وإعداد طاولاتها" : "Create & Configure"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* SECTION 3: Selected Match Event Configuration */}
      {selectedFixture && (
        <section className={styles.builderCard}>
          <div className={styles.builderHeader}>
            <div className={styles.footballIconBadge}>⚙️</div>
            <div>
              <h2>{ar ? "إعدادات العرض وحجز الطاولات للمباراة" : "Match Event & Table Settings"}</h2>
              <p className={styles.muted}>
                {ar
                  ? "حدد حالة العرض، الطاولات المخصصة، ونظام استلام العربون أو الرسوم عند الكاشير."
                  : "Configure showing status, table allocation, and cashier payment rules."}
              </p>
            </div>
          </div>

          {/* Match Display Header */}
          <div className={styles.matchCardPreview}>
            <MatchHeading fixture={selectedFixture} locale={ar ? "ar" : "en"} />
          </div>

          {/* Visibility Toggles */}
          <div className={styles.row} style={{ marginBlock: "12px" }}>
            <label className={styles.tableOption}>
              <input
                type="checkbox"
                checked={showing}
                onChange={(e) => setShowing(e.target.checked)}
                disabled={busy || parentBusy}
              />
              <strong>{ar ? "تُعرض المباراة في المحل" : "Showing this match in venue"}</strong>
            </label>
            <label className={styles.tableOption}>
              <input
                type="checkbox"
                checked={bookingOpen}
                onChange={(e) => setBookingOpen(e.target.checked)}
                disabled={busy || parentBusy}
              />
              <strong>{ar ? "فتح حجز الطاولات للعملاء" : "Open table reservations"}</strong>
            </label>
          </div>

          {/* Time Window */}
          <TimeWindowPicker
            ar={ar}
            startsAt={startsAt}
            endsAt={endsAt}
            onChange={(newStart, newEnd) => {
              setStartsAt(newStart);
              setEndsAt(newEnd);
            }}
            disabled={busy || parentBusy}
          />

          {/* Tables & Channels */}
          <TableChannelSelector
            ar={ar}
            tables={tables}
            selectedTableIds={selectedTableIds}
            inStoreOnlyTableIds={inStoreOnlyTableIds}
            onSelectedChange={setSelectedTableIds}
            onInStoreOnlyChange={setInStoreOnlyTableIds}
            disabled={busy || parentBusy}
          />

          {/* Payment & Approval Policy */}
          <PaymentPolicySelector
            ar={ar}
            mode={paymentMode}
            amount={amount}
            cancellationHours={cancellationHours}
            requiresApproval={requiresApproval}
            onModeChange={setPaymentMode}
            onAmountChange={setAmount}
            onCancellationHoursChange={setCancellationHours}
            onRequiresApprovalChange={setRequiresApproval}
            disabled={busy || parentBusy}
          />

          {/* Save Button */}
          <div className={styles.builderSubmitRow}>
            <button
              type="button"
              disabled={busy || parentBusy || selectedTableIds.length === 0}
              className={`${styles.primary} ${styles.largeActionBtn}`}
              onClick={handleSaveEvent}
            >
              {busy
                ? ar ? "جارٍ حفظ الإعدادات…" : "Saving settings…"
                : ar ? "💾 حفظ وتفعيل إعدادات المباراة" : "💾 Save Match Event Settings"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
