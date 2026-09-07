"use client";

import { ChevronDown } from "lucide-react";
import styles from "./users.module.css";

export interface GlassSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface GlassSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: GlassSelectOption[];
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function GlassSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  disabled = false,
  invalid = false,
}: GlassSelectProps) {
  return (
    <div
      className={[
        styles.selectWrapper,
        disabled && styles.selectDisabled,
        invalid && styles.selectInvalid,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <select
        className={styles.nativeSelect}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.selectIcon} aria-hidden="true">
        <ChevronDown size={16} strokeWidth={2} />
      </span>
    </div>
  );
}
