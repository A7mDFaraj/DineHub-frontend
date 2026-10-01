"use client";

import * as Dialog from "@radix-ui/react-dialog";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  Filter,
  Gauge,
  Globe,
  KeyRound,
  Laptop,
  Loader2,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  Server,
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
type ScopeMode = "business" | "global";
type FilterCategory = "all" | "auth" | "auth_failures" | "access" | "data" | "system";

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
  errorCode?: string;
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
  category: FilterCategory;
  scope: ScopeMode;
  level: FilterValue<LogLevel>;
  source: FilterValue<LogSource>;
  search: string;
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

/**
 * Resolves standard country names and prevents the Windows emoji double-letter glitch (e.g. YE YE).
 * Uses native Intl.DisplayNames without external dependencies.
 */
function formatLocation(
  country?: string,
  city?: string,
  locale = "en",
): { label: string; code: string; isLocal: boolean } {
  if (!country || country === "UNKNOWN") {
    return { label: locale === "ar" ? "موقع غير محدد" : "Unknown Origin", code: "—", isLocal: false };
  }
  if (country === "LOCAL") {
    return { label: locale === "ar" ? "شبكة محلية" : "Local Network", code: "LAN", isLocal: true };
  }
  const cleanCode = country.toUpperCase().trim();
  try {
    const displayNames = new Intl.DisplayNames([locale === "ar" ? "ar-SA" : "en-US"], { type: "region" });
    const name = displayNames.of(cleanCode) || cleanCode;
    const cleanCity = city && city !== "Unknown" && city.trim() ? ` • ${city.trim()}` : "";
    return {
      label: `${name} (${cleanCode})${cleanCity}`,
      code: cleanCode,
      isLocal: false,
    };
  } catch {
    const cleanCity = city && city !== "Unknown" && city.trim() ? ` • ${city.trim()}` : "";
    return {
      label: `${cleanCode}${cleanCity}`,
      code: cleanCode,
      isLocal: false,
    };
  }
}

function formatRelativeTime(dateString: string, isRtl: boolean): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return isRtl ? "الآن" : "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isRtl ? `منذ ${diffMin} د` : `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isRtl ? `منذ ${diffHours} س` : `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return isRtl ? `منذ ${diffDays} ي` : `${diffDays}d ago`;
}

