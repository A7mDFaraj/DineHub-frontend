"use client";

import { useAccess } from "@/lib/access-context";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { reconcileOrders } from "@/lib/order-reconciliation";
import { subscribeToEvents } from "@/lib/event-stream";
import { OrderCard, Order } from "@/components/staff/order-card";
import {
  OrderPagination,
  ORDERS_PER_PAGE,
} from "@/components/staff/order-pagination";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import "./staff.css";
import { Building2, Inbox, RefreshCw, Search, X } from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface Branch {
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
}

interface RawOrderItem {
  nameArAtOrder?: string | null;
  nameEnAtOrder?: string | null;
  id?: string;
  productId?: string;
  product?: { nameAr?: string; nameEn?: string };
  name?: string;
  nameEn?: string;
  nameAr?: string;
  quantity?: number;
  note?: string;
  selectedAttributes?: string[];
}

interface RawOrder {
  id: string;
  orderNumber?: number;
  updatedAt?: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  table?: { number?: number };
  tableId?: string;
  status?: Order["status"];
  notes?: string;
  note?: string;
  createdAt?: string;
  items?: RawOrderItem[];
}

type StatusFilter =
  "active" | "pending" | "preparing" | "ready" | "delivered" | "all";

function readBranches(data: unknown): Branch[] {
  if (Array.isArray(data)) return data as Branch[];
  if (!data || typeof data !== "object") return [];
  const envelope = data as { data?: unknown; branches?: unknown };
  if (Array.isArray(envelope.data)) return envelope.data as Branch[];
  if (Array.isArray(envelope.branches)) return envelope.branches as Branch[];
  return [];
}

function readOrders(data: unknown): RawOrder[] {
  if (Array.isArray(data)) return data as RawOrder[];
  if (!data || typeof data !== "object") return [];
  const envelope = data as {
    data?: unknown;
    orders?: unknown;
    items?: unknown;
  };
  if (Array.isArray(envelope.data)) return envelope.data as RawOrder[];
  if (Array.isArray(envelope.orders)) return envelope.orders as RawOrder[];
  if (Array.isArray(envelope.items)) return envelope.items as RawOrder[];
  return [];
}

function normalizeOrders(rawOrders: RawOrder[]): Order[] {
  return rawOrders.map((order) => ({
    id: order.id,
    tableId: order.table?.number?.toString() ?? "—",
    orderNumber: order.orderNumber,
    updatedAt: order.updatedAt,
    acceptedAt: order.acceptedAt,
    readyAt: order.readyAt,
    deliveredAt: order.deliveredAt,
    status: order.status ?? "pending",
    note: order.notes ?? order.note ?? "",
    createdAt: order.createdAt ?? new Date().toISOString(),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productId: item.productId ?? item.id ?? "unknown-product",
          nameAr:
            item.nameArAtOrder ??
            item.product?.nameAr ??
            item.nameAr ??
            item.name,
          nameEn:
            item.nameEnAtOrder ??
            item.product?.nameEn ??
            item.nameEn ??
            item.name ??
            "item",
          quantity: item.quantity ?? 1,
          note: item.note,
          selectedAttributes: item.selectedAttributes ?? [],
        }))
      : [],
  }));
}

function requestMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  return typeof message === "string" ? message : fallback;
}

