"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import styles from "./admin-onboarding-guide.module.css";

const GUIDE_COOKIE = "dinehub_admin_guide";
const GUIDE_VERSION = "v1";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function openAdminGuide() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dinehub:open-guide"));
  }
}

export function AdminGuideTrigger({
  className,
  onClick,
  title,
  "aria-label": ariaLabel,
  children,
}: {
  className?: string;
  onClick?: () => void;
  title?: string;
  "aria-label"?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("AdminGuide");
  return (
    <button
      type="button"
      className={className}
      title={title ?? t("openGuideAria")}
      aria-label={ariaLabel ?? t("openGuideAria")}
      onClick={() => {
        onClick?.();
        openAdminGuide();
      }}
    >
      {children ?? (
        <>
          <Sparkles aria-hidden="true" size={18} />
          <span>{t("guideTitle")}</span>
        </>
      )}
    </button>
  );
}

const STEP_CONFIG = [
  { key: "step1", icon: Building2, tone: "teal" },
  { key: "step2", icon: UtensilsCrossed, tone: "lilac" },
  { key: "step3", icon: QrCode, tone: "coral" },
  { key: "step4", icon: ClipboardList, tone: "teal" },
] as const;

function hasCompletedGuide() {
  return typeof document !== "undefined" && document.cookie
    .split("; ")
    .some((cookie) => cookie === `${GUIDE_COOKIE}=${GUIDE_VERSION}`);
}

function rememberGuideCompletion() {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GUIDE_COOKIE}=${GUIDE_VERSION}; Max-Age=${TEN_YEARS}; Path=/; SameSite=Lax${secure}`;
}

function subscribeToGuideCookie() {
  return () => undefined;
}

export function AdminOnboardingGuide() {
  const t = useTranslations("AdminGuide");
  const locale = useLocale();
  const isRtl = locale !== "en";

  const hasCompleted = useSyncExternalStore(
    subscribeToGuideCookie,
    hasCompletedGuide,
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const [explicitOpen, setExplicitOpen] = useState<boolean | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const handleOpen = () => {
      setStepIndex(0);
      setDismissed(false);
      setExplicitOpen(true);
    };
    window.addEventListener("dinehub:open-guide", handleOpen);
    return () => window.removeEventListener("dinehub:open-guide", handleOpen);
  }, []);

  const stepDef = STEP_CONFIG[stepIndex];
  const isLastStep = stepIndex === STEP_CONFIG.length - 1;
  const StepIcon = stepDef.icon;
  const stepTitle = t(`${stepDef.key}Title` as any);
  const stepDescription = t(`${stepDef.key}Desc` as any);
  const stepAction = t(`${stepDef.key}Action` as any);

  const open = explicitOpen !== null ? explicitOpen : (!hasCompleted && !dismissed);

  const completeGuide = () => {
    rememberGuideCompletion();
    setDismissed(true);
    setExplicitOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDismissed(true);
      setExplicitOpen(false);
    } else {
      setExplicitOpen(true);
    }
  };

  const NextArrow = isRtl ? ArrowLeft : ArrowRight;
  const PrevArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          dir={isRtl ? "rtl" : "ltr"}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.visualGrid} />
            <div className={styles.orderPath}>
              {STEP_CONFIG.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    className={styles.pathNode}
                    data-active={index === stepIndex}
                    data-complete={index < stepIndex}
                    data-tone={item.tone}
                    key={item.key}
                  >
                    <span>{index < stepIndex ? <Check size={18} /> : <Icon size={20} />}</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.currentSignal} data-tone={stepDef.tone}>
              <StepIcon size={34} />
            </div>
            <p>{stepAction}</p>
          </div>

          <div className={styles.content}>
            <button className={styles.closeButton} type="button" onClick={completeGuide} aria-label={t("closeGuideAria")}>
              <X aria-hidden="true" size={20} />
            </button>

            <div className={styles.progress} aria-label={t("stepProgress", { current: stepIndex + 1, total: STEP_CONFIG.length })}>
              <span>{String(stepIndex + 1).padStart(2, "0")}</span>
              <div>
                {STEP_CONFIG.map((item, index) => (
                  <i data-current={index === stepIndex} data-complete={index < stepIndex} key={item.key} />
                ))}
              </div>
              <span>{String(STEP_CONFIG.length).padStart(2, "0")}</span>
            </div>

            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <Dialog.Title className={styles.title}>{stepTitle}</Dialog.Title>
            <Dialog.Description className={styles.description}>{stepDescription}</Dialog.Description>

            <div className={styles.actions}>
              <button
                className={styles.primaryAction}
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    completeGuide();
                  } else {
                    setStepIndex((current) => current + 1);
                  }
                }}
              >
                <span>{isLastStep ? t("getStarted") : t("next")}</span>
                {isLastStep ? <Check aria-hidden="true" size={19} /> : <NextArrow aria-hidden="true" size={19} />}
              </button>

              {stepIndex > 0 ? (
                <button className={styles.secondaryAction} type="button" onClick={() => setStepIndex((current) => current - 1)}>
                  <PrevArrow aria-hidden="true" size={18} />
                  <span>{t("prev")}</span>
                </button>
              ) : (
                <button className={styles.secondaryAction} type="button" onClick={completeGuide}>
                  {t("close")}
                </button>
              )}
            </div>

            <p className={styles.memoryNote}>{t("reopenHint")}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
