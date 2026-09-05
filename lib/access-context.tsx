"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
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
  const refresh = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const { data } = await apiClient.get<Access>("/access/me");
      setAccess(data);
      setError(false);
    } catch {
      setAccess(null);
      setError(true);
    } finally {
      setLoadedUser(session.user.id);
    }
  }, [session?.user.id]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 15000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
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
