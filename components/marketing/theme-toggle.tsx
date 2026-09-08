"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import styles from "./theme-toggle.module.css";

type LandingTheme = "light" | "dark";

type ThemeToggleProps = {
  darkLabel: string;
  lightLabel: string;
  mobile?: boolean;
};

const STORAGE_KEY = "dinehub-landing-theme";
const THEME_EVENT = "dinehub-landing-theme-change";

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

function getThemeSnapshot(): LandingTheme {
  return document.documentElement.dataset.landingTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme: LandingTheme) {
  if (theme === "dark") {
    document.documentElement.dataset.landingTheme = "dark";
  } else {
    delete document.documentElement.dataset.landingTheme;
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#080c12" : "#f7f3ed");

  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The visual preference still works when storage is unavailable.
  }
}

export function ThemeToggle({ darkLabel, lightLabel, mobile = false }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? darkLabel : lightLabel;

  const toggleTheme = () => {
    applyTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<LandingTheme>(THEME_EVENT, { detail: nextTheme }));
  };

  return (
    <button
      type="button"
      className={`${styles.toggle}${mobile ? ` ${styles.mobile}` : ""}`}
      data-theme={theme}
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
    >
      <span className={styles.iconWrap} aria-hidden="true">
        <Sun className={`${styles.icon} ${styles.sun}`} strokeWidth={1.8} />
        <Moon className={`${styles.icon} ${styles.moon}`} strokeWidth={1.8} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
