type Status = "pending" | "preparing" | "ready" | "delivered";
export function reconcileOrders<T extends { id: string; status: Status }>(
  previous: T[], received: T[], pending: ReadonlySet<string>,
): T[] {
  const existing = new Map(previous.map(order => [order.id, order]));
  const ids = new Set(received.map(order => order.id));
  const rank = { pending: 0, preparing: 1, ready: 2, delivered: 3 };
  return [
    ...received.map(order => {
      const old = existing.get(order.id);
      return old && (pending.has(order.id) || rank[old.status] > rank[order.status]) ? old : order;
    }),
    // Only preserve previously loaded history and in-flight local transitions.
    // An active order absent from an authoritative live list is no longer live.
    ...previous.filter(order => !ids.has(order.id) && (order.status === "delivered" || pending.has(order.id))),
  ];
}