function describeLog(log: OperationalLog, isRtl: boolean): { title: string; explanation: string } {
  const meta = log.metadata;
  const isExplicitFailure =
    log.event.includes("failed") ||
    log.event.includes("rejected") ||
    log.event.includes("denied") ||
    log.event.includes("blocked") ||
    (log.statusCode !== null && log.statusCode >= 400) ||
    log.level === "warn" ||
    log.level === "error";

  if (log.event.startsWith("auth.sign_in") || log.event.startsWith("auth.sign-in")) {
    const isSuccess =
      !isExplicitFailure &&
      log.event === "auth.sign_in_succeeded" &&
      (log.statusCode === 200 || log.statusCode === null);

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
    const errorCode = meta?.errorCode;

    if (reason === "wrong_password") {
      return {
        title: isRtl ? `فشل الدخول — كلمة المرور غير صحيحة (${email})` : `Sign In Failed — Wrong Password (${email})`,
        explanation: isRtl
          ? "الحساب مسجل، لكن كلمة المرور المدخلة غير صحيحة."
          : "Account exists, but the password provided was incorrect.",
      };
    }

    if (reason === "password_account_unavailable") {
      return {
        title: isRtl ? `فشل الدخول — الحساب غير موجود (${email})` : `Sign In Failed — Account Not Found (${email})`,
        explanation: isRtl
          ? "لا يوجد حساب مسجل بهذا البريد. محاولة عشوائية أو فحص خارجي."
          : "No account found matching this address. External probe or typo.",
      };
    }

    if (errorCode === "INVALID_EMAIL_OR_PASSWORD" || reason === "invalid_credentials") {
      return {
        title: isRtl ? `فشل الدخول — بيانات الاعتماد غير صحيحة (${email})` : `Sign In Failed — Invalid Credentials (${email})`,
        explanation: isRtl
          ? "بيانات الدخول غير متطابقة (البريد الإلكتروني أو كلمة المرور غير صحيحة)."
          : "Credentials do not match (invalid email address or incorrect password).",
      };
    }

    if (reason === "invalid_credentials_format") {
      return {
        title: isRtl ? `فشل الدخول — صيغة غير صالحة (${email})` : `Sign In Failed — Invalid Format (${email})`,
        explanation: isRtl
          ? "المدخلات غير مطابقة لصيغة البريد المعتمدة."
          : "Input does not match standard email format.",
      };
    }

    if (reason === "rate_limited" || log.statusCode === 429) {
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
        ? "رُفضت بيانات الدخول بواسطة نظام المصادقة، ولم يتم إنشاء أي جلسة."
        : "Credentials rejected by authentication service. No session was issued.",
    };
  }

  if (log.event.startsWith("auth.probe")) {
    const email = meta?.attemptedEmail || log.userId || "—";
    return {
      title: isRtl ? `فحص مسار مصادقة خارجي (${email})` : `External Auth Endpoint Probe (${email})`,
      explanation: isRtl
        ? "محاولة وصول خارجية أو استكشاف أمني لمسارات المصادقة."
        : "External security probe targeting authentication endpoints.",
    };
  }

  if (log.event === "auth.sign_out") {
    return {
      title: isRtl ? "تسجيل خروج من الحساب" : "User Signed Out",
      explanation: isRtl
        ? "تم إنهاء الجلسة ومسح ملفات تعريف الارتباط بنجاح."
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

  if (log.event.startsWith("branch.") || log.event.startsWith("menu.") || log.event.startsWith("category.")) {
    return {
      title: isRtl ? "تعديل بيانات النشاط" : "Business Data Updated",
      explanation: log.message,
    };
  }

  if (log.message.includes("Module build failed") || log.message.includes("Syntax Error")) {
    return {
      title: isRtl ? "خطأ في بناء الحزمة (تطوير محلي)" : "Module Build / Syntax Error (Local Dev)",
      explanation: isRtl
        ? "حدث خطأ مؤقت أثناء تجميع كود الصفحة في بيئة التطوير أثناء التعديل (تم حله)."
        : "Temporary compilation error captured by dev server hot-reload during code editing (resolved).",
    };
  }

  if (log.event === "window.error" || log.event === "resource.error" || log.event === "promise.unhandled_rejection") {
    return {
      title: isRtl ? "استثناء برمجي في واجهة المستخدم" : "Browser Runtime Exception",
      explanation: log.message,
    };
  }

  if ((log.statusCode ?? 0) >= 500) {
    return {
      title: isRtl ? "خطأ في الخادم (500)" : "Server Error (500)",
      explanation: isRtl
        ? "تعذر إكمال الطلب. تفقد شاشة المعاينة لعرض تتبع الخطأ."
        : "Request failed with internal server error. Inspect stack trace.",
    };
  }

  if (log.statusCode === 401) {
    return {
      title: isRtl ? "جلسة غير صالحة أو منتهية (401)" : "Unauthorized Request (401)",
      explanation: isRtl
        ? "الطلب يتطلب تسجيل دخول نشط. طبيعي بعد انتهاء الجلسة."
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
      title: isRtl ? "المسار غير موجود (404)" : "Resource Not Found (404)",
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
    title: isExplicitFailure
      ? isRtl ? "طلب غير مكتمل" : "Incomplete Request"
      : isRtl ? "عملية مكتملة" : "Completed Operation",
    explanation: log.message,
  };
}

function getLogStatusDescriptor(
  log: OperationalLog,
  isRtl: boolean,
): {
  type: "failed" | "success" | "security" | "system";
  badgeText: string;
} {
  const isExplicitFailure =
    log.event.includes("failed") ||
    log.event.includes("rejected") ||
    log.event.includes("denied") ||
    log.event.includes("blocked") ||
    (log.statusCode !== null && log.statusCode >= 400) ||
    log.level === "warn" ||
    log.level === "error";

  if (log.event.startsWith("auth.sign_in") || log.event.startsWith("auth.sign-in")) {
    if (log.event === "auth.sign_in_succeeded" && !isExplicitFailure) {
      return {
        type: "success",
        badgeText: isRtl ? "دخول معتمد" : "Authenticated",
      };
    }
    return {
      type: "failed",
      badgeText: isRtl ? "محاولة فاشلة" : "Failed Attempt",
    };
  }

  if (log.statusCode === 429) {
    return {
      type: "security",
      badgeText: isRtl ? "حظر معدل" : "Rate Limited",
    };
  }

  if (log.event.startsWith("security.") || log.statusCode === 403) {
    return {
      type: "security",
      badgeText: isRtl ? "حظر أمني" : "Security Block",
    };
  }

  if (log.event.startsWith("access.")) {
    return {
      type: "system",
      badgeText: isRtl ? "إدارة صلاحيات" : "Access Audit",
    };
  }

  if (log.level === "error" || (log.statusCode !== null && log.statusCode >= 500)) {
    return {
      type: "failed",
      badgeText: isRtl ? "خطأ نظام" : "System Error",
    };
  }

  if (log.level === "warn" || (log.statusCode !== null && log.statusCode >= 400)) {
    return {
      type: "security",
      badgeText: isRtl ? "تنبيه تشغيلي" : "Notice",
    };
  }

  return {
    type: "system",
    badgeText: isRtl ? "عملية قياسية" : "Operational",
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

function LogDetailsModal({
  log,
  onClose,
  isRtl,
  dateFormatter,
  t,
  locale,
  copiedKey,
  onCopy,
}: {
  log: OperationalLog | null;
  onClose: () => void;
  isRtl: boolean;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: string) => string;
  locale: string;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  if (!log) return null;
  const meta = log.metadata;
  const desc = describeLog(log, isRtl);
  const status = getLogStatusDescriptor(log, isRtl);
  const isAudit =
    log.event.startsWith("auth.") ||
    log.event.startsWith("access.") ||
    log.event.startsWith("security.") ||
    Boolean(meta?.auditType && meta.auditType !== "system");
  const location = formatLocation(meta?.country, meta?.city, locale);

  return (
    <Dialog.Root open={Boolean(log)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.dialogOverlay} />
        <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"} aria-describedby="log-detail-description">
          <div className={styles.dialogHeader}>
            <div>
              <p>
                <span className={styles.statusBadge} data-type={status.type}>
                  {status.badgeText}
                </span>
                {meta?.country && (
                  <span className={styles.countryBadge}>
                    <MapPin size={12} />
                    <span>{location.label}</span>
                  </span>
                )}
                {log.businessId === null && (log.event.startsWith("auth.") || log.event.startsWith("security.")) && (
                  <span className={styles.worldwideBadge}>
                    <Globe size={12} />
                    {t("worldwideProbe")}
                  </span>
                )}
                {log.source === "frontend" && (
                  <span className={styles.deviceBadge}>
                    <Laptop size={12} />
                    {isRtl ? "واجهة العميل" : "Frontend"}
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
                    <button
                      type="button"
                      onClick={() => onCopy(`modal-ip-${log.id}`, meta.ip!)}
                      title={t("copyIp")}
                    >
                      {copiedKey === `modal-ip-${log.id}` ? (
                        <Check size={13} style={{ color: "#6ee7b7" }} />
                      ) : (
                        <Copy size={13} />
                      )}
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
                  <button
                    type="button"
                    onClick={() => onCopy(`modal-req-${log.id}`, log.requestId!)}
                    aria-label={t("copyTraceId")}
                  >
                    {copiedKey === `modal-req-${log.id}` ? (
                      <Check size={14} style={{ color: "#6ee7b7" }} />
                    ) : (
                      <Copy size={14} />
                    )}
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

  const [logs, setLogs] = useState<OperationalLog[]>([]);
  const [summary, setSummary] = useState<LogSummary>(EMPTY_SUMMARY);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filters, setFilters] = useState<LogFilters>({
    category: "all",
    scope: "global",
    level: "all",
    source: "all",
    search: "",
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [selectedLog, setSelectedLog] = useState<OperationalLog | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  const handleCopy = useCallback((key: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  }, []);

  const filterByTerm = useCallback((term: string) => {
    setSearchDraft(term);
    setFilters((current) => ({ ...current, search: term }));
  }, []);

  const toggleRowExpand = useCallback((id: string) => {
    setExpandedRowId((curr) => (curr === id ? null : id));
  }, []);

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
          scope: filters.scope,
        };

        // Unified Category Mapping to Backend
        if (filters.category === "all") {
          params.tab = "all";
        } else if (filters.category === "auth") {
          params.tab = "all";
          params.category = "auth";
          params.auditType = "auth";
        } else if (filters.category === "auth_failures") {
          params.tab = "all";
          params.category = "auth_failures";
          params.auditType = "security";
        } else if (filters.category === "access") {
          params.tab = "all";
          params.auditType = "access";
        } else if (filters.category === "data") {
          params.tab = "all";
          params.auditType = "data";
        } else if (filters.category === "system") {
          params.tab = "system";
        }

        if (filters.level !== "all") params.level = filters.level;
        if (filters.source !== "all") params.source = filters.source;
        if (filters.search) params.search = filters.search;
        if (append && nextCursorRef.current) params.cursor = nextCursorRef.current;

        const { data } = await apiClient.get<LogsResponse>("/admin/logs", {
          params,
          signal: controller.signal,
        });

        if (version !== requestVersion.current) return;

        // Deduplicate logs in the client feed to ensure pristine presentation
        setLogs((current) => {
          const rawItems = append ? [...current, ...data.items] : data.items;

          // Track backend auth attempt timestamps and emails
          const backendAuthTimestamps = new Map<string, number>();
          for (const item of rawItems) {
            if (item.source === "backend" && item.event.startsWith("auth.sign_in")) {
              const email = item.metadata?.attemptedEmail || item.userId || "";
              if (email) {
                backendAuthTimestamps.set(email, new Date(item.createdAt).getTime());
              }
            }
          }

          const seen = new Set<string>();
          return rawItems.filter((item) => {
            // Suppress redundant client-side shadow logs if authoritative backend log exists for same target
            if (item.source === "frontend" && item.event.startsWith("auth.sign_in")) {
              const email = item.metadata?.attemptedEmail || item.userId || "";
              const backendTime = backendAuthTimestamps.get(email);
              if (backendTime && Math.abs(new Date(item.createdAt).getTime() - backendTime) < 15_000) {
                return false;
              }
            }

            const key = item.requestId
              ? `${item.requestId}-${item.event}`
              : `${item.event}-${item.metadata?.attemptedEmail || item.metadata?.ip || ""}-${item.createdAt.slice(0, 19)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });

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

  const handleCategoryChange = (category: FilterCategory) => {
    setSearchDraft("");
    setFilters((current) => ({
      ...current,
      category,
      search: "",
    }));
  };

  const handleScopeChange = (scope: ScopeMode) => {
    setFilters((current) => ({
      ...current,
      scope,
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
      category: "all",
      scope: "global",
      level: "all",
      source: "all",
      search: "",
    });
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = new URLSearchParams({
        tab: filters.category === "system" ? "system" : "all",
        scope: filters.scope,
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.category === "auth_failures") params.set("category", "auth_failures");
      else if (filters.category === "auth") params.set("category", "auth");
      else if (filters.category === "access") params.set("auditType", "access");
      else if (filters.category === "data") params.set("auditType", "data");

      const response = await apiClient.get(`/admin/logs/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `dinehub-system-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const authAttemptsCount = (summary.successfulLogins ?? 0) + (summary.failedLogins ?? 0);
  const systemErrorsCount = summary.errors + summary.warnings;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
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

      {/* KPI Executive Summary Grid */}
      <section className={styles.summaryGrid} aria-label={isRtl ? "ملخص الرقابة لآخر 24 ساعة" : "24-Hour Executive Summary"}>
        <article data-tone="failed-logins">
          <span><ShieldAlert aria-hidden="true" size={20} /></span>
          <small>{t("kpiFailedLogins")}</small>
          <strong>{(summary.failedLogins ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "محاولات دخول غير مصرح بها أو فحص خارجي" : "Rejected credential attempts & external probes"}</p>
        </article>
        <article data-tone="success-auth">
          <span><ShieldCheck aria-hidden="true" size={20} /></span>
          <small>{t("kpiSuccessfulLogins")}</small>
          <strong>{(summary.successfulLogins ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "تسجيلات دخول معتمدة لفريق العمل" : "Verified team and admin sessions"}</p>
        </article>
        <article data-tone="security">
          <span><AlertTriangle aria-hidden="true" size={20} /></span>
          <small>{t("kpiSecurityAlerts")}</small>
          <strong>{systemErrorsCount.toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>{isRtl ? "تنبيهات أمنية وتجاوز حد الطلبات وأخطاء الخادم" : "Rate limits, 403 blocks & server alerts"}</p>
        </article>
        <article data-tone="locations">
          <span><Globe aria-hidden="true" size={20} /></span>
          <small>{t("kpiUniqueIps")}</small>
          <strong>{(summary.uniqueIps ?? 0).toLocaleString(locale === "en" ? "en-US" : "ar-SA")}</strong>
          <p>
            {summary.topCountries && summary.topCountries.length > 0
              ? summary.topCountries
                  .map((c) => `${formatLocation(c.country, undefined, locale).label} (${c.count})`)
                  .join(" • ")
              : isRtl ? "مواقع الدخول المرصودة" : "Detected client origins"}
          </p>
        </article>
      </section>

      {/* Main Single-View Dashboard Panel */}
      <section className={styles.logPanel} aria-labelledby="system-log-title">
        {/* Unified Control Toolbar: Categories with Live Counts + Scope Selector */}
        <div className={styles.controlToolbar}>
          <nav className={styles.categoryNav} aria-label={isRtl ? "تصنيف السجلات" : "Log Categories"}>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "all"}
              onClick={() => handleCategoryChange("all")}
            >
              <Activity size={15} />
              <span>{t("filterAll")}</span>
              {summary.total > 0 && <span className={styles.pillCount}>{summary.total}</span>}
            </button>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "auth"}
              onClick={() => handleCategoryChange("auth")}
            >
              <ShieldCheck size={15} />
              <span>{t("filterAuth")}</span>
              {authAttemptsCount > 0 && <span className={styles.pillCount}>{authAttemptsCount}</span>}
            </button>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "auth_failures"}
              data-warning="true"
              onClick={() => handleCategoryChange("auth_failures")}
            >
              <ShieldAlert size={15} />
              <span>{t("filterFailures")}</span>
              {(summary.failedLogins ?? 0) > 0 && (
                <span className={styles.pillCount} data-alert="true">
                  {summary.failedLogins}
                </span>
              )}
            </button>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "access"}
              onClick={() => handleCategoryChange("access")}
            >
              <KeyRound size={15} />
              <span>{t("filterAccess")}</span>
            </button>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "data"}
              onClick={() => handleCategoryChange("data")}
            >
              <Server size={15} />
              <span>{t("filterData")}</span>
            </button>
            <button
              type="button"
              className={styles.categoryPill}
              aria-pressed={filters.category === "system"}
              onClick={() => handleCategoryChange("system")}
            >
              <Activity size={15} />
              <span>{t("filterSystem")}</span>
              {systemErrorsCount > 0 && <span className={styles.pillCount}>{systemErrorsCount}</span>}
            </button>
          </nav>

          {/* Integrated Scope Toggle Pill */}
          <div className={styles.scopeToggle} role="group" aria-label={isRtl ? "نطاق المراقبة" : "Audit Scope"}>
            <button
              type="button"
              className={styles.scopeButton}
              data-active={filters.scope === "global"}
              onClick={() => handleScopeChange("global")}
              title={t("scopeGlobalNotice")}
            >
              <Globe size={14} />
              <span>{t("scopeGlobal")}</span>
            </button>
            <button
              type="button"
              className={styles.scopeButton}
              data-active={filters.scope === "business"}
              onClick={() => handleScopeChange("business")}
              title={t("scopeBusinessNotice")}
            >
              <User size={14} />
              <span>{t("scopeBusiness")}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Full-Width Search & Filter Bar */}
        <div className={styles.panelHeader}>
          <form className={styles.searchForm} onSubmit={submitSearch} role="search">
            <div className={styles.searchField}>
              <Search aria-hidden="true" size={17} />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder={t("searchPlaceholder")}
                dir="auto"
              />
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    setFilters((curr) => ({ ...curr, search: "" }));
                  }}
                  aria-label={isRtl ? "مسح البحث" : "Clear search"}
                >
                  <X aria-hidden="true" size={15} />
                </button>
              ) : null}
            </div>

            <div className={styles.filterDropdowns}>
              <label className={styles.selectField}>
                <span className={styles.srOnly}>{t("filterLevel")}</span>
                <select
                  value={filters.level}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      level: event.target.value as FilterValue<LogLevel>,
                    }))
                  }
                >
                  <option value="all">{t("allLevels")}</option>
                  <option value="error">{t("levels.error")}</option>
                  <option value="warn">{t("levels.warn")}</option>
                  <option value="info">{t("levels.info")}</option>
                </select>
                <ChevronDown aria-hidden="true" size={15} />
              </label>

              <label className={styles.selectField}>
                <span className={styles.srOnly}>{t("filterSource")}</span>
                <select
                  value={filters.source}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      source: event.target.value as FilterValue<LogSource>,
                    }))
                  }
                >
                  <option value="all">{t("allSources")}</option>
                  <option value="backend">{t("sources.backend")}</option>
                  <option value="frontend">{t("sources.frontend")}</option>
                </select>
                <ChevronDown aria-hidden="true" size={15} />
              </label>

              <button className={styles.searchButton} type="submit">
                <span>{isRtl ? "بحث" : "Search"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Status & Background Feed Indicator */}
        <div className={styles.feedStatusNotice}>
          <span className={styles.liveDot} data-paused={!isLive} aria-hidden="true" />
          <p>
            {!isLive
              ? (isRtl ? "التحديث التلقائي متوقف — التسجيل مستمر في الخلفية" : "Live stream paused — background recording active")
              : isSlowMode
                ? (isRtl ? "الوضع البطيء — استعلام خفيف كل دقيقتين" : "Slow mode — low-overhead poll every 2 minutes")
                : (isRtl ? "مراقبة نشطة — تحديث تلقائي كل 60 ثانية" : "Active monitoring — polling every 60 seconds")}
          </p>
        </div>

        {filters.search && (
          <div className={styles.activeFilterNotice}>
            <Filter size={13} />
            <span>
              {isRtl ? "تصفية السجلات حسب:" : "Filtered by:"} <strong>{filters.search}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchDraft("");
                setFilters((curr) => ({ ...curr, search: "" }));
              }}
            >
              {isRtl ? "إلغاء التصفية" : "Clear filter"}
            </button>
          </div>
        )}

        {loadError && logs.length > 0 ? (
          <p className={styles.filterHint} role="alert" style={{ margin: "14px 20px 0" }}>
            {loadError} — {isRtl ? "البيانات المعروضة مسبقاً لا تزال متاحة." : "Previously fetched events remain available."}
          </p>
        ) : null}

        {isLoading ? (
          <div className={styles.statePanel} aria-busy="true">
            <Loader2 className={styles.spinning} aria-hidden="true" size={28} />
            <h3>{t("loading")}</h3>
            <p>{isRtl ? "نجمع أحدث سجلات التدقيق والعمليات التشغيلية." : "Fetching unified audit trail and operational telemetry."}</p>
          </div>
        ) : loadError && !logs.length ? (
          <div className={styles.statePanel} role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <h3>{isRtl ? "تعذّر فتح السجل" : "Failed to load audit feed"}</h3>
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
                const status = getLogStatusDescriptor(log, isRtl);
                const isFailed = status.type === "failed";
                const isSecurity = status.type === "security";
                const location = formatLocation(meta?.country, meta?.city, locale);
                const isExpanded = expandedRowId === log.id;

                return (
                  <article
                    className={styles.logRow}
                    key={log.id}
                    data-status={status.type}
                    data-expanded={isExpanded}
                  >
                    {/* Status Leading Icon */}
                    <button
                      type="button"
                      className={styles.statusSignal}
                      data-status={status.type}
                      onClick={() => toggleRowExpand(log.id)}
                      title={isRtl ? "عرض / إخفاء التفاصيل السريعة" : "Toggle quick details"}
                      aria-expanded={isExpanded}
                    >
                      {isFailed ? (
                        <ShieldAlert size={18} />
                      ) : isSecurity ? (
                        <AlertTriangle size={18} />
                      ) : status.type === "success" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <Activity size={18} />
                      )}
                    </button>

                    <div className={styles.logBody}>
                      {/* Row Header: Single Status Badge + Worldwide Scope + Title */}
                      <div className={styles.rowHeader}>
                        <span className={styles.statusBadge} data-type={status.type}>
                          {status.badgeText}
                        </span>

                        {log.businessId === null && (log.event.startsWith("auth.") || log.event.startsWith("security.")) && (
                          <span className={styles.worldwideBadge}>
                            <Globe size={12} />
                            {t("worldwideProbe")}
                          </span>
                        )}

                        {log.source === "frontend" && (
                          <span className={styles.deviceBadge}>
                            <Laptop size={12} />
                            {isRtl ? "واجهة العميل" : "Frontend"}
                          </span>
                        )}

                        <strong
                          className={styles.logTitleText}
                          onClick={() => toggleRowExpand(log.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleRowExpand(log.id); }}
                        >
                          {desc.title}
                        </strong>
                      </div>

                      {/* Explanation */}
                      <p className={styles.logExplanation}>{desc.explanation}</p>

                      {/* Forensic Origin Bar with Clickable Filter Badges */}
                      <div className={styles.forensicOrigin}>
                        {meta?.attemptedEmail && (
                          <button
                            type="button"
                            className={styles.interactiveIdentityBadge}
                            onClick={() => filterByTerm(meta.attemptedEmail!)}
                            title={isRtl ? `تصفية السجلات حسب ${meta.attemptedEmail}` : `Filter logs for ${meta.attemptedEmail}`}
                          >
                            <User size={12} />
                            <code>{meta.attemptedEmail}</code>
                          </button>
                        )}

                        {meta?.country && (
                          <span className={styles.countryBadge}>
                            <MapPin size={12} />
                            <span>{location.label}</span>
                          </span>
                        )}

                        {meta?.ip && meta.ip !== "unknown" && (
                          <span className={styles.ipBadge}>
                            <button
                              type="button"
                              className={styles.ipTextButton}
                              onClick={() => filterByTerm(meta.ip!)}
                              title={isRtl ? `تصفية حسب هذا العنوان: ${meta.ip}` : `Filter by this IP: ${meta.ip}`}
                            >
                              <code>{meta.ip}</code>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(`ip-${log.id}`, meta.ip!)}
                              title={t("copyIp")}
                              aria-label={t("copyIp")}
                            >
                              {copiedKey === `ip-${log.id}` ? (
                                <Check size={12} style={{ color: "#6ee7b7" }} />
                              ) : (
                                <Copy size={12} />
                              )}
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

                      {/* Technical Trace Line */}
                      <div className={styles.logMeta}>
                        {log.method || log.path ? (
                          <code dir="ltr">{[log.method, log.path].filter(Boolean).join(" ")}</code>
                        ) : null}
                        {log.statusCode ? (
                          <span dir="ltr" data-error={log.statusCode >= 400}>
                            HTTP {log.statusCode}
                          </span>
                        ) : null}
                        {log.durationMs !== null ? (
                          <span dir="ltr">
                            <Clock3 aria-hidden="true" size={12} />
                            {log.durationMs} ms
                          </span>
                        ) : null}
                        {log.requestId ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(`req-${log.id}`, log.requestId!)}
                            title={t("copyTraceId")}
                            dir="ltr"
                          >
                            {copiedKey === `req-${log.id}` ? (
                              <Check size={12} style={{ color: "#6ee7b7" }} />
                            ) : (
                              <Copy aria-hidden="true" size={12} />
                            )}
                            {log.requestId.slice(0, 12)}…
                          </button>
                        ) : null}
                      </div>

                      {/* Smooth Inline Accordion Quick-Inspection Tray */}
                      {isExpanded && (
                        <div className={styles.inlineAccordion}>
                          <div className={styles.accordionHeader}>
                            <span>{isRtl ? "معاينة فنية سريعة" : "Quick Diagnostic Snapshot"}</span>
                            <div className={styles.accordionActions}>
                              {meta?.ip && meta.ip !== "unknown" && (
                                <button
                                  type="button"
                                  onClick={() => filterByTerm(meta.ip!)}
                                  className={styles.accordionActionBtn}
                                >
                                  <Filter size={12} />
                                  <span>{isRtl ? "حصر كل أحداث هذا الـ IP" : "Filter by this IP"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className={styles.accordionActionBtnPrimary}
                              >
                                {isRtl ? "فتح الملف الجنائي الكامل" : "Open Full Dossier"}
                              </button>
                            </div>
                          </div>
                          <pre className={styles.accordionCode} dir="auto">
                            {log.event}{"\n"}{log.message}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Right-aligned Time & Forensics Action */}
                    <div className={styles.logActionCol}>
                      <time
                        dateTime={log.createdAt}
                        title={dateFormatter.format(new Date(log.createdAt))}
                        className={styles.relativeTime}
                      >
                        {formatRelativeTime(log.createdAt, isRtl)}
                      </time>
                      <button
                        type="button"
                        className={styles.inspectButton}
                        onClick={() => setSelectedLog(log)}
                      >
                        {t("inspect")}
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
                  : (isRtl ? "وصلت إلى نهاية السجلات المتاحة." : "End of available events reached.")}
              </p>
            )}
          </>
        ) : (
          <div className={styles.statePanel}>
            <Activity aria-hidden="true" size={30} />
            <h3>{t("emptyTitle")}</h3>
            <p>{t("emptyDesc")}</p>
            <button type="button" onClick={clearFilters}>
              {isRtl ? "إعادة ضبط التصفية" : "Reset Filters"}
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
        locale={locale}
        copiedKey={copiedKey}
        onCopy={handleCopy}
      />
    </div>
  );
}
