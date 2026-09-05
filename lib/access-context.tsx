"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
const pagePermissions: Record<string, string> = {
  "/admin": "dashboard.read",
  "/admin/branches": "branches.read",
  "/admin/categories": "categories.read",
  "/admin/menu": "menu.read",
  "/admin/qr-code": "tables.read",
  "/admin/users": "users.read",
  "/admin/logs": "logs.read",
  "/admin/settings": "settings.read",
  "/staff": "orders.read",
};
export function permissionForPage(path: string) {
  return pagePermissions[path];
}
type Access = {
  permissions: string[];
  branchId?: string | null;
  role?: string;
};
const Context = createContext<{
  access: Access | null;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  can: (key: string) => boolean;
}>({
  access: null,
  loading: true,
  error: false,
  refresh: async () => {},
  can: () => false,
});
export function AccessProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const [access, setAccess] = useState<Access | null>(null);
  const [loadedUser, setLoadedUser] = useState("");
  const [error, setError] = useState(false);
  const inFlight = useRef<{ userId: string; controller: AbortController } | null>(null);
  const lastRefresh = useRef(0);
  const lastSuccessfulUser = useRef("");
  const refresh = useCallback(async () => {
    if (!session?.user.id || inFlight.current?.userId === session.user.id) return;
    inFlight.current?.controller.abort();
    const current = { userId: session.user.id, controller: new AbortController() };
    inFlight.current = current;
    try {
      const { data } = await apiClient.get<Access>("/access/me", { signal: current.controller.signal });
      if (inFlight.current !== current) return;
      setAccess((previous) => previous && previous.role === data.role && previous.branchId === data.branchId && previous.permissions.length === data.permissions.length && previous.permissions.every((key) => data.permissions.includes(key)) ? previous : data);
      lastSuccessfulUser.current = current.userId;
      setError(false);
    } catch (error) {
      if (inFlight.current !== current || current.controller.signal.aborted) return;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      // A network interruption must not tear down an already loaded page.
      // Explicit access rejection still removes protected content immediately.
      if (status === 401 || status === 403 || lastSuccessfulUser.current !== current.userId) {
        setAccess(null);
        setError(true);
      }
    } finally {
      if (inFlight.current === current) {
        inFlight.current = null;
        lastRefresh.current = Date.now();
        setLoadedUser(current.userId);
      }
    }
  }, [session?.user.id]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    const visible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current >= 60000) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      inFlight.current?.controller.abort();
      inFlight.current = null;
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const loading = isPending || (!!session && loadedUser !== session.user.id);
  const can = useCallback(
    (key: string) => !loading && !!access?.permissions.includes(key),
    [loading, access],
  );
  return (
    <Context.Provider
      value={{ access: loading ? null : access, loading, error, refresh, can }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAccess = () => useContext(Context);
