"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import styles from "./admin-language-switcher.module.css";

interface AdminLanguageSwitcherProps {
  className?: string;
  variant?: "dark" | "light" | "adaptive";
  mode?: "button" | "sidebar";
}

function setLocaleCookie(newLocale: string) {
  if (typeof document !== "undefined") {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

export function AdminLanguageSwitcher({
  className,
  variant = "dark",
  mode = "button",
}: AdminLanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const isRtl = locale === "ar";
  const targetLocale = isRtl ? "en" : "ar";
  const currentLabel = isRtl ? "اللغة" : "Language";
  const ariaLabel = isRtl ? "Switch to English" : "التبديل إلى العربية";

  if (mode === "sidebar") {
    return (
      <div className={cn(styles.sidebarBtn, className)}>
        <Link
          href={pathname}
          locale={targetLocale}
          onClick={() => setLocaleCookie(targetLocale)}
          className={styles.sidebarBtnLead}
          aria-label={ariaLabel}
          title={ariaLabel}
        >
          <Languages size={17} strokeWidth={1.8} className={styles.langIcon} aria-hidden="true" />
          <span className={styles.sidebarBtnLabel}>{currentLabel}</span>
        </Link>

        <div className={styles.switcherTrack} role="group" aria-label="Language Switcher">
          <Link
            href={pathname}
            locale="ar"
            onClick={() => setLocaleCookie("ar")}
            className={cn(
              styles.switcherOption,
              locale === "ar" ? styles.switcherActive : styles.switcherInactive
            )}
            aria-current={locale === "ar" ? "true" : undefined}
            aria-label="العربية"
          >
            AR
          </Link>
          <span className={styles.switcherDivider} aria-hidden="true" />
          <Link
            href={pathname}
            locale="en"
            onClick={() => setLocaleCookie("en")}
            className={cn(
              styles.switcherOption,
              locale === "en" ? styles.switcherActive : styles.switcherInactive
            )}
            aria-current={locale === "en" ? "true" : undefined}
            aria-label="English"
          >
            EN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        styles.compactContainer,
        variant === "light"
          ? styles.lightContainer
          : variant === "adaptive"
            ? `${styles.lightContainer} ${styles.adaptiveContainer}`
            : styles.darkContainer,
        className
      )}
    >
      <Link
        href={pathname}
        locale={targetLocale}
        onClick={() => setLocaleCookie(targetLocale)}
        className={styles.compactLead}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Languages size={15} strokeWidth={1.8} className={styles.langIcon} aria-hidden="true" />
      </Link>

      <div className={styles.switcherTrack} role="group" aria-label="Language Switcher">
        <Link
          href={pathname}
          locale="ar"
          onClick={() => setLocaleCookie("ar")}
          className={cn(
            styles.switcherOption,
            locale === "ar" ? styles.switcherActive : styles.switcherInactive
          )}
          aria-current={locale === "ar" ? "true" : undefined}
          aria-label="العربية"
        >
          AR
        </Link>
        <span className={styles.switcherDivider} aria-hidden="true" />
        <Link
          href={pathname}
          locale="en"
          onClick={() => setLocaleCookie("en")}
          className={cn(
            styles.switcherOption,
            locale === "en" ? styles.switcherActive : styles.switcherInactive
          )}
          aria-current={locale === "en" ? "true" : undefined}
          aria-label="English"
        >
          EN
        </Link>
      </div>
    </div>
  );
}
