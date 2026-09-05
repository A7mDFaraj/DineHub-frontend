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

export interface Branch {
  publicCode?: string;
  id: string;
  name?: string;
  nameEn?: string;
  nameAr?: string;
  address?: string;
  addressEn?: string;
  addressAr?: string;
  phone?: string;
  logoUrl?: string;
  themeColor?: string;
}

interface AdminBranchContextType {
  branches: Branch[];
  selectedBranchId: string;
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: string) => void;
  isLoadingBranches: boolean;
  branchError: string;
  refreshBranches: () => Promise<Branch[]>;
}

const STORAGE_KEY = "dinehub_admin_selected_branch_id";

const AdminBranchContext = createContext<AdminBranchContextType | undefined>(
  undefined,
);

export function AdminBranchProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState<string>("");
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [branchError, setBranchError] = useState("");

  const refreshBranches = useCallback(async (): Promise<Branch[]> => {
    try {
      setIsLoadingBranches(true);
      setBranchError("");
      const { data } = await apiClient.get("/staff/branches");
      const list: Branch[] = Array.isArray(data)
        ? data
        : data?.data || data?.branches || [];
      setBranches(list);

      // Resolve selected branch id with local storage preference
      if (list.length > 0) {
        let storedId: string | null = null;
        try {
          storedId = localStorage.getItem(STORAGE_KEY);
        } catch {
          // Ignore localStorage errors
        }

        const validStored = storedId && list.some((b) => b.id === storedId);
        const resolvedId = validStored
          ? (storedId as string)
          : list[0].id;

        setSelectedBranchIdState(resolvedId);
        try {
          localStorage.setItem(STORAGE_KEY, resolvedId);
        } catch {
          // Ignore
        }
      } else {
        setSelectedBranchIdState("");
      }
      return list;
    } catch (err: unknown) {
      console.error("Failed to fetch admin branches:", err);
      setBranchError("تعذر جلب بيانات الفروع. يرجى المحاولة مرة أخرى.");
      return [];
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refreshBranches(), 0);
    return () => clearTimeout(timer);
  }, [refreshBranches]);

  const setSelectedBranchId = useCallback((id: string) => {
    setSelectedBranchIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Ignore
    }
  }, []);

  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ||
    (branches.length > 0 ? branches[0] : null);

  return (
    <AdminBranchContext.Provider
      value={{
        branches,
        selectedBranchId,
        selectedBranch,
        setSelectedBranchId,
        isLoadingBranches,
        branchError,
        refreshBranches,
      }}
    >
      {children}
    </AdminBranchContext.Provider>
  );
}

export function useAdminBranch() {
  const context = useContext(AdminBranchContext);
  if (!context) {
    throw new Error(
      "useAdminBranch must be used within an AdminBranchProvider",
    );
  }
  return context;
}