export default function StaffDashboard() {
  const locale = useLocale();
  const t = useTranslations("Staff");
  const isRtl = locale !== "en";

  const { can } = useAccess();
  const { data: session } = useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [requestedPage, setRequestedPage] = useState(0);
  const boardTop = useRef<HTMLDivElement>(null);

  const fetchingBranches = useRef(new Set<string>());
  const queuedRefresh = useRef(new Set<string>());
  const historyCursor = useRef<string | null | undefined>(undefined);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const historyInFlight = useRef(false);
  const branchEpoch = useRef(0);
  const pendingRef = useRef(new Set<string>());
  const requestVersion = useRef(0);
  const branchRef = useRef("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const fetchBranches = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/staff/branches");
      const list = readBranches(data);
      setBranches(list);
      setError("");
      setSelectedBranchId((current) =>
        list.some((branch) => branch.id === current)
          ? current
          : (list[0]?.id ?? ""),
      );
      if (list.length === 0) setLoading(false);
    } catch (err: unknown) {
      console.error("Failed to load branches:", err);
      setError(requestMessage(err, t("loadBranchesError")));
      setLoading(false);
    }
  }, [t]);

  const fetchOrders = useCallback(
    async (branchId: string, isManual = false) => {
      if (branchRef.current !== branchId) return;
      if (fetchingBranches.current.has(branchId)) {
        queuedRefresh.current.add(branchId);
        return;
      }
      fetchingBranches.current.add(branchId);
      if (isManual) setIsRefreshing(true);
      try {
        do {
          queuedRefresh.current.delete(branchId);
          const version = ++requestVersion.current;
          try {
            const [liveRes, historyRes] = await Promise.all([
              apiClient.get(`/staff/orders/${branchId}`),
              apiClient.get(`/staff/orders/${branchId}/history`),
            ]);
            if (
              version !== requestVersion.current ||
              branchRef.current !== branchId
            )
              continue;
            const live = readOrders(liveRes.data);
            const liveIds = new Set(live.map((order) => order.id));
            const received = [
              ...live,
              ...readOrders(historyRes.data).filter(
                (order) => !liveIds.has(order.id),
              ),
            ];
            setOrders((previous) =>
              reconcileOrders(
                previous,
                normalizeOrders(received),
                pendingRef.current,
              ),
            );
            if (historyCursor.current === undefined) {
              historyCursor.current = historyRes.data.nextCursor ?? null;
              setHasMoreHistory(!!historyCursor.current);
            }
            setError("");
          } catch (err: unknown) {
            if (
              version === requestVersion.current &&
              branchRef.current === branchId
            ) {
              setError(requestMessage(err, t("loadOrdersError")));
            }
          } finally {
            if (version === requestVersion.current) setLoading(false);
          }
        } while (
          queuedRefresh.current.has(branchId) &&
          branchRef.current === branchId
        );
      } finally {
        fetchingBranches.current.delete(branchId);
        if (isManual) setIsRefreshing(false);
      }
    },
    [t],
  );

  const loadMoreHistory = async () => {
    const cursor = historyCursor.current;
    if (!cursor || historyInFlight.current) return;
    const branchId = selectedBranchId;
    const epoch = branchEpoch.current;
    historyInFlight.current = true;
    setLoadingHistory(true);
    try {
      const { data } = await apiClient.get(
        `/staff/orders/${branchId}/history`,
        { params: { cursor } },
      );
      if (epoch !== branchEpoch.current || branchRef.current !== branchId)
        return;
      const older = normalizeOrders(readOrders(data));
      setOrders((previous) => {
        const ids = new Set(previous.map((order) => order.id));
        return [...previous, ...older.filter((order) => !ids.has(order.id))];
      });
      historyCursor.current = data.nextCursor ?? null;
      setHasMoreHistory(!!historyCursor.current);
      setError("");
    } catch (err) {
      if (epoch === branchEpoch.current)
        setError(requestMessage(err, t("loadOrdersError")));
    } finally {
      historyInFlight.current = false;
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void fetchBranches(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchBranches]);

  useEffect(() => {
    branchRef.current = selectedBranchId;
    if (!selectedBranchId) return;

    const invalidateRequests = () => {
      ++requestVersion.current;
      ++branchEpoch.current;
    };
    const refreshOrders = () => {
      if (document.visibilityState === "visible")
        void fetchOrders(selectedBranchId);
    };
    const initialLoad = window.setTimeout(
      () => void fetchOrders(selectedBranchId),
      0,
    );
    const seenEvents = new Set<string>();
    const closeStream = subscribeToEvents(
      `/staff/orders/${encodeURIComponent(selectedBranchId)}/stream`,
      (event) => {
        if (event.type === "unavailable") {
          ++requestVersion.current;
          setOrders([]);
          setError(t("loadOrdersError"));
          return;
        }
        if (event.type !== "connected" && !event.type.startsWith("order."))
          return;
        if (event.id && seenEvents.has(event.id)) return;
        if (event.id) {
          seenEvents.add(event.id);
          if (seenEvents.size > 500)
            seenEvents.delete(seenEvents.values().next().value!);
        }
        refreshOrders();
      },
    );
    const intervalId = window.setInterval(refreshOrders, 60_000);
    document.addEventListener("visibilitychange", refreshOrders);

    return () => {
      invalidateRequests();
      window.clearTimeout(initialLoad);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshOrders);
      closeStream();
    };
  }, [fetchOrders, selectedBranchId, t]);

  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"],
  ) => {
    if (pendingRef.current.has(orderId)) return;
    const branchId = selectedBranchId;
    pendingRef.current.add(orderId);
    setPendingIds(new Set(pendingRef.current));
    setActionErrors((previous) => ({ ...previous, [orderId]: "" }));
    ++requestVersion.current;
    try {
      const { data } = await apiClient.patch(
        `/staff/orders/${orderId}/status`,
        { status: newStatus },
      );
      if (branchRef.current === branchId) {
        const confirmed = normalizeOrders([data.data || data])[0];
        ++requestVersion.current;
        setOrders((previous) =>
          previous.map((order) => (order.id === orderId ? confirmed : order)),
        );
      }
    } catch {
      if (branchRef.current === branchId) {
        setActionErrors((previous) => ({
          ...previous,
          [orderId]: t("updateError"),
        }));
      }
    } finally {
      pendingRef.current.delete(orderId);
      setPendingIds(new Set(pendingRef.current));
      if (branchRef.current === branchId) void fetchOrders(branchId);
    }
  };

  const counts = {
    active: orders.filter((o) => o.status !== "delivered").length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    all: orders.length,
  };

  const query = search.trim().toLocaleLowerCase();
  const filteredOrders = orders
    .filter(
      (order) =>
        !query ||
        [
          order.orderNumber?.toString().padStart(4, "0"),
          order.tableId,
          ...order.items.flatMap((item) => [item.nameAr, item.nameEn]),
        ].some((value) =>
          value?.toLocaleLowerCase().includes(query.replace(/^#/, "")),
        ),
    )
    .filter((o) => {
      if (statusFilter === "active") return o.status !== "delivered";
      if (statusFilter === "all") return true;
      return o.status === statusFilter;
    })
    .sort((a, b) => {
      const statusWeight = { pending: 1, preparing: 2, ready: 3, delivered: 4 };
      if (statusWeight[a.status] !== statusWeight[b.status]) {
        return statusWeight[a.status] - statusWeight[b.status];
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const isAdmin = can("branches.all");
  const page = Math.min(
    requestedPage,
    Math.max(0, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) - 1),
  );
  const visibleOrders = filteredOrders.slice(
    page * ORDERS_PER_PAGE,
    (page + 1) * ORDERS_PER_PAGE,
  );
  const changePage = (next: number) => {
    setRequestedPage(next);
    boardTop.current?.focus({ preventScroll: true });
    boardTop.current?.scrollIntoView({ block: "start", behavior: "instant" });
  };

  return (
    <div className="staff-board">
      <section className="staff-board-heading">
        <h1>{t("incomingOrders")}</h1>
        <div className="staff-board-controls">
          {branches.length > 0 && (
            <div className="staff-branch">
              <Building2 size={19} aria-hidden="true" />
              {isAdmin && branches.length > 1 ? (
                <select
                  aria-label={t("assignedBranch")}
                  value={selectedBranchId}
                  onChange={(event) => {
                    branchRef.current = event.target.value;
                    ++requestVersion.current;
                    historyCursor.current = undefined;
                    setHasMoreHistory(false);
                    ++branchEpoch.current;
                    setOrders([]);
                    setRequestedPage(0);
                    setError("");
                    setLoading(true);
                    setSelectedBranchId(event.target.value);
                  }}
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {isRtl
                        ? branch.nameAr || branch.name || branch.nameEn
                        : branch.nameEn || branch.name || branch.nameAr}
                    </option>
                  ))}
                </select>
              ) : (
                <span>
                  {isRtl
                    ? branches[0].nameAr ||
                      branches[0].name ||
                      branches[0].nameEn
                    : branches[0].nameEn ||
                      branches[0].name ||
                      branches[0].nameAr}
                </span>
              )}
            </div>
          )}
          <button
            className="staff-refresh"
            type="button"
            onClick={() =>
              selectedBranchId
                ? void fetchOrders(selectedBranchId, true)
                : void fetchBranches()
            }
            disabled={isRefreshing || loading}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              size={19}
              className={
                isRefreshing ? "animate-spin motion-reduce:animate-none" : ""
              }
              aria-hidden="true"
            />
            <span>{t("refresh")}</span>
          </button>
        </div>
      </section>
      <div
        className="staff-filters"
        role="group"
        aria-label={t("filterOrders")}
      >
        {(
          [
            "active",
            "pending",
            "preparing",
            "ready",
            "delivered",
            "all",
          ] as const
        ).map((status) => (
          <button
            type="button"
            key={status}
            aria-pressed={statusFilter === status}
            data-status={status}
            onClick={() => {
              setStatusFilter(status);
              setRequestedPage(0);
            }}
          >
            <span>{t(`tabs.${status}`)}</span>
            <strong>{loading ? "—" : counts[status]}</strong>
          </button>
        ))}
      </div>
      <div className="staff-board-toolbar" ref={boardTop} tabIndex={-1}>
        <label className="staff-search">
          <Search size={20} aria-hidden="true" />
          <span className="sr-only">{t("searchOrders")}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setRequestedPage(0);
            }}
            placeholder={t("searchOrders")}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRequestedPage(0);
              }}
              aria-label={t("clearSearch")}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </label>
        <p className="staff-sort-label">{t("oldestFirst")}</p>
      </div>
      <OrderPagination
        page={page}
        total={filteredOrders.length}
        onPageChange={changePage}
      />
      {error && (
        <div role="alert" className="staff-board-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={() =>
              selectedBranchId
                ? void fetchOrders(selectedBranchId, true)
                : void fetchBranches()
            }
            disabled={isRefreshing}
          >
            {t("retry")}
          </button>
        </div>
      )}
      {loading && orders.length === 0 ? (
        <div className="staff-board-empty" role="status">
          <LoadingSpinner size={36} />
          <p>{t("loadingOrders")}</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="staff-board-empty">
          <Building2 size={32} aria-hidden="true" />
          <p>
            {session?.user?.role === "cashier"
              ? t("noBranchesAssigned")
              : t("noBranchesCreated")}
          </p>
        </div>
      ) : (
        <div className="staff-ticket-grid">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              canUpdate={can(
                order.status === "pending"
                  ? "orders.prepare"
                  : order.status === "preparing"
                    ? "orders.ready"
                    : "orders.deliver",
              )}
              isUpdating={pendingIds.has(order.id)}
              error={actionErrors[order.id]}
              onStatusChange={handleStatusChange}
            />
          ))}
          {filteredOrders.length === 0 && (
            <div className="staff-board-empty">
              <Inbox size={34} aria-hidden="true" />
              <h2>{search ? t("noSearchResults") : t("emptyTitle")}</h2>
              <p>
                {search
                  ? t("tryAnotherSearch")
                  : statusFilter === "delivered"
                    ? t("emptyDelivered")
                    : t("emptyLive")}
              </p>
            </div>
          )}
        </div>
      )}
      <OrderPagination
        page={page}
        total={filteredOrders.length}
        onPageChange={changePage}
      />
      {hasMoreHistory &&
        (statusFilter === "delivered" || statusFilter === "all") && (
          <button
            type="button"
            className="staff-refresh"
            onClick={() => void loadMoreHistory()}
            disabled={loadingHistory}
          >
            {loadingHistory ? t("loadingOrders") : t("loadOlder")}
          </button>
        )}
    </div>
  );
}
