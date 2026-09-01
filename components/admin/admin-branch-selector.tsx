"use client";

import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { useAdminBranch } from "@/lib/admin-branch-context";

interface AdminBranchSelectorProps {
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function AdminBranchSelector({
  className,
  label = "الفرع الحالي",
  showLabel = true,
}: AdminBranchSelectorProps) {
  const {
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isLoadingBranches,
  } = useAdminBranch();

  if (isLoadingBranches && branches.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderRadius: "14px",
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(223, 210, 235, 0.12)",
          color: "#b9aebd",
          fontSize: "0.82rem",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
        className={className}
      >
        <Loader2 size={15} className="animate-spin" style={{ color: "#47aaa1" }} />
        <span>جلب الفروع…</span>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 14px",
          borderRadius: "14px",
          background: "rgba(242, 100, 75, 0.08)",
          border: "1px solid rgba(242, 100, 75, 0.2)",
          color: "#ff9d8c",
          fontSize: "0.82rem",
          fontWeight: 600,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
        className={className}
      >
        <Building2 size={15} />
        <span>لا توجد فروع معرفة</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
      className={className}
    >
      {showLabel && (
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 650,
            color: "#b9aebd",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {label}:
        </span>
      )}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          flex: "1 1 auto",
          minWidth: 0,
          width: "100%",
          background: "rgba(34, 24, 42, 0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(223, 210, 235, 0.16)",
          borderRadius: "14px",
          padding: "0 34px 0 12px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
          transition: "all 150ms ease",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#47aaa1",
            marginInlineEnd: "8px",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Building2 size={16} strokeWidth={1.9} />
        </span>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          aria-label={label}
          style={{
            width: "100%",
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            border: "none",
            color: "#fffdf9",
            fontSize: "0.85rem",
            fontWeight: 700,
            fontFamily: "inherit",
            padding: "10px 0",
            cursor: "pointer",
            outline: "none",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {branches.map((b) => {
            const displayName =
              b.nameAr || b.name || b.nameEn || "فرع غير مسمى";
            return (
              <option
                key={b.id}
                value={b.id}
                style={{
                  background: "#22182a",
                  color: "#fffdf9",
                  fontSize: "0.9rem",
                  padding: "10px",
                }}
              >
                {displayName}
              </option>
            );
          })}
        </select>

        <span
          style={{
            position: "absolute",
            insetInlineEnd: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#b9aebd",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
          }}
          aria-hidden="true"
        >
          <ChevronDown size={15} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}
