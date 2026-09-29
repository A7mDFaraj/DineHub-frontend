"use client";

import { useAccess } from "@/lib/access-context";
import type { ReactNode } from "react";

export function PermissionGate({
  permissions,
  children,
  all = false,
}: {
  permissions: string[];
  children: ReactNode;
  all?: boolean;
}) {
  const { can } = useAccess();
  return (all ? permissions.every(can) : permissions.some(can))
    ? children
    : null;
}
