"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import { useAdminBranch } from "@/lib/admin-branch-context";
import styles from "./business.module.css";

interface Insights {
  summary: {
    orders: number;
    completed: number;
    active: number;
    averageMinutes: number | null;
    timedOrders: number;
    averageRating: number | null;
    ratings: number;
    completedValue: number;
    acceptMinutes: number | null;
    prepareMinutes: number | null;
    handoffMinutes: number | null;
  };
  popular: { id: string; name: string; quantity: number; value: number }[];
  daily: { day: string; orders: number }[];
}

export function BusinessInsights() {
  const locale = useLocale();
  const t = useTranslations("AdminDashboard");
  const tCommon = useTranslations("AdminCommon");

  const formatNumber = (value: number | null) =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
          maximumFractionDigits: 1,
        }).format(value);

  const { can, access } = useAccess();
  const canReadAnalytics = can("analytics.read");
  const canReadAllBranches = can("branches.all");
  const assignedBranch = access?.branchId;
  const { selectedBranchId, branches, setSelectedBranchId } = useAdminBranch();
  const [days, setDays] = useState(30);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cache = useRef(new Map<string, { data: Insights; time: number }>());
  const lastRetry = useRef(0);
  const displayedKey = useRef("");

  useEffect(() => {
    if (!canReadAnalytics || !selectedBranchId) return;
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      const key = `${canReadAllBranches}:${assignedBranch}:${selectedBranchId}:${days}`;
      const force = lastRetry.current !== retry;
      lastRetry.current = retry;
      const cached = cache.current.get(key);
      if (displayedKey.current !== key) setData(cached?.data ?? null);
      displayedKey.current = key;
      setError("");
      if (!force && cached && Date.now() - cached.time < 60000) {
        setData(cached.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await apiClient.get<Insights>("/admin/analytics", {
          params: { days, branchId: selectedBranchId || undefined },
          signal: controller.signal,
        });
        if (active) {
          cache.current.set(key, { data: res.data, time: Date.now() });
          if (cache.current.size > 12) cache.current.delete(cache.current.keys().next().value!);
          setData(res.data);
        }
      } catch {
        if (active) setError(t("errorLoad"));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [days, selectedBranchId, retry, canReadAnalytics, canReadAllBranches, assignedBranch, t]);

  if (!canReadAnalytics) return null;
  const s = data?.summary;

  return (
    <section className={styles.section} aria-labelledby="insights-title">
      <div className={styles.heading}>
        <div>
          <h2 id="insights-title">{t("insightsTitle")}</h2>
          <p className={styles.muted}>{t("insightsSubtitle")}</p>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.select}
            aria-label={t("branchSelectAria")}
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {locale === "en"
                  ? (b.nameEn || b.name || b.nameAr || t("defaultBranch"))
                  : (b.nameAr || b.name || b.nameEn || t("defaultBranch"))}
              </option>
            ))}
          </select>
          <select
            aria-label={t("periodSelectAria")}
            className={styles.select}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>{t("period7")}</option>
            <option value={30}>{t("period30")}</option>
            <option value={90}>{t("period90")}</option>
          </select>
          <button
            className={styles.button}
            aria-label={t("refreshAria")}
            disabled={loading}
            onClick={() => setRetry((v) => v + 1)}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
      {loading && !s ? (
        <div className={styles.panel} role="status">
          {t("readingPerformance")}
        </div>
      ) : s ? (
        <>
          <div className={styles.grid}>
            {[
              [
                t("kpiTotalOrders"),
                formatNumber(s.orders),
                t("kpiActiveOrdersNote", { count: formatNumber(s.active) }),
              ],
              [
                t("kpiAvgFulfillment"),
                s.averageMinutes === null
                  ? "—"
                  : `${formatNumber(s.averageMinutes)} ${t("kpiMinuteSuffix")}`,
                t("kpiTimedOrdersNote", { count: formatNumber(s.timedOrders) }),
              ],
              [
                t("kpiCompletedValue"),
                `${formatNumber(s.completedValue)} ${tCommon("currency")}`,
                t("kpiCompletedNote", { count: formatNumber(s.completed) }),
              ],
              [
                t("kpiGuestSatisfaction"),
                s.averageRating === null
                  ? "—"
                  : `${formatNumber(s.averageRating)} / 5`,
                t("kpiRatingCount", { count: formatNumber(s.ratings) }),
              ],
            ].map(([label, value, note]) => (
              <article className={styles.metric} key={label}>
                <span className={styles.muted}>{label}</span>
                <strong><bdi dir="ltr">{value}</bdi></strong>
                <small className={styles.muted}>{note}</small>
              </article>
            ))}
          </div>
          <div className={styles.columns}>
            <article className={styles.panel}>
              <h3>{t("breakdownTitle")}</h3>
              <p className={styles.muted}>{t("breakdownSubtitle")}</p>
              {[
                [t("stageAccept"), s.acceptMinutes],
                [t("stagePrepare"), s.prepareMinutes],
                [t("stageHandoff"), s.handoffMinutes],
              ].map(([label, value]) => (
                <div className={styles.row} key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {value === null
                      ? "—"
                      : `${formatNumber(Number(value))} ${t("kpiMinuteSuffix")}`}
                  </strong>
                </div>
              ))}
              <p className={styles.muted}>{t("breakdownNote")}</p>
            </article>
            <article className={styles.panel}>
              <h3>{t("popularTitle")}</h3>
              <p className={styles.muted}>{t("popularSubtitle")}</p>
              {data.popular.length ? (
                <ol className={styles.list}>
                  {data.popular.map((p, index) => (
                    <li key={p.id}>
                      <div className={styles.heading}>
                        <span>
                          {index + 1}. {p.name}
                        </span>
                        <strong>{formatNumber(p.quantity)}</strong>
                      </div>
                      <div className={styles.bar}>
                        <span
                          style={{
                            width: `${(p.quantity / data.popular[0].quantity) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.muted}>{t("popularEmpty")}</p>
              )}
            </article>
          </div>
          <article className={styles.panel}>
            <h3>{t("trendTitle")}</h3>
            <p className={styles.muted}>{t("trendSubtitle")}</p>
            {data.daily.length ? (
              <>
                <div className={styles.chart} aria-hidden="true">
                  {data.daily.map((day) => (
                    <div
                      key={day.day}
                      title={`${day.day}: ${day.orders}`}
                      style={{
                        height: `${Math.max(3, (day.orders / Math.max(...data.daily.map((d) => d.orders))) * 100)}%`,
                      }}
                    />
                  ))}
                </div>
                <details className={styles.muted}>
                  <summary>{t("trendDetails")}</summary>
                  {data.daily.map((day) => (
                    <div className={styles.row} key={day.day}>
                      <time>{day.day}</time>
                      <span>
                        {t("trendOrdersCount", { count: formatNumber(day.orders) })}
                      </span>
                    </div>
                  ))}
                </details>
              </>
            ) : (
              <p className={styles.muted}>{t("trendEmpty")}</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}
