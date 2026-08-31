"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  HelpCircle,
  QrCode,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
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
  children,
}: {
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        openAdminGuide();
      }}
      aria-label="فتح دليل البدء السريع"
    >
      {children ?? (
        <>
          <Sparkles aria-hidden="true" size={18} />
          <span>دليل البدء السريع</span>
        </>
      )}
    </button>
  );
}

const steps = [
  {
    title: "ابدأ بالفرع",
    description: "أضف موقع الخدمة ومعلوماته الأساسية. منه ستتفرع الطاولات والقائمة.",
    action: "الفروع",
    icon: Building2,
    tone: "teal",
  },
  {
    title: "رتّب ما يطلبه العميل",
    description: "أنشئ التصنيفات، ثم أضف المنتجات والأسعار والإضافات بترتيب واضح.",
    action: "القائمة",
    icon: UtensilsCrossed,
    tone: "lilac",
  },
  {
    title: "افتح نقطة الدخول",
    description: "أنشئ رمز QR لكل طاولة أو نقطة استلام ليبدأ الطلب بلا تطبيق.",
    action: "QR",
    icon: QrCode,
    tone: "coral",
  },
  {
    title: "تابع الإشارة حتى التسليم",
    description: "بعد النشر، ستجتمع الطلبات وحالة الخدمة في لوحة تحكم واحدة.",
    action: "التشغيل",
    icon: ClipboardList,
    tone: "teal",
  },
] as const;

function hasCompletedGuide() {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie === `${GUIDE_COOKIE}=${GUIDE_VERSION}`);
}

function rememberGuideCompletion() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GUIDE_COOKIE}=${GUIDE_VERSION}; Max-Age=${TEN_YEARS}; Path=/; SameSite=Lax${secure}`;
}

function subscribeToGuideCookie() {
  return () => undefined;
}

export function AdminOnboardingGuide() {
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

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const StepIcon = step.icon;

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

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.dialog}
          dir="rtl"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.visualGrid} />
            <div className={styles.orderPath}>
              {steps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    className={styles.pathNode}
                    data-active={index === stepIndex}
                    data-complete={index < stepIndex}
                    data-tone={item.tone}
                    key={item.title}
                  >
                    <span>{index < stepIndex ? <Check size={18} /> : <Icon size={20} />}</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.currentSignal} data-tone={step.tone}>
              <StepIcon size={34} />
            </div>
            <p>{step.action}</p>
          </div>

          <div className={styles.content}>
            <button className={styles.closeButton} type="button" onClick={completeGuide} aria-label="إغلاق الدليل">
              <X aria-hidden="true" size={20} />
            </button>

            <div className={styles.progress} aria-label={`الخطوة ${stepIndex + 1} من ${steps.length}`}>
              <span>{String(stepIndex + 1).padStart(2, "0")}</span>
              <div>
                {steps.map((item, index) => (
                  <i data-current={index === stepIndex} data-complete={index < stepIndex} key={item.title} />
                ))}
              </div>
              <span>{String(steps.length).padStart(2, "0")}</span>
            </div>

            <p className={styles.eyebrow}>دليل البدء السريع</p>
            <Dialog.Title className={styles.title}>{step.title}</Dialog.Title>
            <Dialog.Description className={styles.description}>{step.description}</Dialog.Description>

            <div className={styles.actions}>
              <button className={styles.primaryAction} type="button" onClick={() => {
                if (isLastStep) {
                  completeGuide();
                } else {
                  setStepIndex((current) => current + 1);
                }
              }}>
                <span>{isLastStep ? "ابدأ العمل" : "التالي"}</span>
                {isLastStep ? <Check aria-hidden="true" size={19} /> : <ArrowLeft aria-hidden="true" size={19} />}
              </button>

              {stepIndex > 0 ? (
                <button className={styles.secondaryAction} type="button" onClick={() => setStepIndex((current) => current - 1)}>
                  <ArrowRight aria-hidden="true" size={18} />
                  <span>السابق</span>
                </button>
              ) : (
                <button className={styles.secondaryAction} type="button" onClick={completeGuide}>
                  إغلاق الدليل
                </button>
              )}
            </div>

            <p className={styles.memoryNote}>يمكنك إعادة فتح هذا الدليل في أي وقت من القائمة الجانبية.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
