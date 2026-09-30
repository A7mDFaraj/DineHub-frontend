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
  Download,
  Gauge,
  Globe,
  KeyRound,
  Laptop,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import styles from "./logs.module.css";

type LogLevel = "info" | "warn" | "error";
type LogSource = "backend" | "frontend";
type FilterValue<T extends string> = "all" | T;
type ActiveTab = "audit" | "system";
type ScopeMode = "business" | "global";

interface ClientDevice {
  browser: string;
  os: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Bot" | "Unknown";
}

interface LogMetadata {
  ip?: string;
  country?: string;
  city?: string;
  userAgent?: string;
  clientDevice?: ClientDevice;
  attemptedEmail?: string;
  auditType?: "auth" | "access" | "data" | "security" | "system";
  outcome?: "succeeded" | "failed" | "blocked" | "denied";
  reason?: string;
  actor?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    ip?: string;
    country?: string;
  };
  target?: {
    type?: string;
    id?: string;
    name?: string;
  };
  [key: string]: unknown;
}

interface OperationalLog {
  id: string;
  businessId: string | null;
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
  metadata: LogMetadata | null;
  createdAt: string;
}

interface LogSummary {
  total: number;
  errors: number;
  warnings: number;
  frontend: number;
  backend: number;
  failedLogins?: number;
  successfulLogins?: number;
  uniqueIps?: number;
  topCountries?: Array<{ country: string; count: number }>;
}

interface LogsResponse {
  items: OperationalLog[];
  nextCursor: string | null;
  summary: { last24Hours: LogSummary };
}

interface LogFilters {
  tab: ActiveTab;
  scope: ScopeMode;
  auditType: "all" | "auth" | "security" | "access" | "data";
  level: FilterValue<LogLevel>;
  source: FilterValue<LogSource>;
  search: string;
  category: "all" | "auth" | "auth_failures" | "attention";
}

const EMPTY_SUMMARY: LogSummary = {
  total: 0,
  errors: 0,
  warnings: 0,
  frontend: 0,
  backend: 0,
  failedLogins: 0,
  successfulLogins: 0,
  uniqueIps: 0,
  topCountries: [],
};

