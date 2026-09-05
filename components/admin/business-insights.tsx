"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
const number = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 1 }).format(
        value,
      );
export function BusinessInsights() {
  const { can } = useAccess();
  const { selectedBranchId, branches, setSelectedBranchId } = useAdminBranch();
  const [days, setDays] = useState(30);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!can("analytics.read")) return;
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.get<Insights>("/admin/analytics", {
          params: { days, branchId: selectedBranchId || undefined },
          signal: controller.signal,
        });
        if (active) setData(res.data);
      } catch {
        if (active) setError("تعذر تحميل مؤشرات الأداء. حاول مجدداً.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [days, selectedBranchId, retry, can]);
  if (!can("analytics.read")) return null;
  const s = data?.summary;
  return (
    <section className={styles.section} aria-labelledby="insights-title">
      <div className={styles.heading}>
        <div>
          <h2 id="insights-title">أرقام تساعدك تتخذ القرار.</h2>
          <p className={styles.muted}>
            أداء الطلبات وتجربة العملاء في الفرع المحدد
          </p>
        </div>
        <div className={styles.controls}>
          <select
            className={styles.select}
            aria-label="فرع الإحصاءات"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name ?? b.nameAr ?? "الفرع"}
              </option>
            ))}
          </select>
          <select
            aria-label="الفترة الزمنية"
            className={styles.select}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>آخر 7 أيام</option>
            <option value={30}>آخر 30 يوماً</option>
            <option value={90}>آخر 90 يوماً</option>
          </select>
          <button
            className={styles.button}
            aria-label="تحديث الإحصاءات"
            disabled={loading}
            onClick={() => setRetry((v) => v + 1)}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : loading ? (
        <div className={styles.panel} role="status">
          جارٍ قراءة أداء نشاطك…
        </div>
      ) : s ? (
        <>
          <div className={styles.grid}>
            {[
              [
                "إجمالي الطلبات",
                number(s.orders),
                `${number(s.active)} طلبات نشطة`,
              ],
              [
                "متوسط وقت الإنجاز",
                s.averageMinutes === null
                  ? "—"
                  : `${number(s.averageMinutes)} د`,
                `${number(s.timedOrders)} طلبات بتوقيت مسجل`,
              ],
              [
                "قيمة الطلبات المكتملة",
                `${number(s.completedValue)} ر.س`,
                `${number(s.completed)} طلبات مكتملة · ليست صافي الربح`,
              ],
              [
                "رضا العملاء",
                s.averageRating === null
                  ? "—"
                  : `${number(s.averageRating)} / 5`,
                `${number(s.ratings)} تقييمات`,
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
              <h3>أين يذهب وقت الطلب؟</h3>
              <p className={styles.muted}>متوسط كل مرحلة من التوقيت المسجل</p>
              {[
                ["انتظار القبول", s.acceptMinutes],
                ["التنفيذ والتجهيز", s.prepareMinutes],
                ["انتظار التسليم", s.handoffMinutes],
              ].map(([label, value]) => (
                <div className={styles.row} key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {value === null ? "—" : `${number(Number(value))} د`}
                  </strong>
                </div>
              ))}
              <p className={styles.muted}>
                الأوقات التاريخية غير المسجلة لا تدخل في المتوسط.
              </p>
            </article>
            <article className={styles.panel}>
              <h3>الأكثر طلباً</h3>
              <p className={styles.muted}>حسب الكمية في الطلبات المكتملة</p>
              {data.popular.length ? (
                <ol className={styles.list}>
                  {data.popular.map((p, index) => (
                    <li key={p.id}>
                      <div className={styles.heading}>
                        <span>
                          {index + 1}. {p.name}
                        </span>
                        <strong>{number(p.quantity)}</strong>
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
                <p className={styles.muted}>
                  ستظهر الأصناف بعد اكتمال أول طلب.
                </p>
              )}
            </article>
          </div>
          <article className={styles.panel}>
            <h3>حركة الطلبات</h3>
            <p className={styles.muted}>الطلبات اليومية · توقيت الرياض</p>
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
                  <summary>عرض الأرقام اليومية</summary>
                  {data.daily.map((day) => (
                    <div className={styles.row} key={day.day}>
                      <time>{day.day}</time>
                      <span>{number(day.orders)} طلب</span>
                    </div>
                  ))}
                </details>
              </>
            ) : (
              <p className={styles.muted}>لا توجد طلبات في هذه الفترة.</p>
            )}
          </article>
        </>
      ) : null}
    </section>
  );
}
