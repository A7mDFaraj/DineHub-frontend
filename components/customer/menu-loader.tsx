"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import type { PublicMenu } from "@/lib/menu-types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCartStore } from "@/store/cart-store";
import { MenuExperience } from "./menu-experience";

export function MenuLoader({
  branchId,
  tableNumber,
}: {
  branchId: string;
  tableNumber?: string;
}) {
  const router = useRouter();
  const ar = useLocale() === "ar";
  const t = useTranslations("CustomerMenu");
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [table, setTable] = useState<{ id: string; number: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      setTableError("");
      setTable(undefined);
      try {
        const [menuResult, tableResult] = await Promise.allSettled([
          apiClient.get<PublicMenu>(`/menu/${encodeURIComponent(branchId)}`, {
            signal: controller.signal,
          }),
          tableNumber
            ? apiClient.get(
                `/table/${encodeURIComponent(branchId)}/${encodeURIComponent(tableNumber)}`,
                { signal: controller.signal },
              )
            : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;
        if (menuResult.status !== "fulfilled")
          throw new Error("Menu request failed");
        const data = menuResult.value.data;
        if (!data?.branch || !Array.isArray(data.categories))
          throw new Error("Invalid menu response");
        data.categories = data.categories.map((category) => ({
          ...category,
          products: Array.isArray(category.products) ? category.products : [],
        }));
        setMenu(data);
        if (tableNumber) {
          if (
            tableResult.status === "fulfilled" &&
            tableResult.value?.data?.id &&
            tableResult.value.data.branchId === data.branch.id
          ) {
            const value = tableResult.value.data;
            setTable({ id: value.id, number: value.number });
            useCartStore.getState().setContext(`${data.branch.id}:${value.id}`);
            useCartStore
              .getState()
              .syncPrices(
                data.categories.flatMap((category) => category.products),
              );
          } else setTableError(t("tableError"));
        }
        if (data.branch.publicCode && data.branch.publicCode !== branchId)
          router.replace(
            `/menu/${data.branch.publicCode}${tableNumber ? `/${tableNumber}` : ""}`,
          );
      } catch {
        if (!controller.signal.aborted) setError(t("loadError"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [branchId, tableNumber, router, t, attempt]);

  if (loading)
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 text-stone-700"
        role="status"
      >
        <LoadingSpinner size={32} />
        <p>{t("loadingMenu")}</p>
      </div>
    );
  if (error || !menu)
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 p-6 text-center text-stone-800"
        role="alert"
      >
        <p>{error || t("loadError")}</p>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-stone-400 px-6"
          onClick={() => setAttempt((n) => n + 1)}
        >
          {ar ? "إعادة المحاولة" : "Try again"}
        </button>
      </div>
    );
  return (
    <MenuExperience
      key={`${branchId}:${tableNumber ?? "browse"}`}
      menu={menu}
      table={table}
      tableError={tableError}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
