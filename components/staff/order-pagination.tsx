"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export const ORDERS_PER_PAGE = 24;

export function OrderPagination({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("Staff");
  const rtl = useLocale() === "ar";
  const pages = Math.ceil(total / ORDERS_PER_PAGE);
  if (pages < 2) return null;
  const Previous = rtl ? ChevronRight : ChevronLeft;
  const Next = rtl ? ChevronLeft : ChevronRight;
  return (
    <nav className="staff-pagination" aria-label={t("orderPages")}>
      <p role="status">
        {t("showingOrders", {
          from: page * ORDERS_PER_PAGE + 1,
          to: Math.min((page + 1) * ORDERS_PER_PAGE, total),
          total,
        })}
      </p>
      <div>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label={t("previousOrders")}
        >
          <Previous size={20} aria-hidden="true" />
          <span>{t("previous")}</span>
        </button>
        <span className="staff-page-number">
          {t("pageOf", { page: page + 1, total: pages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages - 1}
          aria-label={t("nextOrders")}
        >
          <span>{t("next")}</span>
          <Next size={20} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
