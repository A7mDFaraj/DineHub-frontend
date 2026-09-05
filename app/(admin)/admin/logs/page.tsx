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
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: "معلومة",
  warn: "تحذير",
  error: "خطأ",
};

const SOURCE_LABELS: Record<LogSource, string> = {
  backend: "الخادم",
  frontend: "المتصفح",
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "medium",
});

function getLoadError(error: unknown): string {
  if (!axios.isAxiosError(error)) return "تعذّر تحميل سجل النظام.";
  if (error.response?.status === 403) return "حسابك لا يملك صلاحية عرض السجل.";
  return "تعذّر الاتصال بسجل النظام. تحقق من الخادم ثم حاول مرة أخرى.";
}

function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

function describeLog(log: OperationalLog) {
  const failed = (log.statusCode ?? 0) >= 400;
  const action = log.path === "/api/auth/sign-in/email" || log.event.startsWith("auth.sign_in") ? "تسجيل الدخول"
    : log.path === "/api/auth/sign-out" || log.event.startsWith("auth.sign_out") ? "تسجيل الخروج"
    : log.path === "/api/auth/sign-up/email" || log.event.startsWith("auth.sign_up") ? "إنشاء حساب" : null;
  if (action) {
    const explanation = log.statusCode === 401 ? "لم تُقبل بيانات الدخول أو الجلسة. لا يمكن الجزم إن كان السبب البريد أم كلمة المرور."
      : log.statusCode === 429 ? "محاولات كثيرة خلال وقت قصير. انتظر قليلاً قبل إعادة المحاولة."
      : (log.statusCode ?? 0) >= 500 ? "تعذر إكمال العملية بسبب خطأ في الخادم. افتح التفاصيل وراجع رقم التتبع."
      : log.statusCode === 403 ? "رفض الخادم العملية. راجع صلاحية الحساب وإعدادات الوصول."
      : failed ? "رفضت العملية. راجع رمز الحالة والتفاصيل لمعرفة سبب الرفض."
      : "اكتملت العملية بنجاح؛ لا يلزم اتخاذ إجراء.";
    return { title: `${failed ? "فشل" : "نجاح"} ${action}`, explanation };
  }
  if ((log.statusCode ?? 0) >= 500) return { title: "خطأ في الخادم", explanation: "تعذر إكمال الطلب. استخدم رقم التتبع لتحديد سبب الخطأ في التفاصيل." };
  if (log.statusCode === 401) return { title: "جلسة غير صالحة أو منتهية", explanation: "الطلب يحتاج تسجيل الدخول. قد يظهر طبيعياً بعد انتهاء الجلسة." };
  if (log.statusCode === 403) return { title: "طلب خارج صلاحيات المستخدم", explanation: "منع الخادم الوصول. راجع صلاحيات المستخدم إذا كان يحتاج هذه العملية." };
  if (log.statusCode === 404) return { title: "رابط أو عنصر غير موجود", explanation: "قد يكون الرابط قديماً أو العنصر محذوفاً. راجع المسار أدناه." };
  if (log.statusCode === 409) return { title: "تعارض مع تحديث آخر", explanation: "ربما غيّر موظف آخر الحالة أو توجد بيانات مكررة. حدّث الصفحة قبل المحاولة مجدداً." };
  if (log.statusCode === 429) return { title: "تجاوز معدل الطلبات", explanation: "أرسل الجهاز طلبات كثيرة. انتظر ثم أعد المحاولة." };
  if (log.statusCode === 499) return { title: "أُغلق الاتصال قبل اكتمال الطلب", explanation: "قد يحدث عند مغادرة الصفحة أو ضعف الشبكة. لا يعني بالضرورة وجود عطل في الخادم." };
  if (log.statusCode === 400 || log.statusCode === 422) return { title: "بيانات الطلب غير مقبولة", explanation: "راجع الحقول المدخلة ورسالة التحقق في التفاصيل." };
  if (log.event === "http.slow_request") return { title: "استجابة بطيئة", explanation: "اكتمل الطلب لكن استغرق وقتاً أطول من الحد المحدد. راقب التكرار؛ المثلث الأصفر لا يعني فشل العملية." };
  if (log.source === "frontend") return { title: "حدث في متصفح المستخدم", explanation: log.message };
  return { title: failed ? "طلب لم يكتمل" : "عملية مكتملة", explanation: log.message };
}
function logIdentity(log: OperationalLog) {
  const email = log.metadata?.attemptedEmail;
  return typeof email === "string" && email ? email : log.userId || "غير مسجل في هذا الحدث";
}