function getCountryFlag(code?: string): string {
  if (!code || code === "LOCAL" || code === "UNKNOWN") return "🌐";
  const upper = code.toUpperCase();
  if (upper.length !== 2) return "🌐";
  const codePoints = [...upper].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function getRiskAssessment(log: OperationalLog, isRtl: boolean) {
  const meta = log.metadata;
  if (log.statusCode === 429) {
    return {
      level: "critical" as const,
      label: isRtl ? "حرج (اشتباه هجوم)" : "Critical (Rate Limit Spike)",
    };
  }
  if (
    log.statusCode === 401 &&
    (meta?.reason === "wrong_password" || log.event.includes("auth.sign_in_failed"))
  ) {
    return {
      level: "high" as const,
      label: isRtl ? "مرتفع (فشل مصادقة)" : "High (Failed Authentication)",
    };
  }
  if (log.statusCode === 403 || log.event.startsWith("security.")) {
    return {
      level: "medium" as const,
      label: isRtl ? "متوسط (رفض صلاحيات)" : "Medium (Access Denied / Security)",
    };
  }
  if ((log.statusCode ?? 0) >= 500) {
    return {
      level: "high" as const,
      label: isRtl ? "مرتفع (عطل خادم)" : "High (Server Fault)",
    };
  }
  return {
    level: "low" as const,
    label: isRtl ? "عادي (عملية قياسية)" : "Low (Standard Operation)",
  };
}

function getLoadError(error: unknown, isRtl: boolean): string {
  if (!axios.isAxiosError(error)) {
    return isRtl ? "تعذّر تحميل سجل النظام." : "Failed to load logs.";
  }
  if (error.response?.status === 403) {
    return isRtl
      ? "حسابك لا يملك صلاحية عرض السجل الإداري."
      : "Your account does not have permission to view administrative logs.";
  }
  return isRtl
    ? "تعذّر الاتصال بسجل النظام. تحقق من الخادم ثم حاول مرة أخرى."
    : "Failed to connect to logs service. Check connection and retry.";
}

function copyText(value: string): void {
  void navigator.clipboard?.writeText(value);
}

function describeLog(log: OperationalLog, isRtl: boolean) {
  const meta = log.metadata;
  const failed = (log.statusCode ?? 0) >= 400;

  if (log.event.startsWith("auth.sign_in")) {
    const isSuccess = !failed;
    const email = meta?.attemptedEmail || log.userId || "—";
    if (isSuccess) {
      return {
        title: isRtl ? `تسجيل دخول ناجح (${email})` : `Successful Sign In (${email})`,
        explanation: isRtl
          ? "تم توثيق بيانات المستخدم وإصدار الجلسة بنجاح."
          : "Credentials verified and authenticated session issued.",
      };
    }
    const reason = meta?.reason;
    if (reason === "wrong_password") {
      return {
        title: isRtl ? `فشل الدخول — كلمة المرور غير صحيحة (${email})` : `Sign In Failed — Wrong Password (${email})`,
        explanation: isRtl
          ? "الحساب مسجل في النظام، لكن كلمة المرور المدخلة غير صحيحة."
          : "Target account exists, but the password provided was incorrect.",
      };
    }
    if (reason === "password_account_unavailable") {
      return {
        title: isRtl ? `فشل الدخول — الحساب غير موجود (${email})` : `Sign In Failed — Account Not Found (${email})`,
        explanation: isRtl
          ? "لا يوجد حساب بهذا البريد. قد تكون محاولة عشوائية أو فحص خارجي."
          : "No account found matching this address. Likely an external probe or typo.",
      };
    }
    if (reason === "rate_limited") {
      return {
        title: isRtl ? `حظر المحاولات — تجاوز معدل الطلبات (${email})` : `Throttled — Too Many Attempts (${email})`,
        explanation: isRtl
          ? "تم حظر المحاولة مؤقتاً بسبب تكرار الطلبات (احتمال محاولة تخمين)."
          : "Request throttled due to excessive attempts (possible brute-force attempt).",
      };
    }
    return {
      title: isRtl ? `فشل تسجيل الدخول (${email})` : `Sign In Attempt Rejected (${email})`,
      explanation: isRtl
        ? "رُفضت بيانات الدخول. راجع التفاصيل لمعرفة رمز الحالة."
        : "Credentials rejected by authentication service.",
    };
  }

  if (log.event === "auth.sign_out") {
    return {
      title: isRtl ? "تسجيل خروج من الحساب" : "User Signed Out",
      explanation: isRtl
        ? "تم إبطال الجلسة ومسح ملفات تعريف الارتباط بنجاح."
        : "Session invalidated and cookies cleared.",
    };
  }

  if (log.event.startsWith("security.password_changed")) {
    return {
      title: isRtl ? "تغيير كلمة المرور" : "Account Password Changed",
      explanation: isRtl
        ? "قام المستخدم بتحديث كلمة المرور الخاصة بحسابه."
        : "User updated their account credentials.",
    };
  }

  if (log.event.startsWith("access.role_updated")) {
    return {
      title: isRtl ? "تعديل صلاحيات أو أدوار" : "Role or Permissions Updated",
      explanation: isRtl
        ? "قام مسؤول بتعديل صلاحيات دور وظيفي في النشاط التجاري."
        : "An administrator updated permissions for a business role.",
    };
  }

  if (log.event.startsWith("access.user_")) {
    return {
      title: isRtl ? "إدارة حساب موظف" : "Staff User Managed",
      explanation: log.message,
    };
  }

  if ((log.statusCode ?? 0) >= 500) {
    return {
      title: isRtl ? "خطأ في الخادم (500)" : "Server Error (500)",
      explanation: isRtl
        ? "تعذر إكمال الطلب. استخدم رقم التتبع في التفاصيل لتحديد العطل."
        : "Request failed with internal server error. Inspect stack trace.",
    };
  }

  if (log.statusCode === 401) {
    return {
      title: isRtl ? "جلسة غير صالحة أو منتهية" : "Unauthorized (401)",
      explanation: isRtl
        ? "الطلب يحتاج تسجيل دخول نشط. طبيعي بعد انتهاء الجلسة."
        : "Request requires authentication or session expired.",
    };
  }

  if (log.statusCode === 403) {
    return {
      title: isRtl ? "طلب خارج الصلاحيات (403)" : "Forbidden Access (403)",
      explanation: isRtl
        ? "منع الخادم تنفيذ العملية لعدم توفر الصلاحية المطلوبة."
        : "Operation denied due to missing permission scope.",
    };
  }

  if (log.statusCode === 404) {
    return {
      title: isRtl ? "العنصر غير موجود (404)" : "Resource Not Found (404)",
      explanation: isRtl ? "الرابط أو العنصر المطلوب غير متوفر." : "Endpoint or resource not found.",
    };
  }

  if (log.event === "http.slow_request") {
    return {
      title: isRtl ? "استجابة بطيئة" : "Slow Response Detected",
      explanation: isRtl
        ? "اكتمل الطلب لكن استغرق وقتاً أطول من المعتاد."
        : "Request succeeded but latency exceeded performance threshold.",
    };
  }

  return {
    title: failed ? (isRtl ? "طلب لم يكتمل" : "Incomplete Request") : (isRtl ? "عملية مكتملة" : "Completed Operation"),
    explanation: log.message,
  };
}

function LogDetailsModal({
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
  if (!log) return null;
  const meta = log.metadata;
  const desc = describeLog(log, isRtl);
  const risk = getRiskAssessment(log, isRtl);
  const isAudit = log.event.startsWith("auth.") || log.event.startsWith("access.") || log.event.startsWith("security.") || Boolean(meta?.auditType && meta.auditType !== "system");

  return (
    <Dialog.Root open={Boolean(log)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"} aria-describedby="log-detail-description">
          <div className={styles.dialogHeader}>
            <div>
              <p>
                <span data-level={log.level}>{t(`levels.${log.level}`)}</span>
                <span className={styles.riskBadge} data-risk={risk.level}>
                  {risk.label}
                </span>
                {meta?.country && (
                  <span className={styles.countryBadge}>
                    <span>{getCountryFlag(meta.country)}</span>
                    <span>{meta.country}</span>
                    {meta.city ? ` • ${meta.city}` : ""}
                  </span>
                )}
              </p>
              <Dialog.Title>{desc.title}</Dialog.Title>
              <Dialog.Description id="log-detail-description">{desc.explanation}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label={isRtl ? "إغلاق" : "Close"}>
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
              <dd dir="ltr">HTTP {log.statusCode ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("ipAddress")}</dt>
              <dd dir="ltr">
                <span className={styles.ipBadge}>
                  <code>{meta?.ip || "—"}</code>
                  {meta?.ip && meta.ip !== "unknown" && (
                    <button type="button" onClick={() => copyText(meta.ip!)} title={t("copyIp")}>
                      <Copy size={13} />
                    </button>
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t("clientDevice")}</dt>
              <dd dir="ltr">
                {meta?.clientDevice ? (
                  <span className={styles.deviceBadge}>
                    <Laptop size={13} />
                    {meta.clientDevice.browser} • {meta.clientDevice.os} ({meta.clientDevice.device})
                  </span>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt>{isAudit ? t("attemptedEmail") : t("user")}</dt>
              <dd dir="ltr">{meta?.attemptedEmail || log.userId || (isRtl ? "غير مسجل" : "Not recorded")}</dd>
            </div>
            <div>
              <dt>{t("branch")}</dt>
              <dd dir="ltr">{log.branchId ?? "—"}</dd>
            </div>
            <div className={styles.wideDetail}>
              <dt>Request ID / Trace</dt>
              <dd dir="ltr">
                <code>{log.requestId ?? "—"}</code>
                {log.requestId ? (
                  <button type="button" onClick={() => copyText(log.requestId!)} aria-label={t("copyTraceId")}>
                    <Copy aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </dd>
            </div>
            <div className={styles.wideDetail}>
              <dt>{t("methodAndPath")}</dt>
              <dd dir="ltr"><code>{[log.method, log.path].filter(Boolean).join(" ") || "—"}</code></dd>
            </div>
          </dl>

          <section className={styles.codeSection}>
            <h3>{isRtl ? "الحدث ورسالة النظام" : "Event & Action"}</h3>
            <pre dir="auto">{log.event}{"\n"}{log.message}</pre>
          </section>

          {log.stack ? (
            <section className={styles.codeSection}>
              <h3><Braces aria-hidden="true" size={17} />{t("stackTrace")}</h3>
              <pre dir="ltr">{log.stack}</pre>
            </section>
          ) : null}

          {meta && Object.keys(meta).length ? (
            <section className={styles.codeSection}>
              <h3><Braces aria-hidden="true" size={17} />{t("metadata")}</h3>
              <pre dir="ltr">{JSON.stringify(meta, null, 2)}</pre>
            </section>
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

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA", {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [locale],
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>("audit");
  const [scope, setScope] = useState<ScopeMode>("business");
  const [logs, setLogs] = useState<OperationalLog[]>([]);
  const [summary, setSummary] = useState<LogSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    tab: "audit",
    scope: "business",
    auditType: "all",
    level: "all",
    source: "all",
    search: "",
    category: "all",
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedLog, setSelectedLog] = useState<OperationalLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const requestVersion = useRef(0);
  const pendingRequest = useRef<AbortController | null>(null);
  const nextCursorRef = useRef<string | null>(null);

  const loadLogs = useCallback(
    async (append = false, silent = false) => {
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
        const params: Record<string, string | number> = {
          limit: isSlowMode ? 5 : 50,
          tab: filters.tab,
          scope: filters.scope,
        };
        if (filters.level !== "all") params.level = filters.level;
        if (filters.source !== "all") params.source = filters.source;
        if (filters.search) params.search = filters.search;
        if (filters.category !== "all") params.category = filters.category;
        if (filters.auditType !== "all") params.auditType = filters.auditType;
        if (append && nextCursorRef.current) params.cursor = nextCursorRef.current;

        const { data } = await apiClient.get<LogsResponse>("/admin/logs", {
          params,
          signal: controller.signal,
        });

        if (version !== requestVersion.current) return;
        setLogs((current) => (append ? [...current, ...data.items] : data.items));
        const cursor = isSlowMode ? null : data.nextCursor;
        setNextCursor(cursor);
        nextCursorRef.current = cursor;
        setSummary(data.summary.last24Hours);
        setLoadError(null);
      } catch (error) {
        if (version === requestVersion.current && !controller.signal.aborted) {
          setLoadError(getLoadError(error, isRtl));
        }
      } finally {
        if (pendingRequest.current !== controller) return;
        pendingRequest.current = null;
        if (append) setIsLoadingMore(false);
        else if (silent) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [filters, isSlowMode, isRtl],
  );

  useEffect(() => {
    const versionRef = requestVersion;
    const timer = setTimeout(() => void loadLogs(), 0);
    return () => {
      clearTimeout(timer);
      ++versionRef.current;
      pendingRequest.current?.abort();
      pendingRequest.current = null;
    };
  }, [loadLogs]);

  useEffect(() => {
    if (!isLive) return;
    const timer = window.setInterval(
      () => {
        if (document.visibilityState === "visible") void loadLogs(false, true);
      },
      isSlowMode ? 120_000 : 60_000,
    );
    return () => window.clearInterval(timer);
  }, [isLive, isSlowMode, loadLogs]);

  const handleTabChange = (newTab: ActiveTab) => {
    setActiveTab(newTab);
    setSearchDraft("");
    setFilters((current) => ({
      ...current,
      tab: newTab,
      category: "all",
      auditType: "all",
      level: "all",
      search: "",
    }));
  };

  const handleScopeChange = (newScope: ScopeMode) => {
    setScope(newScope);
    setFilters((current) => ({
      ...current,
      scope: newScope,
    }));
  };

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
    setFilters({
      tab: activeTab,
      scope,
      auditType: "all",
      level: "all",
      source: "all",
      search: "",
      category: "all",
    });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        tab: filters.tab,
        scope: filters.scope,
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.category !== "all") params.set("category", filters.category);
      if (filters.auditType !== "all") params.set("auditType", filters.auditType);

      const response = await apiClient.get(`/admin/logs/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dinehub-${filters.tab}-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {isRtl ? "مركز الرقابة والتدقيق الأمني • من المتصفح إلى قاعدة البيانات" : "DineHub Security Audit & Telemetry • Cloud to DB"}
          </p>
          <h1>{t("pageTitle")}</h1>
          <p>{t("pageDesc")}</p>
        </div>
        <div className={styles.headerControls}>
          <button
            className={styles.exportButton}
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            title={t("exportCsv")}
          >
            <Download aria-hidden="true" size={17} />
            <span>{isExporting ? (isRtl ? "جارٍ التصدير…" : "Exporting…") : t("exportCsv")}</span>
          </button>
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

      {/* Top Tab Switcher: Audit Trail vs System Telemetry */}
      <div className={styles.tabNavContainer}>
        <div className={styles.tabNav} role="tablist" aria-label="Logs Sections">
          <button
            className={styles.tabButton}
            data-tab="audit"
            data-active={activeTab === "audit"}
            type="button"
            role="tab"
            aria-selected={activeTab === "audit"}
            onClick={() => handleTabChange("audit")}
          >
            <ShieldCheck size={18} />
            <span>{t("tabAudit")}</span>
          </button>
          <button
            className={styles.tabButton}
            data-tab="system"
            data-active={activeTab === "system"}
            type="button"
            role="tab"
            aria-selected={activeTab === "system"}
            onClick={() => handleTabChange("system")}
          >
            <Server size={18} />
            <span>{t("tabSystem")}</span>
          </button>
        </div>
        <p className={styles.tabDescription}>
          {activeTab === "audit" ? t("tabAuditDesc") : t("tabSystemDesc")}
        </p>
      </div>

      {/* Scope Bar: This Business vs Worldwide Global Probes */}
      {activeTab === "audit" && (
        <div className={styles.scopeBar}>
          <div className={styles.scopeToggleGroup}>
            <span style={{ fontSize: "0.78rem", color: "#8d8093", fontWeight: 600 }}>
              {isRtl ? "نطاق المراقبة:" : "Audit Scope:"}
            </span>
            <button
              className={styles.scopeOption}
              data-scope="business"
              data-active={scope === "business"}
              type="button"
              onClick={() => handleScopeChange("business")}
            >
              <User size={15} />
              <span>{t("scopeBusiness")}</span>
            </button>
            <button
              className={styles.scopeOption}
              data-scope="global"
              data-active={scope === "global"}
              type="button"
              onClick={() => handleScopeChange("global")}
            >
              <Globe size={15} />
              <span>{t("scopeGlobal")}</span>
            </button>
          </div>
          <span className={styles.scopeNotice} data-scope={scope}>
            {scope === "global" ? (
              <>
                <ShieldAlert size={15} />
                {t("scopeGlobalNotice")}
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                {t("scopeBusinessNotice")}
              </>
            )}
          </span>
        </div>
      )}

      {/* Quick Filter Categories */}
      {activeTab === "audit" ? (
        <nav className={styles.quickFilters} aria-label={isRtl ? "تصنيف أحداث التدقيق" : "Audit Categories"}>
          {(["all", "auth", "security", "access", "data"] as const).map((type) => (
            <button
              type="button"
              key={type}
              aria-pressed={filters.auditType === type}
              onClick={() => {
                setSearchDraft("");
                setFilters((current) => ({
                  ...current,
                  auditType: type,
                  category: type === "auth" ? "auth" : type === "security" ? "auth_failures" : "all",
                  search: "",
                }));
              }}
            >
              {type === "all" ? t("auditTypeAll")
                : type === "auth" ? t("auditTypeAuth")
                : type === "security" ? (isRtl ? "فشل الدخول والتنبيهات 🚨" : "Failed Logins & Alerts 🚨")
                : type === "access" ? t("auditTypeAccess")
                : t("auditTypeData")}
            </button>
          ))}
        </nav>
      ) : (
        <nav className={styles.quickFilters} aria-label={isRtl ? "نوع الأحداث" : "Event Categories"}>
          {(["all", "auth", "auth_failures", "attention"] as const).map((category) => (
            <button
              type="button"
              key={category}
              aria-pressed={filters.category === category}
              onClick={() => {
                setSearchDraft("");
                setFilters((current) => ({
                  ...current,
                  category,
                  level: "all",
                  source: "all",
                  search: "",
                }));
              }}
            >
              {category === "all" ? t("catAll")
                : category === "auth" ? t("catAuth")
                : category === "auth_failures" ? t("catAuthFailures")
                : t("catAttention")}
            </button>
          ))}
        </nav>
      )}

      {/* KPI Summary Cards */}
      <section className={styles.summaryGrid} aria-label={isRtl ? "ملخص آخر 24 ساعة" : "Last 24 Hours Summary"}>
        {activeTab === "audit" ? (
          <>
            <article data-tone="failed-logins">
              <span><ShieldAlert aria-hidden="true" size={20} /></span>
              <small>{t("kpiFailedLogins")}</small>
              <strong>{(summary.failedLogins ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "محاولات دخول غير مصرح بها" : "Rejected credential attempts"}</p>
            </article>
            <article data-tone="success-auth">
              <span><ShieldCheck aria-hidden="true" size={20} /></span>
              <small>{t("kpiSuccessfulLogins")}</small>
              <strong>{(summary.successfulLogins ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "تسجيلات دخول معتمدة" : "Authorized team sessions"}</p>
            </article>
            <article data-tone="security">
              <span><KeyRound aria-hidden="true" size={20} /></span>
              <small>{t("kpiSecurityAlerts")}</small>
              <strong>{summary.errors.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "رفض وصول أو تجاوز حد الطلبات" : "Access denials & rate limits"}</p>
            </article>
            <article data-tone="locations">
              <span><Globe aria-hidden="true" size={20} /></span>
              <small>{t("kpiUniqueIps")}</small>
              <strong>{(summary.uniqueIps ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>
                {summary.topCountries && summary.topCountries.length > 0
                  ? summary.topCountries.map((c) => `${getCountryFlag(c.country)} ${c.country}`).join(" ")
                  : isRtl ? "مواقع الدخول المرصودة" : "Active locations detected"}
              </p>
            </article>
          </>
        ) : (
          <>
            <article data-tone="healthy">
              <span><Activity aria-hidden="true" size={20} /></span>
              <small>{t("kpiTotal")}</small>
              <strong>{summary.total.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "إجمالي الأحداث المسجلة" : "Past 24 hours traffic"}</p>
            </article>
            <article data-tone="error">
              <span><CircleAlert aria-hidden="true" size={20} /></span>
              <small>{t("kpiErrors")}</small>
              <strong>{summary.errors.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "أخطاء برمجية حرجة" : "500 server errors & faults"}</p>
            </article>
            <article data-tone="warning">
              <span><AlertTriangle aria-hidden="true" size={20} /></span>
              <small>{t("kpiWarnings")}</small>
              <strong>{summary.warnings.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "استجابات بطيئة أو تحذيرات" : "Latency / 4xx responses"}</p>
            </article>
            <article data-tone="frontend">
              <span><MonitorSmartphone aria-hidden="true" size={20} /></span>
              <small>{t("kpiFrontend")}</small>
              <strong>{summary.frontend.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
              <p>{isRtl ? "أجهزة العملاء والإدارة" : "Guest & staff client devices"}</p>
            </article>
          </>
        )}
      </section>

      {/* Main Panel: Filter Bar & Feed List */}
      <section className={styles.logPanel} aria-labelledby="system-log-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="system-log-title">
              {activeTab === "audit" ? (
                <>
                  <Shield aria-hidden="true" size={20} />
                  {isRtl ? "سجل التدقيق والرقابة" : "Audit Trail Records"}
                </>
              ) : (
                <>
                  <Server aria-hidden="true" size={20} />
                  {isRtl ? "سجل العمليات والشبكة" : "System & Network Events"}
                </>
              )}
            </h2>
            <p data-paused={!isLive}>
              <span className={styles.liveDot} aria-hidden="true" />
              {!isLive
                ? (isRtl ? "التحديث متوقف — جمع السجلات مستمر في الخلفية" : "Live stream paused — telemetry collection active in background")
                : isSlowMode
                  ? (isRtl ? "الوضع البطيء — آخر 5 أحداث كل دقيقتين" : "Slow mode — latest 5 events every 2 minutes")
                  : (isRtl ? "تحديث تلقائي هادئ كل دقيقة أثناء المراقبة" : "Auto-polling every 60 seconds")}
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
          <p className={styles.filterHint} role="alert" style={{ margin: "16px 20px 0" }}>
            {loadError} — {isRtl ? "آخر نتائج محملة ما زالت ظاهرة." : "Previously loaded results remain visible."}
          </p>
        ) : null}

        {isLoading ? (
          <div className={styles.statePanel} aria-busy="true">
            <Loader2 className={styles.spinning} aria-hidden="true" size={28} />
            <h3>{t("loading")}</h3>
            <p>{isRtl ? "نجمع أحدث سجلات التدقيق والعمليات." : "Fetching latest audit trail and server telemetry."}</p>
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
                const meta = log.metadata;
                const risk = getRiskAssessment(log, isRtl);
                const isFailedAuth = log.statusCode === 401 || log.statusCode === 429 || log.event.includes("failed");

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
                        {log.businessId === null && log.event.startsWith("auth.") && (
                          <span className={styles.globalProbeBadge}>
                            <Globe size={12} />
                            {isRtl ? "محاولة عالمية خارجية" : "External / Worldwide Probe"}
                          </span>
                        )}
                        <span className={styles.riskBadge} data-risk={risk.level}>
                          {risk.label}
                        </span>
                        <strong>{desc.title}</strong>
                      </div>

                      <p>{desc.explanation}</p>

                      {/* Forensic Origin Badges (IP, Location, Device) */}
                      <div className={styles.forensicOrigin}>
                        {meta?.country && (
                          <span className={styles.countryBadge}>
                            <MapPin size={12} />
                            <span>{getCountryFlag(meta.country)}</span>
                            <span>{meta.country}</span>
                            {meta.city ? ` (${meta.city})` : ""}
                          </span>
                        )}

                        {meta?.ip && meta.ip !== "unknown" && (
                          <span className={styles.ipBadge}>
                            <code>{meta.ip}</code>
                            <button
                              type="button"
                              onClick={() => copyText(meta.ip!)}
                              title={t("copyIp")}
                            >
                              <Copy size={12} />
                            </button>
                          </span>
                        )}

                        {meta?.clientDevice && meta.clientDevice.browser !== "Unknown" && (
                          <span className={styles.deviceBadge}>
                            <Laptop size={12} />
                            <span>{meta.clientDevice.browser} • {meta.clientDevice.os}</span>
                          </span>
                        )}
                      </div>

                      <div className={styles.logMeta}>
                        {log.method || log.path ? (
                          <code dir="ltr">{[log.method, log.path].filter(Boolean).join(" ")}</code>
                        ) : null}
                        {log.statusCode ? (
                          <span dir="ltr" style={{ color: isFailedAuth ? "#ff9d8c" : undefined }}>
                            HTTP {log.statusCode}
                          </span>
                        ) : null}
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
                        {isRtl ? "تفاصيل استقصائية" : "Forensics"}
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
                  ? (isRtl ? "الوضع البطيء يعرض آخر 5 أحداث فقط." : "Slow mode displays only the latest 5 events.")
                  : (isRtl ? "وصلت إلى نهاية السجلات المتاحة." : "End of available audit events reached.")}
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

      {/* Forensic Dossier / Log Details Modal */}
      <LogDetailsModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        isRtl={isRtl}
        dateFormatter={dateFormatter}
        t={t}
      />
    </div>
  );
}
