"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./users.module.css";

const EMPTY_VALUE = "__dinehub_empty_value__";

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

function toRadixValue(value: string) {
  return value || EMPTY_VALUE;
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
    <Select.Root
      dir="rtl"
      value={toRadixValue(value)}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? "" : nextValue)}
      disabled={disabled}
    >
      <Select.Trigger
        className={[styles.selectTrigger, className].filter(Boolean).join(" ")}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
      >
        <Select.Value />
        <Select.Icon className={styles.selectIcon}>
          <ChevronDown aria-hidden="true" size={17} strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={styles.selectContent}
          position="popper"
          sideOffset={7}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className={styles.selectScrollButton}>
            <ChevronUp aria-hidden="true" size={16} />
          </Select.ScrollUpButton>
          <Select.Viewport className={styles.selectViewport}>
            {options.map((option) => (
              <Select.Item
                className={styles.selectItem}
                value={toRadixValue(option.value)}
                disabled={option.disabled}
                textValue={option.label}
                key={option.value || EMPTY_VALUE}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className={styles.selectItemIndicator}>
                  <Check aria-hidden="true" size={16} strokeWidth={2.2} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className={styles.selectScrollButton}>
            <ChevronDown aria-hidden="true" size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
