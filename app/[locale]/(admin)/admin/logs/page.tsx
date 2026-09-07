"use client";

import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Braces,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Gauge,
  Loader2,
  MonitorSmartphone,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import styles from "./logs.module.css";

type LogLevel = "info" | "warn" | "error";
type LogSource = "backend" | "frontend";
type FilterValue<T extends string> = "all" | T;

interface OperationalLog {
  id: string;
  level: LogLevel;
  source: LogSource;
  event: string;
  message: string;
  requestId: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  durationMs: number | null;
  userId: string | null;
  branchId: string | null;
  errorName: string | null;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface LogSummary {
  total: number;
  errors: number;
  warnings: number;
  frontend: number;
  backend: number;
}

interface LogsResponse {
  items: OperationalLog[];
  nextCursor: string | null;
  summary: { last24Hours: LogSummary };
}

interface LogFilters {
  level: FilterValue<LogLevel>;
  source: FilterValue<LogSource>;
  search: string;
  category: "all" | "auth" | "auth_failures" | "attention";
}

const EMPTY_SUMMARY: LogSummary = { total: 0, errors: 0, warnings: 0, frontend: 0, backend: 0 };

function getLoadError(error: unknown, isRtl: boolean): string {
  if (!axios.isAxiosError(error)) return isRtl ? "تعذّر تحميل سجل النظام." : "Failed to load system logs.";
  if (error.response?.status === 403) return isRtl ? "حسابك لا يملك صلاحية عرض السجل." : "Your account does not have permission to view logs.";
  return isRtl ? "تعذّر الاتصال بسجل النظام. تحقق من الخادم ثم حاول مرة أخرى." : "Failed to connect to logs service. Check connection and retry.";
}

function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

function describeLog(log: OperationalLog, isRtl: boolean) {
  const failed = (log.statusCode ?? 0) >= 400;
  const action = log.path === "/api/auth/sign-in/email" || log.event.startsWith("auth.sign_in") ? (isRtl ? "تسجيل الدخول" : "Sign In")
    : log.path === "/api/auth/sign-out" || log.event.startsWith("auth.sign_out") ? (isRtl ? "تسجيل الخروج" : "Sign Out")
    : log.path === "/api/auth/sign-up/email" || log.event.startsWith("auth.sign_up") ? (isRtl ? "إنشاء حساب" : "Sign Up") : null;
  if (action) {
    const confirmedReason = log.statusCode === 401 ? log.metadata?.reason : undefined;
    const explanation = confirmedReason === "wrong_password"
      ? (isRtl ? "كلمة المرور غير صحيحة لهذا الحساب. الحساب موجود، لكن كلمة المرور المدخلة لم تطابق المسجلة." : "Invalid password for this account. Account exists, but credentials did not match.")
      : confirmedReason === "password_not_set"
      ? (isRtl ? "هذا الحساب لا يملك كلمة مرور مسجلة. يحتاج إعداد كلمة مرور أو استخدام طريقة الدخول المرتبطة به." : "Account has no registered password. Needs password setup or linked authentication method.")
      : confirmedReason === "password_account_unavailable"
      ? (isRtl ? "لا يوجد حساب يدعم الدخول بالبريد وكلمة المرور لهذا العنوان. قد يكون البريد غير مسجل أو الحساب يستخدم طريقة دخول أخرى." : "No password-based account found for this email. Check address or use alternative login.")
      : log.statusCode === 401
      ? (isRtl ? "لم تُقبل بيانات الدخول أو الجلسة. لا يمكن الجزم إن كان السبب البريد أم كلمة المرور." : "Credentials or session rejected. Unable to determine if issue is email or password.")
      : log.statusCode === 429
      ? (isRtl ? "محاولات كثيرة خلال وقت قصير. انتظر قليلاً قبل إعادة المحاولة." : "Too many requests in a short time. Please wait before retrying.")
      : (log.statusCode ?? 0) >= 500
      ? (isRtl ? "تعذر إكمال العملية بسبب خطأ في الخادم. افتح التفاصيل وراجع رقم التتبع." : "Server error prevented completing request. Inspect details and trace ID.")
      : log.statusCode === 403
      ? (isRtl ? "رفض الخادم العملية. راجع صلاحية الحساب وإعدادات الوصول." : "Forbidden by server. Check account permissions and access policies.")
      : failed
      ? (isRtl ? "رفضت العملية. راجع رمز الحالة والتفاصيل لمعرفة سبب الرفض." : "Operation rejected. Inspect status code and details for reason.")
      : (isRtl ? "اكتملت العملية بنجاح؛ لا يلزم اتخاذ إجراء." : "Operation completed successfully; no action required.");

    const title = confirmedReason === "wrong_password"
      ? (isRtl ? "فشل الدخول — كلمة المرور غير صحيحة" : "Sign in failed — Incorrect password")
      : `${failed ? (isRtl ? "فشل" : "Failed") : (isRtl ? "نجاح" : "Success")} ${action}`;

    return { title, explanation };
  }
  if ((log.statusCode ?? 0) >= 500) return { title: isRtl ? "خطأ في الخادم" : "Server Error", explanation: isRtl ? "تعذر إكمال الطلب. استخدم رقم التتبع لتحديد سبب الخطأ في التفاصيل." : "Failed to complete request. Use Request ID in details to diagnose cause." };
  if (log.statusCode === 401) return { title: isRtl ? "جلسة غير صالحة أو منتهية" : "Invalid or Expired Session", explanation: isRtl ? "الطلب يحتاج تسجيل الدخول. قد يظهر طبيعياً بعد انتهاء الجلسة." : "Request requires sign-in. Expected behavior after session expiry." };
  if (log.statusCode === 403) return { title: isRtl ? "طلب خارج صلاحيات المستخدم" : "Forbidden / Access Denied", explanation: isRtl ? "منع الخادم الوصول. راجع صلاحيات المستخدم إذا كان يحتاج هذه العملية." : "Server denied access. Review user permissions if access is needed." };
  if (log.statusCode === 404) return { title: isRtl ? "رابط أو عنصر غير موجود" : "Not Found (404)", explanation: isRtl ? "قد يكون الرابط قديماً أو العنصر محذوفاً. راجع المسار أدناه." : "Endpoint or resource not found. Check the path below." };
  if (log.statusCode === 409) return { title: isRtl ? "تعارض مع تحديث آخر" : "Conflict (409)", explanation: isRtl ? "ربما غيّر موظف آخر الحالة أو توجد بيانات مكررة. حدّث الصفحة قبل المحاولة مجدداً." : "Conflict detected with another update or duplicate data. Refresh before retrying." };
  if (log.statusCode === 429) return { title: isRtl ? "تجاوز معدل الطلبات" : "Rate Limit Exceeded (429)", explanation: isRtl ? "أرسل الجهاز طلبات كثيرة. انتظر ثم أعد المحاولة." : "Too many requests. Please throttle requests and retry." };
  if (log.statusCode === 499) return { title: isRtl ? "أُغلق الاتصال قبل اكتمال الطلب" : "Client Closed Connection (499)", explanation: isRtl ? "قد يحدث عند مغادرة الصفحة أو ضعف الشبكة. لا يعني بالضرورة وجود عطل في الخادم." : "Connection closed prior to completion. Often due to client navigation or network drops." };
  if (log.statusCode === 400 || log.statusCode === 422) return { title: isRtl ? "بيانات الطلب غير مقبولة" : "Unprocessable / Bad Request", explanation: isRtl ? "راجع الحقول المدخلة ورسالة التحقق في التفاصيل." : "Inspect input parameters and validation errors in details." };
  if (log.event === "http.slow_request") return { title: isRtl ? "استجابة بطيئة" : "Slow Response Detected", explanation: isRtl ? "اكتمل الطلب لكن استغرق وقتاً أطول من الحد المحدد. راقب التكرار؛ المثلث الأصفر لا يعني فشل العملية." : "Request finished but took longer than threshold. Yellow indicator denotes latency, not failure." };
  if (log.source === "frontend") return { title: isRtl ? "حدث في متصفح المستخدم" : "Client Browser Event", explanation: log.message };
  return { title: failed ? (isRtl ? "طلب لم يكتمل" : "Incomplete Request") : (isRtl ? "عملية مكتملة" : "Completed Operation"), explanation: log.message };
}

function logIdentity(log: OperationalLog, isRtl: boolean) {
  const email = log.metadata?.attemptedEmail;
  return typeof email === "string" && email ? email : log.userId || (isRtl ? "غير مسجل في هذا الحدث" : "Not recorded in this event");
}

function LogDetails({
  log,
  onClose,
  isRtl,
  dateFormatter,
  t,
}: {
  log: OperationalLog | null;
  onClose: () => void;
  isRtl: boolean;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: string) => string;
}) {
  return (
    <Dialog.Root open={Boolean(log)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"} aria-describedby="log-detail-description">
          {log ? (
            <>
              <div className={styles.dialogHeader}>
                <div>
                  <p>
                    <span data-level={log.level}>{t(`levels.${log.level}`)}</span>
                    {t(`sources.${log.source}`)}
                  </p>
                  <Dialog.Title>{describeLog(log, isRtl).title}</Dialog.Title>
                  <Dialog.Description id="log-detail-description">{describeLog(log, isRtl).explanation}</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" aria-label={isRtl ? "إغلاق تفاصيل السجل" : "Close log details"}>
                    <X aria-hidden="true" size={20} />
                  </button>
                </Dialog.Close>
              </div>

              <dl className={styles.detailGrid}>
                <div>
                  <dt>{t("colTime")}</dt>
                  <dd><time dateTime={log.createdAt}>{dateFormatter.format(new Date(log.createdAt))}</time></dd>
                </div>
                <div>
                  <dt>{t("status")}</dt>
                  <dd>{log.statusCode ?? "—"}</dd>
                </div>
                <div>
                  <dt>{t("duration")}</dt>
                  <dd dir="ltr">{log.durationMs === null ? "—" : `${log.durationMs} ms`}</dd>
                </div>
                <div>
                  <dt>{t("methodAndPath")}</dt>
                  <dd dir="ltr">{[log.method, log.path].filter(Boolean).join(" ") || "—"}</dd>
                </div>
                <div className={styles.wideDetail}>
                  <dt>Request ID</dt>
                  <dd dir="ltr">
                    <code>{log.requestId ?? "—"}</code>
                    {log.requestId ? (
                      <button type="button" onClick={() => copyText(log.requestId!)} aria-label={t("copyTraceId")}>
                        <Copy aria-hidden="true" size={15} />
                      </button>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt>{t("user")}</dt>
                  <dd dir="ltr">{logIdentity(log, isRtl)}</dd>
                </div>
                <div>
                  <dt>{t("branch")}</dt>
                  <dd dir="ltr">{log.branchId ?? "—"}</dd>
                </div>
              </dl>

              <section className={styles.codeSection}>
                <h3>{isRtl ? "الحدث ورسالة الخادم" : "Event & Server Message"}</h3>
                <pre dir="auto">{log.event}{"\n"}{log.message}</pre>
              </section>
              {log.stack ? (
                <section className={styles.codeSection}>
                  <h3><Braces aria-hidden="true" size={17} />{t("stackTrace")}</h3>
                  <pre dir="ltr">{log.stack}</pre>
                </section>
              ) : null}

              {log.metadata && Object.keys(log.metadata).length ? (
                <section className={styles.codeSection}>
                  <h3><Braces aria-hidden="true" size={17} />{t("metadata")}</h3>
                  <pre dir="ltr">{JSON.stringify(log.metadata, null, 2)}</pre>
                </section>
              ) : null}
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function LogsPage() {
  const locale = useLocale();
  const t = useTranslations("AdminLogs");
  const isRtl = locale !== "en";

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA", {
    dateStyle: "medium",
    timeStyle: "medium",
  }), [locale]);

  const [logs, setLogs] = useState<OperationalLog[]>([]);
  const [summary, setSummary] = useState<LogSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({ level: "all", source: "all", search: "", category: "all" });
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedLog, setSelectedLog] = useState<OperationalLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const nextCursorRef = useRef<string | null>(null);

  const loadLogs = useCallback(async (append = false, silent = false) => {
    if ((append || silent) && pendingRequest.current) return;
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;
    const version = append ? requestVersion.current : ++requestVersion.current;
    if (append) setIsLoadingMore(true);
    else if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    if (!silent) setLoadError(null);

    try {
      const params: Record<string, string | number> = { limit: isSlowMode ? 3 : 50 };
      if (filters.level !== "all") params.level = filters.level;
      if (filters.source !== "all") params.source = filters.source;
      if (filters.search) params.search = filters.search;
      if (filters.category !== "all") params.category = filters.category;
      if (append && nextCursorRef.current) params.cursor = nextCursorRef.current;

      const { data } = await apiClient.get<LogsResponse>("/admin/logs", { params, signal: controller.signal });
      if (version !== requestVersion.current) return;
      setLogs((current) => append ? [...current, ...data.items] : data.items);
      const cursor = isSlowMode ? null : data.nextCursor;
      setNextCursor(cursor);
      nextCursorRef.current = cursor;
      setSummary(data.summary.last24Hours);
      setLoadError(null);
    } catch (error) {
      if (version === requestVersion.current && !controller.signal.aborted) setLoadError(getLoadError(error, isRtl));
    } finally {
      if (pendingRequest.current !== controller) return;
      pendingRequest.current = null;
      if (append) setIsLoadingMore(false);
      else if (silent) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [filters, isSlowMode, isRtl]);

  useEffect(() => {
    const timer = setTimeout(() => void loadLogs(), 0);
    return () => { clearTimeout(timer); ++requestVersion.current; pendingRequest.current?.abort(); pendingRequest.current = null; };
  }, [loadLogs]);

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(
      () => { if (document.visibilityState === "visible") void loadLogs(false, true); },
      isSlowMode ? 120_000 : 60_000,
    );
    return () => window.clearInterval(timer);
  }, [isLive, isSlowMode, loadLogs]);

  const toggleLive = () => {
    if (isLive) {
      setIsLive(false);
      return;
    }

    setIsLive(true);
    void loadLogs(false, true);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = searchDraft.trim();
    if (search === filters.search) void loadLogs(false, true);
    else setFilters((current) => ({ ...current, search }));
  };

  const clearFilters = () => {
    setSearchDraft("");
    setFilters({ level: "all", source: "all", search: "", category: "all" });
  };

  const categoryLabels = {
    all: t("catAll"),
    auth: t("catAuth"),
    auth_failures: t("catAuthFailures"),
    attention: t("catAttention"),
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {isRtl ? "مراقبة DineHub من المتصفح إلى قاعدة البيانات" : "DineHub Telemetry • Browser to Database"}
          </p>
          <h1>{t("pageTitle")}</h1>
          <p>{t("pageDesc")}</p>
        </div>
        <div className={styles.headerControls}>
          <button
            className={styles.modeButton}
            data-active={isSlowMode}
            type="button"
            aria-pressed={isSlowMode}
            onClick={() => setIsSlowMode((current) => !current)}
          >
            <Gauge aria-hidden="true" size={18} />
            <span>{isSlowMode ? (isRtl ? "الوضع البطيء مفعّل" : "Slow Mode Active") : (isRtl ? "الوضع البطيء" : "Slow Mode")}</span>
          </button>
          <button
            className={styles.liveButton}
            data-live={isLive}
            type="button"
            aria-pressed={isLive}
            onClick={toggleLive}
          >
            {isLive ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
            <span>{isLive ? (isRtl ? "إيقاف التحديث" : "Pause Feed") : (isRtl ? "تشغيل التحديث" : "Resume Feed")}</span>
          </button>
          <button className={styles.refreshButton} type="button" onClick={() => void loadLogs(false, true)} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? styles.spinning : undefined} aria-hidden="true" size={18} />
            <span>{isRefreshing ? (isRtl ? "جارٍ التحديث…" : "Refreshing…") : t("refresh")}</span>
          </button>
        </div>
      </header>

      <nav className={styles.quickFilters} aria-label={isRtl ? "نوع الأحداث" : "Event Categories"}>
        {(["all", "auth", "auth_failures", "attention"] as const).map((category) => (
          <button
            type="button"
            key={category}
            aria-pressed={filters.category === category}
            onClick={() => {
              setSearchDraft("");
              setFilters({ category, level: "all", source: "all", search: "" });
            }}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </nav>

      <p className={styles.filterHint}>
        {isRtl
          ? "المثلث الأصفر تنبيه للمراجعة، وقد يعني بطء استجابة فقط. ملخص الأرقام يشمل كل الأحداث خلال 24 ساعة."
          : "Yellow triangle indicates review alert or latency. 24h summary metrics cover all operational events across services."}
      </p>

      <section className={styles.summaryGrid} aria-label={isRtl ? "ملخص آخر 24 ساعة" : "Last 24 Hours Summary"}>
        <article data-tone="healthy">
          <span><Activity aria-hidden="true" size={20} /></span>
          <small>{t("kpiTotal")}</small>
          <strong>{summary.total.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "خلال آخر 24 ساعة" : "Past 24 hours"}</p>
        </article>
        <article data-tone="error">
          <span><CircleAlert aria-hidden="true" size={20} /></span>
          <small>{t("kpiErrors")}</small>
          <strong>{summary.errors.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "تحتاج إلى مراجعة" : "Requires attention"}</p>
        </article>
        <article data-tone="warning">
          <span><AlertTriangle aria-hidden="true" size={20} /></span>
          <small>{t("kpiWarnings")}</small>
          <strong>{summary.warnings.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "بطء أو رفض طلب؛ ليست كلها أعطالاً" : "Latency or rejected requests"}</p>
        </article>
        <article data-tone="frontend">
          <span><MonitorSmartphone aria-hidden="true" size={20} /></span>
          <small>{t("kpiFrontend")}</small>
          <strong>{summary.frontend.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "أجهزة العملاء والإدارة" : "Guest & staff devices"}</p>
        </article>
      </section>

      <section className={styles.logPanel} aria-labelledby="system-log-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="system-log-title">
              <ShieldCheck aria-hidden="true" size={20} />
              {isRtl ? "سجل النظام" : "System Events"}
            </h2>
            <p data-paused={!isLive}>
              <span className={styles.liveDot} aria-hidden="true" />
              {!isLive
                ? (isRtl ? "التحديث متوقف — جمع الأحداث مستمر في الخلفية" : "Live stream paused — background telemetry ongoing")
                : isSlowMode
                  ? (isRtl ? "الوضع البطيء — آخر 3 أحداث كل دقيقتين" : "Slow mode — latest 3 events every 2 minutes")
                  : (isRtl ? "تحديث هادئ كل دقيقة أثناء عرض الصفحة" : "Realtime polling active every 60 seconds")}
            </p>
          </div>

          <form className={styles.filters} onSubmit={submitSearch} role="search">
            <label className={styles.searchField}>
              <span className={styles.srOnly}>{t("searchPlaceholder")}</span>
              <Search aria-hidden="true" size={18} />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder={t("searchPlaceholder")}
                dir="auto"
              />
              {searchDraft ? (
                <button type="button" onClick={() => setSearchDraft("")} aria-label={isRtl ? "مسح البحث" : "Clear search"}>
                  <X aria-hidden="true" size={16} />
                </button>
              ) : null}
            </label>

            <label className={styles.selectField}>
              <span className={styles.srOnly}>{t("filterLevel")}</span>
              <select
                value={filters.level}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, level: event.target.value as FilterValue<LogLevel> }))
                }
              >
                <option value="all">{t("allLevels")}</option>
                <option value="error">{t("levels.error")}</option>
                <option value="warn">{t("levels.warn")}</option>
                <option value="info">{t("levels.info")}</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>

            <label className={styles.selectField}>
              <span className={styles.srOnly}>{t("filterSource")}</span>
              <select
                value={filters.source}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, source: event.target.value as FilterValue<LogSource> }))
                }
              >
                <option value="all">{t("allSources")}</option>
                <option value="backend">{t("sources.backend")}</option>
                <option value="frontend">{t("sources.frontend")}</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>

            <button className={styles.searchButton} type="submit">
              {isRtl ? "بحث" : "Search"}
            </button>
          </form>
        </div>

        {loadError && logs.length > 0 ? (
          <p className={styles.filterHint} role="alert">
            {loadError} — {isRtl ? "آخر نتائج محملة ما زالت ظاهرة." : "Previously loaded results remain visible."}
          </p>
        ) : null}

        {isLoading ? (
          <div className={styles.statePanel} aria-busy="true">
            <Loader2 className={styles.spinning} aria-hidden="true" size={28} />
            <h3>{t("loading")}</h3>
            <p>{isRtl ? "نجمع أحدث أحداث الخادم والمتصفح." : "Fetching latest server and client events."}</p>
          </div>
        ) : loadError && !logs.length ? (
          <div className={styles.statePanel} role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <h3>{isRtl ? "تعذّر فتح السجل" : "Failed to open logs"}</h3>
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadLogs()}>
              {isRtl ? "إعادة المحاولة" : "Try Again"}
            </button>
          </div>
        ) : logs.length ? (
          <>
            <div className={styles.logList}>
              {logs.map((log) => {
                const desc = describeLog(log, isRtl);
                return (
                  <article className={styles.logRow} data-level={log.level} key={log.id}>
                    <span className={styles.levelSignal} aria-hidden="true">
                      {log.level === "error" ? (
                        <CircleAlert size={18} />
                      ) : log.level === "warn" ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </span>
                    <div className={styles.logBody}>
                      <div className={styles.logTitle}>
                        <span data-level={log.level}>{t(`levels.${log.level}`)}</span>
                        <span data-source={log.source}>
                          {log.source === "frontend" ? (
                            <MonitorSmartphone aria-hidden="true" size={14} />
                          ) : (
                            <Server aria-hidden="true" size={14} />
                          )}
                          {t(`sources.${log.source}`)}
                        </span>
                        <strong>{desc.title}</strong>
                      </div>
                      <p>{desc.explanation}</p>
                      {log.event.startsWith("auth.") || log.path?.startsWith("/api/auth/") ? (
                        <p>
                          {isRtl ? "الحساب: " : "Account: "}
                          <bdi>{logIdentity(log, isRtl)}</bdi>
                        </p>
                      ) : null}
                      <div className={styles.logMeta}>
                        {log.method || log.path ? (
                          <code dir="ltr">{[log.method, log.path].filter(Boolean).join(" ")}</code>
                        ) : null}
                        {log.statusCode ? <span dir="ltr">HTTP {log.statusCode}</span> : null}
                        {log.durationMs !== null ? (
                          <span dir="ltr">
                            <Clock3 aria-hidden="true" size={13} />
                            {log.durationMs} ms
                          </span>
                        ) : null}
                        {log.requestId ? (
                          <button
                            type="button"
                            onClick={() => copyText(log.requestId!)}
                            title={t("copyTraceId")}
                            dir="ltr"
                          >
                            <Copy aria-hidden="true" size={13} />
                            {log.requestId.slice(0, 13)}…
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.logTime}>
                      <time dateTime={log.createdAt}>{dateFormatter.format(new Date(log.createdAt))}</time>
                      <button type="button" onClick={() => setSelectedLog(log)}>
                        {isRtl ? "التفاصيل" : "Details"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {!isSlowMode && nextCursor ? (
              <button
                className={styles.loadMoreButton}
                type="button"
                onClick={() => void loadLogs(true)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? <Loader2 className={styles.spinning} aria-hidden="true" size={17} /> : null}
                {isLoadingMore ? (isRtl ? "جارٍ تحميل المزيد…" : "Loading more…") : t("loadMore")}
              </button>
            ) : (
              <p className={styles.endOfLog}>
                {isSlowMode
                  ? (isRtl ? "الوضع البطيء يعرض آخر 3 أحداث فقط." : "Slow mode displays only the latest 3 events.")
                  : (isRtl ? "وصلت إلى نهاية النتائج المتاحة." : "End of available events reached.")}
              </p>
            )}
          </>
        ) : (
          <div className={styles.statePanel}>
            <Activity aria-hidden="true" size={30} />
            <h3>{t("emptyTitle")}</h3>
            <p>{t("emptyDesc")}</p>
            <button type="button" onClick={clearFilters}>
              {isRtl ? "مسح عوامل التصفية" : "Clear Filters"}
            </button>
          </div>
        )}
      </section>

      <LogDetails
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        isRtl={isRtl}
        dateFormatter={dateFormatter}
        t={t}
      />
    </div>
  );
}
