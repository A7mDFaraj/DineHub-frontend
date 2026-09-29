import { create } from "zustand";
import {
  prepareCheckout,
  validPrice,
  trackingPathIsValid,
  uuidPattern,
} from "../lib/checkout.ts";
import type {
  CheckoutLine,
  CheckoutCode,
  OrderPayload,
} from "../lib/checkout.ts";

export interface CartItem extends CheckoutLine {
  imageUrl?: string;
}
export type AddCartItemInput = Omit<CartItem, "id" | "quantity"> & {
  quantity?: number;
};
export interface PendingOrder {
  key: string;
  payload: OrderPayload;
}
type Phase = "editing" | "submitting" | "confirmed" | "rejected" | "unknown";
interface Snapshot {
  items: CartItem[];
  note: string;
  pending: PendingOrder | null;
  trackingPath: string | null;
}
interface CartStore extends Snapshot {
  context: string | null;
  phase: Phase;
  isCartOpen: boolean;
  issue: CheckoutCode | null;
  removed: CartItem | null;
  setContext: (context: string) => void;
  syncPrices: (
    products: {
      id: string;
      price: number | string;
      isAvailable?: boolean;
      attributes?: { attribute: { id: string } }[];
    }[],
  ) => void;
  acceptPrices: () => void;
  addItem: (item: AddCartItemInput) => boolean;
  editItem: (id: string, item: AddCartItemInput) => boolean;
  removeItem: (id: string) => void;
  undoRemove: () => void;
  updateQuantity: (id: string, quantity: number) => void;
  setNote: (note: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  beginSubmission: (pending: PendingOrder) => boolean;
  resolveSubmission: (
    outcome: "unknown" | "rejected" | "confirmed",
    trackingPath?: string,
    context?: string,
  ) => void;
  totalAmount: () => number;
  totalItems: () => number;
}
const empty = (): Snapshot => ({
  items: [],
  note: "",
  pending: null,
  trackingPath: null,
});
const memory = new Map<string, Snapshot>();
const keyFor = (context: string) => `dinehub-cart:v2:${context}`;
const locked = (state: CartStore) => state.pending !== null;
function configId(item: AddCartItemInput) {
  return JSON.stringify([
    item.productId,
    [
      ...new Set((item.selectedAttributes ?? []).map((option) => option.id)),
    ].sort(),
    item.itemNote?.trim() ?? "",
    item.isTakeaway === true,
  ]);
}
function validItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as CartItem;
  return (
    typeof item.id === "string" &&
    typeof item.productId === "string" &&
    typeof item.nameAr === "string" &&
    typeof item.nameEn === "string" &&
    validPrice(item.price) &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 99 &&
    (item.itemNote === undefined ||
      (typeof item.itemNote === "string" && item.itemNote.length <= 500)) &&
    (item.isTakeaway === undefined || typeof item.isTakeaway === "boolean") &&
    (item.selectedAttributes === undefined ||
      (Array.isArray(item.selectedAttributes) &&
        item.selectedAttributes.every(
          (option) =>
            option &&
            typeof option.id === "string" &&
            typeof option.labelAr === "string" &&
            typeof option.labelEn === "string",
        )))
  );
}
function read(context: string): Snapshot {
  try {
    const raw = sessionStorage.getItem(keyFor(context));
    if (!raw) return memory.get(context) ?? empty();
    const value = JSON.parse(raw);
    if (
      value.version !== 2 ||
      !Array.isArray(value.items) ||
      !value.items.every(validItem) ||
      typeof value.note !== "string" ||
      value.note.length > 1000
    )
      return empty();
    const pending = value.pending as PendingOrder | null;
    if (pending) {
      const p = pending.payload;
      if (
        !/^[A-Za-z0-9_-]{16,128}$/.test(pending.key) ||
        !p ||
        `${p.branchId}:${p.tableId}` !== context ||
        !uuidPattern.test(p.branchId) ||
        !uuidPattern.test(p.tableId) ||
        !Array.isArray(p.items) ||
        !p.items.length ||
        p.items.length > 100 ||
        new Set(p.items.map((i) => i.productId)).size !== p.items.length ||
        p.items.some(
          (i) =>
            !uuidPattern.test(i.productId) ||
            !Number.isInteger(i.quantity) ||
            i.quantity < 1 ||
            i.quantity > 99 ||
            !validPrice(i.expectedUnitPrice),
        ) ||
        (p.note !== undefined &&
          (typeof p.note !== "string" || p.note.length > 5000))
      )
        return empty();
    }
    return {
      items: value.items,
      note: value.note,
      pending: pending ?? null,
      trackingPath: trackingPathIsValid(value.trackingPath)
        ? value.trackingPath
        : null,
    };
  } catch {
    return memory.get(context) ?? empty();
  }
}
function save(context: string, snapshot: Snapshot): boolean {
  const data = {
    items: snapshot.items,
    note: snapshot.note,
    pending: snapshot.pending,
    trackingPath: snapshot.trackingPath,
  };
  memory.set(context, data);
  try {
    sessionStorage.setItem(
      keyFor(context),
      JSON.stringify({ version: 2, ...data }),
    );
    return true;
  } catch {
    return false;
  }
}
function validation(items: CartItem[], note: string) {
  return [false, true]
    .flatMap((ar) => prepareCheckout(items, note, ar).issues)
    .find(
      (issue) =>
        !["EMPTY", "UNAVAILABLE", "PRICE_CHANGED"].includes(issue.code),
    );
}
export const useCartStore = create<CartStore>((set, get) => {
  const commit = (patch: Partial<CartStore>) => {
    set(patch);
    const state = get();
    if (state.context) save(state.context, state);
  };
  const put = (input: AddCartItemInput, replaceId?: string) => {
    const state = get();
    if (locked(state)) return false;
    const item: CartItem = {
      ...input,
      id: configId(input),
      quantity: input.quantity ?? 1,
      itemNote: input.itemNote?.trim() || undefined,
    };
    if (!validItem(item)) {
      set({ issue: "QUANTITY" });
      return false;
    }
    const items = state.items.filter((i) => i.id !== replaceId);
    const match = items.find((i) => i.id === item.id);
    const next = match
      ? items.map((i) =>
          i.id === item.id
            ? {
                ...item,
                quantity: i.quantity + item.quantity,
                previousPrice: i.previousPrice,
                unavailable: i.unavailable,
              }
            : i,
        )
      : replaceId
        ? state.items.map((i) => (i.id === replaceId ? item : i))
        : [...items, item];
    const issue = validation(next, state.note);
    if (issue) {
      set({ issue: issue.code });
      return false;
    }
    commit({ items: next, issue: null, phase: "editing" });
    return true;
  };
  return {
    ...empty(),
    context: null,
    phase: "editing",
    isCartOpen: false,
    issue: null,
    removed: null,
    setContext: (context) => {
      if (get().context === context) return;
      const snapshot = read(context);
      set({
        ...snapshot,
        context,
        phase: snapshot.pending
          ? "unknown"
          : snapshot.trackingPath
            ? "confirmed"
            : "editing",
        isCartOpen: Boolean(snapshot.pending),
        issue: null,
        removed: null,
      });
    },
    syncPrices: (products) => {
      if (locked(get())) return;
      commit({
        items: get().items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const unavailable =
            !product ||
            product.isAvailable === false ||
            !validPrice(Number(product.price)) ||
            (item.selectedAttributes ?? []).some(
              (option) =>
                !product.attributes?.some((a) => a.attribute.id === option.id),
            );
          if (unavailable || !product) return { ...item, unavailable: true };
          const price = Number(product.price);
          return {
            ...item,
            unavailable: false,
            price,
            previousPrice:
              price !== item.price
                ? (item.previousPrice ?? item.price)
                : item.previousPrice,
          };
        }),
      });
    },
    acceptPrices: () => {
      if (!locked(get()))
        commit({
          items: get().items.map((item) => ({
            ...item,
            previousPrice: undefined,
          })),
        });
    },
    addItem: (input) => put(input),
    editItem: (id, input) => put(input, id),
    removeItem: (id) => {
      if (!locked(get()))
        commit({
          removed: get().items.find((i) => i.id === id) ?? null,
          items: get().items.filter((i) => i.id !== id),
          issue: null,
        });
    },
    undoRemove: () => {
      const item = get().removed;
      if (item && put(item)) set({ removed: null });
    },
    updateQuantity: (id, quantity) => {
      const item = get().items.find((i) => i.id === id);
      if (item) {
        if (quantity === 0) get().removeItem(id);
        else put({ ...item, quantity }, id);
      }
    },
    setNote: (note) => {
      if (!locked(get())) commit({ note, issue: null });
    },
    clearCart: () => {
      if (!locked(get()))
        commit({ items: [], note: "", issue: null, removed: null });
    },
    toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
    beginSubmission: (pending) => {
      const state = get();
      if (!state.context || state.phase === "submitting") return false;
      const next = { ...state, pending: state.pending ?? pending };
      if (!save(state.context, next)) return false;
      set({ pending: next.pending, phase: "submitting" });
      return true;
    },
    resolveSubmission: (
      phase,
      trackingPath,
      context = get().context ?? undefined,
    ) => {
      if (context && context !== get().context) {
        const snapshot = read(context);
        if (phase === "confirmed" && trackingPathIsValid(trackingPath))
          save(context, { ...empty(), trackingPath });
        else if (phase === "rejected")
          save(context, { ...snapshot, pending: null });
        return;
      }
      if (phase === "confirmed" && trackingPathIsValid(trackingPath))
        commit({
          ...empty(),
          trackingPath,
          phase,
          removed: null,
          isCartOpen: false,
        });
      else if (phase === "rejected") commit({ phase, pending: null });
      else commit({ phase: "unknown" });
    },
    totalAmount: () =>
      get().items.reduce(
        (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
        0,
      ) / 100,
    totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
  };
});
