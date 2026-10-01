"use client";

import { useState } from "react";
import { BookOpen, Music, PartyPopper, Rocket, Smile, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { eventError } from "./errors";
import { TimeWindowPicker } from "./time-window-picker";
import { TableChannelSelector } from "./table-channel-selector";
import { PaymentPolicySelector } from "./payment-policy-selector";
import type { EventTable, Fixture, VenueEvent } from "./types";
import styles from "./events.module.css";

function getDefaultStart(): string {
  const d = new Date(Date.now() + 86400000);
  d.setUTCHours(17, 0, 0, 0); // 17:00 UTC = 20:00 Riyadh
  return d.toISOString();
}

function getDefaultEnd(startIso: string): string {
  return new Date(new Date(startIso).getTime() + 3 * 3600000).toISOString();
}

interface GeneralEventBuilderProps {
  base: string;
  tables: EventTable[];
  ar: boolean;
  busy: boolean;
  onEventCreated: (event: VenueEvent) => void;
}

export function GeneralEventBuilder({
  base,
  tables,
  ar,
  busy: parentBusy,
  onEventCreated,
}: GeneralEventBuilderProps) {
  const [category, setCategory] = useState<"music" | "comedy" | "poetry" | "celebration" | "custom">("music");
  
  const [titleAr, setTitleAr] = useState("أمسية عود وموسيقى حية");
  const [titleEn, setTitleEn] = useState("Acoustic Oud & Live Music");
  const [subtitleAr, setSubtitleAr] = useState("عزف حي مع نخبة من الموسيقيين");
  const [subtitleEn, setSubtitleEn] = useState("Live Acoustic Performance");
  const [bannerUrl, setBannerUrl] = useState("");

  const [startsAt, setStartsAt] = useState(getDefaultStart);
  const [endsAt, setEndsAt] = useState(() => getDefaultEnd(getDefaultStart()));

  // Tables state
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>(tables.map((t) => t.id));
  const [inStoreOnlyTableIds, setInStoreOnlyTableIds] = useState<string[]>([]);

  // Payment state
  const [paymentMode, setPaymentMode] = useState<VenueEvent["paymentMode"]>("deposit");
  const [amount, setAmount] = useState(50);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    {
      id: "music" as const,
      Icon: Music,
      nameAr: "حفل أو أمسية موسيقية",
      nameEn: "Live Music & Concert",
      defaultAr: "أمسية عود وموسيقى حية",
      defaultEn: "Acoustic Oud & Live Music",
      subAr: "عزف حي مع نخبة من الموسيقيين",
      subEn: "Live Acoustic Performance",
      leagueEn: "Live Music",
      leagueAr: "حفل موسيقي",
    },
    {
      id: "comedy" as const,
      Icon: Smile,
      nameAr: "ستاند أب كوميدي وعروض",
      nameEn: "Standup Comedy & Show",
      defaultAr: "عرض ستاند أب كوميدي",
      defaultEn: "Standup Comedy Night",
      subAr: "أمسية مليئة بالضحك مع نخبة الكوميديين",
      subEn: "Featuring Local Comedians",
      leagueEn: "Live Comedy",
      leagueAr: "عرض كوميدي",
    },
    {
      id: "poetry" as const,
      Icon: BookOpen,
      nameAr: "أمسية شعرية وثقافية",
      nameEn: "Poetry & Cultural Evening",
      defaultAr: "أمسية شعرية وأدبية",
      defaultEn: "Poetry & Literature Evening",
      subAr: "لقاء شعري حواري مع ضيوف مميزين",
      subEn: "Poetry Recital & Discussion",
      leagueEn: "Cultural Event",
      leagueAr: "أمسية ثقافية",
    },
    {
      id: "celebration" as const,
      Icon: PartyPopper,
      nameAr: "احتفال أو مناسبة خاصة",
      nameEn: "Celebration & Gathering",
      defaultAr: "سهرة احتفالية خاصة",
      defaultEn: "Special Celebration Night",
      subAr: "أجواء احتفالية وقائمة طعام استثنائية",
      subEn: "Festive Vibes & Special Dining",
      leagueEn: "Special Celebration",
      leagueAr: "احتفال خاص",
    },
    {
      id: "custom" as const,
      Icon: Sparkles,
      nameAr: "فعالية مخصصة",
      nameEn: "Custom Event",
      defaultAr: "فعالية حصرية في المقهى",
      defaultEn: "Exclusive Venue Event",
      subAr: "جلسة مميزة وتجربة استثنائية",
      subEn: "Special Guest Experience",
      leagueEn: "Special Event",
      leagueAr: "فعالية خاصة",
    },
  ];

  const handleSelectCategory = (catId: typeof category) => {
    setCategory(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setTitleAr(cat.defaultAr);
      setTitleEn(cat.defaultEn);
      setSubtitleAr(cat.subAr);
      setSubtitleEn(cat.subEn);
    }
  };

  const handleCreate = async () => {
    if (busy || parentBusy) return;
    if (selectedTableIds.length === 0) {
      setError(ar ? "يرجى تحديد طاولة واحدة على الأقل للفعالية." : "Please select at least one table.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const activeCat = categories.find((c) => c.id === category) || categories[0];

      // 1. Create the fixture with provider: "manual"
      const { data: fixture } = await apiClient.post<Fixture>(`${base}/manual-fixture`, {
        homeEn: titleEn.trim() || activeCat.defaultEn,
        homeAr: titleAr.trim() || activeCat.defaultAr,
        awayEn: subtitleEn.trim() || "-",
        awayAr: subtitleAr.trim() || "-",
        leagueEn: activeCat.leagueEn,
        leagueAr: activeCat.leagueAr,
        kickoff: startsAt,
        homeLogo: bannerUrl.trim(),
        awayLogo: bannerUrl.trim(),
      });

      // 2. Attach tables, time window, payment mode, and publish event
      const { data: event } = await apiClient.put<VenueEvent>(base, {
        fixtureId: fixture.id,
        showing: true,
        bookingOpen: true,
        requiresApproval,
        startsAt,
        endsAt,
        paymentMode,
        amountMinor: paymentMode === "free" ? 0 : Math.round(amount * 100),
        cancellationHours,
        tableIds: selectedTableIds,
        inStoreOnlyTableIds,
      });

      onEventCreated(event);
    } catch (err) {
      setError(eventError(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.builderCard}>
      <header className={styles.builderHeader}>
        <div className={styles.builderIconPill}>
          <Sparkles size={22} />
        </div>
        <div>
          <h2>{ar ? "استضافة فعالية جديدة" : "Host a New Event"}</h2>
          <p className={styles.muted}>
            {ar
              ? "أنشئ أمسيتك الموسيقية أو عرضك الكوميدي بخطوات بسيطة وفعّل حجز الطاولات فورًا."
              : "Set up a musical night, comedy show, or private gathering with table reservations in minutes."}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className={`${styles.notice} ${styles.error}`}>
          {error}
        </div>
      )}

      {/* Step 1: Category Selection */}
      <div className={styles.builderStep}>
        <div className={styles.stepTitle}>
          <span className={styles.stepNum}>1</span>
          <h3>{ar ? "نوع الفعالية" : "Event Type"}</h3>
        </div>
        <div className={styles.categoryPillsGrid}>
          {categories.map((c) => {
            const isSelected = category === c.id;
            const Icon = c.Icon;
            return (
              <button
                key={c.id}
                type="button"
                disabled={busy || parentBusy}
                className={`${styles.categoryCard} ${isSelected ? styles.categoryCardActive : ""}`}
                onClick={() => handleSelectCategory(c.id)}
              >
                <span className={styles.categoryCardIcon}>
                  <Icon size={22} />
                </span>
                <span className={styles.categoryCardName}>{ar ? c.nameAr : c.nameEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Event Details */}
      <div className={styles.builderStep}>
        <div className={styles.stepTitle}>
          <span className={styles.stepNum}>2</span>
          <h3>{ar ? "بيانات وعنوان الفعالية" : "Event Details & Description"}</h3>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{ar ? "عنوان الفعالية (عربي)" : "Event Title (Arabic)"}</span>
            <input
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              required
              maxLength={100}
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span>{ar ? "عنوان الفعالية (إنجليزي)" : "Event Title (English)"}</span>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              required
              maxLength={100}
            />
          </label>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>{ar ? "الفنان أو الوصف الإضافي (عربي)" : "Performer / Subtitle (Arabic)"}</span>
            <input
              value={subtitleAr}
              onChange={(e) => setSubtitleAr(e.target.value)}
              maxLength={100}
              dir="rtl"
            />
          </label>
          <label className={styles.field}>
            <span>{ar ? "الفنان أو الوصف الإضافي (إنجليزي)" : "Performer / Subtitle (English)"}</span>
            <input
              value={subtitleEn}
              onChange={(e) => setSubtitleEn(e.target.value)}
              maxLength={100}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>{ar ? "رابط بوستر أو صورة الفعالية (اختياري)" : "Event Poster / Image URL (Optional)"}</span>
          <input
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
            maxLength={500}
          />
        </label>
      </div>

      {/* Step 3: Time Window Picker */}
      <div className={styles.builderStep}>
        <div className={styles.stepTitle}>
          <span className={styles.stepNum}>3</span>
          <h3>{ar ? "توقيت ومدة الفعالية" : "Date, Time & Duration"}</h3>
        </div>
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
      </div>

      {/* Step 4: Table & Channels Allocation */}
      <div className={styles.builderStep}>
        <div className={styles.stepTitle}>
          <span className={styles.stepNum}>4</span>
          <h3>{ar ? "الطاولات المتاحة للحجز" : "Bookable Tables & Channel Policy"}</h3>
        </div>
        <TableChannelSelector
          ar={ar}
          tables={tables}
          selectedTableIds={selectedTableIds}
          inStoreOnlyTableIds={inStoreOnlyTableIds}
          onSelectedChange={setSelectedTableIds}
          onInStoreOnlyChange={setInStoreOnlyTableIds}
          disabled={busy || parentBusy}
        />
      </div>

      {/* Step 5: Pricing and Cashier Policy */}
      <div className={styles.builderStep}>
        <div className={styles.stepTitle}>
          <span className={styles.stepNum}>5</span>
          <h3>{ar ? "نظام الدفع والحجز" : "Pricing & Reservation Policy"}</h3>
        </div>
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
      </div>

      {/* Submit Button */}
      <div className={styles.builderSubmitRow}>
        <button
          type="button"
          disabled={busy || parentBusy || selectedTableIds.length === 0}
          className={`${styles.primary} ${styles.largeActionBtn}`}
          onClick={handleCreate}
        >
          <Rocket size={18} />
          <span>
            {busy
              ? ar
                ? "جارٍ إنشاء ونشر الفعالية…"
                : "Creating event…"
              : ar
                ? "نشر الفعالية وفتح الحجوزات"
                : "Launch Event & Open Bookings"}
          </span>
        </button>
      </div>
    </div>
  );
}