function LogDetails({ log, onClose }: { log: OperationalLog | null; onClose: () => void }) {
  return (
    <Dialog.Root open={Boolean(log)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialogContent} dir="rtl" aria-describedby="log-detail-description">
          {log ? (
            <>
              <div className={styles.dialogHeader}>
                <div>
                  <p><span data-level={log.level}>{LEVEL_LABELS[log.level]}</span>{SOURCE_LABELS[log.source]}</p>
                  <Dialog.Title>{describeLog(log).title}</Dialog.Title>
                  <Dialog.Description id="log-detail-description">{describeLog(log).explanation}</Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button type="button" aria-label="إغلاق تفاصيل السجل"><X aria-hidden="true" size={20} /></button>
                </Dialog.Close>
              </div>

              <dl className={styles.detailGrid}>
                <div><dt>وقت الحدث</dt><dd><time dateTime={log.createdAt}>{dateFormatter.format(new Date(log.createdAt))}</time></dd></div>
                <div><dt>الحالة</dt><dd>{log.statusCode ?? "—"}</dd></div>
                <div><dt>المدة</dt><dd dir="ltr">{log.durationMs === null ? "—" : `${log.durationMs} ms`}</dd></div>
                <div><dt>الطريقة والمسار</dt><dd dir="ltr">{[log.method, log.path].filter(Boolean).join(" ") || "—"}</dd></div>
                <div className={styles.wideDetail}>
                  <dt>Request ID</dt>
                  <dd dir="ltr">
                    <code>{log.requestId ?? "—"}</code>
                    {log.requestId ? <button type="button" onClick={() => copyText(log.requestId!)} aria-label="نسخ رقم التتبع"><Copy aria-hidden="true" size={15} /></button> : null}
                  </dd>
                </div>
                <div><dt>المستخدم</dt><dd dir="ltr">{logIdentity(log)}</dd></div>
                <div><dt>الفرع</dt><dd dir="ltr">{log.branchId ?? "—"}</dd></div>
              </dl>

              <section className={styles.codeSection}>
                <h3>الحدث ورسالة الخادم</h3>
                <pre dir="auto">{log.event}{"\n"}{log.message}</pre>
              </section>
              {log.stack ? (
                <section className={styles.codeSection}>
                  <h3><Braces aria-hidden="true" size={17} />Stack trace</h3>
                  <pre dir="ltr">{log.stack}</pre>
                </section>
              ) : null}

              {log.metadata && Object.keys(log.metadata).length ? (
                <section className={styles.codeSection}>
                  <h3><Braces aria-hidden="true" size={17} />Metadata</h3>
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
      if (version === requestVersion.current && !controller.signal.aborted) setLoadError(getLoadError(error));
    } finally {
      if (pendingRequest.current !== controller) return;
      pendingRequest.current = null;
      if (append) setIsLoadingMore(false);
      else if (silent) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [filters, isSlowMode]);

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

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true" />مراقبة DineHub من المتصفح إلى قاعدة البيانات</p>
          <h1>كل إشارة مهمة، في سجل واحد.</h1>
          <p>أخطاء المتصفح، طلبات الخادم، والتغييرات التشغيلية مرتبطة برقم تتبع واحد—من دون كلمات مرور أو كوكيز أو محتوى حساس.</p>
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
            <span>{isSlowMode ? "الوضع البطيء مفعّل" : "الوضع البطيء"}</span>
          </button>
          <button
            className={styles.liveButton}
            data-live={isLive}
            type="button"
            aria-pressed={isLive}
            onClick={toggleLive}
          >
            {isLive ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
            <span>{isLive ? "إيقاف التحديث" : "تشغيل التحديث"}</span>
          </button>
          <button className={styles.refreshButton} type="button" onClick={() => void loadLogs(false, true)} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? styles.spinning : undefined} aria-hidden="true" size={18} />
            <span>{isRefreshing ? "جارٍ التحديث…" : "تحديث الآن"}</span>
          </button>
        </div>
      </header>

      <nav className={styles.quickFilters} aria-label="نوع الأحداث">
        {([
          ["all", "كل الأحداث"], ["auth", "الدخول والخروج"],
          ["auth_failures", "محاولات الحساب الفاشلة"], ["attention", "أخطاء وطلبات مرفوضة"],
        ] as const).map(([category, label]) => (
          <button type="button" key={category} aria-pressed={filters.category === category}
            onClick={() => { setSearchDraft(""); setFilters({ category, level: "all", source: "all", search: "" }); }}>
            {label}
          </button>
        ))}
      </nav>
      <p className={styles.filterHint}>المثلث الأصفر تنبيه للمراجعة، وقد يعني بطء استجابة فقط. ملخص الأرقام يشمل كل الأحداث خلال 24 ساعة. البريد المعروض هو العنوان المستخدم في المحاولة؛ الأحداث القديمة قد لا تحتويه.</p>
      <section className={styles.summaryGrid} aria-label="ملخص آخر 24 ساعة">
        <article data-tone="healthy">
          <span><Activity aria-hidden="true" size={20} /></span>
          <small>كل الأحداث</small>
          <strong>{summary.total.toLocaleString("ar-SA")}</strong>
          <p>خلال آخر 24 ساعة</p>
        </article>
        <article data-tone="error">
          <span><CircleAlert aria-hidden="true" size={20} /></span>
          <small>أخطاء حرجة</small>
          <strong>{summary.errors.toLocaleString("ar-SA")}</strong>
          <p>تحتاج إلى مراجعة</p>
        </article>
        <article data-tone="warning">
          <span><AlertTriangle aria-hidden="true" size={20} /></span>
          <small>تحذيرات</small>
          <strong>{summary.warnings.toLocaleString("ar-SA")}</strong>
          <p>بطء أو رفض طلب؛ ليست كلها أعطالاً</p>
        </article>
        <article data-tone="frontend">
          <span><MonitorSmartphone aria-hidden="true" size={20} /></span>
          <small>من المتصفح</small>
          <strong>{summary.frontend.toLocaleString("ar-SA")}</strong>
          <p>أجهزة العملاء والإدارة</p>
        </article>
      </section>

      <section className={styles.logPanel} aria-labelledby="system-log-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="system-log-title"><ShieldCheck aria-hidden="true" size={20} />سجل النظام</h2>
            <p data-paused={!isLive}>
              <span className={styles.liveDot} aria-hidden="true" />
              {!isLive
                ? "التحديث متوقف — جمع الأحداث مستمر في الخلفية"
                : isSlowMode
                  ? "الوضع البطيء — آخر 3 أحداث كل دقيقتين"
                  : "تحديث هادئ كل دقيقة أثناء عرض الصفحة"}
            </p>
          </div>

          <form className={styles.filters} onSubmit={submitSearch} role="search">
            <label className={styles.searchField}>
              <span className={styles.srOnly}>ابحث في السجل</span>
              <Search aria-hidden="true" size={18} />
              <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="بريد المستخدم، رسالة، أو رقم تتبع" dir="auto" />
              {searchDraft ? <button type="button" onClick={() => setSearchDraft("")} aria-label="مسح البحث"><X aria-hidden="true" size={16} /></button> : null}
            </label>

            <label className={styles.selectField}>
              <span className={styles.srOnly}>مستوى السجل</span>
              <select value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value as FilterValue<LogLevel> }))}>
                <option value="all">كل المستويات</option>
                <option value="error">الأخطاء</option>
                <option value="warn">التحذيرات</option>
                <option value="info">المعلومات</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>

            <label className={styles.selectField}>
              <span className={styles.srOnly}>مصدر السجل</span>
              <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value as FilterValue<LogSource> }))}>
                <option value="all">كل المصادر</option>
                <option value="backend">الخادم</option>
                <option value="frontend">المتصفح</option>
              </select>
              <ChevronDown aria-hidden="true" size={16} />
            </label>

            <button className={styles.searchButton} type="submit">بحث</button>
          </form>
        </div>

        {loadError && logs.length > 0 ? <p className={styles.filterHint} role="alert">{loadError} — آخر نتائج محملة ما زالت ظاهرة.</p> : null}
        {isLoading ? (
          <div className={styles.statePanel} aria-busy="true"><Loader2 className={styles.spinning} aria-hidden="true" size={28} /><h3>نقرأ إشارات النظام…</h3><p>نجمع أحدث أحداث الخادم والمتصفح.</p></div>
        ) : loadError && !logs.length ? (
          <div className={styles.statePanel} role="alert"><CircleAlert aria-hidden="true" size={28} /><h3>تعذّر فتح السجل</h3><p>{loadError}</p><button type="button" onClick={() => void loadLogs()}>إعادة المحاولة</button></div>
        ) : logs.length ? (
          <>
            <div className={styles.logList}>
              {logs.map((log) => (
                <article className={styles.logRow} data-level={log.level} key={log.id}>
                  <span className={styles.levelSignal} aria-hidden="true">
                    {log.level === "error" ? <CircleAlert size={18} /> : log.level === "warn" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </span>
                  <div className={styles.logBody}>
                    <div className={styles.logTitle}>
                      <span data-level={log.level}>{LEVEL_LABELS[log.level]}</span>
                      <span data-source={log.source}>{log.source === "frontend" ? <MonitorSmartphone aria-hidden="true" size={14} /> : <Server aria-hidden="true" size={14} />}{SOURCE_LABELS[log.source]}</span>
                      <strong>{describeLog(log).title}</strong>
                    </div>
                    <p>{describeLog(log).explanation}</p>
                    {log.event.startsWith("auth.") || log.path?.startsWith("/api/auth/") ? <p>الحساب: <bdi>{logIdentity(log)}</bdi></p> : null}
                    <div className={styles.logMeta}>
                      {log.method || log.path ? <code dir="ltr">{[log.method, log.path].filter(Boolean).join(" ")}</code> : null}
                      {log.statusCode ? <span dir="ltr">HTTP {log.statusCode}</span> : null}
                      {log.durationMs !== null ? <span dir="ltr"><Clock3 aria-hidden="true" size={13} />{log.durationMs} ms</span> : null}
                      {log.requestId ? <button type="button" onClick={() => copyText(log.requestId!)} title="نسخ رقم التتبع" dir="ltr"><Copy aria-hidden="true" size={13} />{log.requestId.slice(0, 13)}…</button> : null}
                    </div>
                  </div>
                  <div className={styles.logTime}>
                    <time dateTime={log.createdAt}>{dateFormatter.format(new Date(log.createdAt))}</time>
                    <button type="button" onClick={() => setSelectedLog(log)}>التفاصيل</button>
                  </div>
                </article>
              ))}
            </div>

            {!isSlowMode && nextCursor ? (
              <button className={styles.loadMoreButton} type="button" onClick={() => void loadLogs(true)} disabled={isLoadingMore}>
                {isLoadingMore ? <Loader2 className={styles.spinning} aria-hidden="true" size={17} /> : null}
                {isLoadingMore ? "جارٍ تحميل المزيد…" : "عرض أحداث أقدم"}
              </button>
            ) : (
              <p className={styles.endOfLog}>
                {isSlowMode ? "الوضع البطيء يعرض آخر 3 أحداث فقط." : "وصلت إلى نهاية النتائج المتاحة."}
              </p>
            )}
          </>
        ) : (
          <div className={styles.statePanel}><Activity aria-hidden="true" size={30} /><h3>لا توجد أحداث مطابقة</h3><p>النظام هادئ، أو أن عوامل التصفية ضيقة.</p><button type="button" onClick={clearFilters}>مسح عوامل التصفية</button></div>
        )}
      </section>

      <LogDetails log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
