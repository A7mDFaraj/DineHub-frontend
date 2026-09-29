"use client";

import {
  Loader2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ShoppingBag,
  Check,
} from "lucide-react";
import {
  parseOrderNote,
  preparationSubject,
  type PreparationLine,
} from "@/lib/staff-order-note";
export { parseOrderNote } from "@/lib/staff-order-note";
import { useLocale, useTranslations } from "next-intl";

import { OrderElapsed } from "@/components/orders/order-elapsed";

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered";

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameAr?: string;
  quantity: number;
  note?: string;
  selectedAttributes?: string[];
}

export interface Order {
  id: string;
  orderNumber?: number;
  updatedAt?: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  tableId: string;
  status: OrderStatus;
  note: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderCardProps {
  order: Order;
  canUpdate?: boolean;
  isUpdating?: boolean;
  error?: string;
  onStatusChange: (id: string, newStatus: OrderStatus) => void;
}

const statusConfig = {
  pending: {
    statusKey: "statusPending",
    nextStatus: "preparing",
    actionKey: "actionPrepare",
  },
  preparing: {
    statusKey: "statusPreparing",
    nextStatus: "ready",
    actionKey: "actionReady",
  },
  ready: {
    statusKey: "statusReady",
    nextStatus: "delivered",
    actionKey: "actionDeliver",
  },
  delivered: {
    statusKey: "statusDelivered",
    nextStatus: null,
    actionKey: null,
  },
} as const;

function Modifiers({ values }: { values: string[] }) {
  const t = useTranslations("Staff.orderCard");
  if (!values.length) return null;
  return (
    <section className="staff-modifiers" aria-label={t("modifiers")}>
      <h4>{t("modifiers")}</h4>
      <ul>
        {values.map((value, index) => (
          <li key={`${value}-${index}`}>
            <Check size={16} aria-hidden="true" />
            <span dir="auto">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PreparationDetails({ instruction }: { instruction: PreparationLine }) {
  const t = useTranslations("Staff.orderCard");
  return (
    <>
      {instruction.isTakeaway && (
        <div className="staff-takeaway">
          <ShoppingBag size={22} aria-hidden="true" />
          <strong>{t("takeaway")}</strong>
          <span>{t("packSeparately")}</span>
        </div>
      )}
      <Modifiers values={instruction.modifiers} />
      {!!instruction.details.length && (
        <p className="staff-ticket-options" dir="auto">
          {instruction.details.join(" — ")}
        </p>
      )}
      {instruction.specialNote && (
        <div className="staff-special-note">
          <strong>{t("specialNote")}</strong>
          <p dir="auto">{instruction.specialNote}</p>
        </div>
      )}
    </>
  );
}

export function OrderCard({
  order,
  onStatusChange,
  isUpdating = false,
  canUpdate = true,
  error,
}: OrderCardProps) {
  const locale = useLocale();
  const t = useTranslations("Staff.orderCard");
  const isRtl = locale === "ar";
  const config = statusConfig[order.status];
  const shortId = order.orderNumber?.toString().padStart(4, "0") ?? "—";
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight;
  const parsedNote = parseOrderNote(order.note);
  // Only merge when both the name and the entire portion count match.
  // Ambiguous older notes remain visible in their original separate section.
  const matched = new Set<PreparationLine>();
  const portions = order.items.flatMap((item) => {
    const names = [item.nameAr, item.nameEn].filter(Boolean);
    const ambiguous = order.items.some(
      (other) =>
        other !== item &&
        [other.nameAr, other.nameEn].some(
          (name) => name && names.includes(name),
        ),
    );
    const instructions = ambiguous
      ? []
      : parsedNote.preparation.filter((line) => {
          const subject = preparationSubject(line.subject);
          return subject && names.includes(subject.name);
        });
    const total = instructions.reduce(
      (sum, line) => sum + preparationSubject(line.subject)!.quantity,
      0,
    );
    if (instructions.length && total === item.quantity) {
      return instructions.map((instruction) => {
        matched.add(instruction);
        return {
          ...item,
          quantity: preparationSubject(instruction.subject)!.quantity,
          instruction,
        };
      });
    }
    return [{ ...item, instruction: undefined as PreparationLine | undefined }];
  });
  const unmatched = parsedNote.preparation.filter((line) => !matched.has(line));

  return (
    <article
      className="staff-ticket"
      data-status={order.status}
      aria-label={`${t("orderNumber")} ${shortId}`}
      aria-busy={isUpdating}
    >
      <header className="staff-ticket-header">
        <div className="staff-ticket-identity">
          <div>
            <span className="staff-ticket-caption">{t("orderNumber")}</span>
            <h2>
              <bdi>#{shortId}</bdi>
            </h2>
          </div>
          <div className="staff-ticket-table">
            <span>{t("tableLabel")}</span>
            <strong>
              <bdi>{order.tableId}</bdi>
            </strong>
          </div>
        </div>
        <div className="staff-ticket-meta">
          <span className="staff-ticket-status">{t(config.statusKey)}</span>
          <Clock size={16} aria-hidden="true" />
          <OrderElapsed
            createdAt={order.createdAt}
            deliveredAt={order.deliveredAt}
            completed={order.status === "delivered"}
            highlightDelayed
          />
        </div>
      </header>
      <div className="staff-ticket-body">
        <ul className="staff-ticket-items" aria-label={t("items")}>
          {portions.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
              <div className="staff-ticket-item">
                <span className="staff-ticket-quantity">
                  <bdi>{item.quantity}×</bdi>
                </span>
                <h3 dir="auto">
                  {isRtl
                    ? item.nameAr || item.nameEn
                    : item.nameEn || item.nameAr}
                </h3>
              </div>
              {item.instruction && (
                <PreparationDetails instruction={item.instruction} />
              )}
              <Modifiers values={item.selectedAttributes ?? []} />
              {item.note && (
                <div className="staff-special-note">
                  <strong>{t("specialNote")}</strong>
                  <p dir="auto">{item.note}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
        {unmatched.length > 0 && (
          <section
            className="staff-preparation"
            aria-label={t("preparationDetails")}
          >
            <h3 className="staff-section-label">{t("preparationDetails")}</h3>
            {unmatched.map((instruction, index) => (
              <div
                className="staff-preparation-line"
                key={`${instruction.subject}-${index}`}
              >
                <h4 dir="auto">{instruction.subject}</h4>
                <PreparationDetails instruction={instruction} />
              </div>
            ))}
          </section>
        )}
        {parsedNote.generalNote && (
          <section className="staff-general-note" aria-label={t("notes")}>
            <h3>
              <MessageSquare size={18} aria-hidden="true" />
              {t("notes")}
            </h3>
            <p dir="auto">{parsedNote.generalNote}</p>
          </section>
        )}
      </div>
      <footer className="staff-ticket-footer">
        {error && (
          <p role="alert" className="staff-action-error">
            {error}
          </p>
        )}
        {order.status === "ready" && (
          <p className="staff-ready-hint">
            {t("statusReadyHint", { code: shortId })}
          </p>
        )}
        {config.nextStatus && canUpdate ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(order.id, config.nextStatus!)}
            className="staff-ticket-action"
          >
            <span>{isUpdating ? t("updating") : t(config.actionKey!)}</span>
            {isUpdating ? (
              <Loader2
                size={22}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <ChevronIcon size={22} aria-hidden="true" />
            )}
          </button>
        ) : (
          <p className="staff-ticket-complete">
            {order.status === "delivered" && (
              <CheckCircle2 size={20} aria-hidden="true" />
            )}
            <span>
              {order.status === "delivered"
                ? t("deliveredBadge")
                : t("waitingBadge")}
            </span>
          </p>
        )}
      </footer>
    </article>
  );
}
