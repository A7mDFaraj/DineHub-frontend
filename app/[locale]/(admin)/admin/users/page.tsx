"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import styles from "@/components/admin/business.module.css";
interface Role {
  key: string;
  name: string;
  permissions: string[];
}
interface Credential { temporaryPassword: string; expiresAt: string; email: string; }
interface User {
  mustChangePassword?: boolean;
  isBusinessOwner?: boolean;
  isPlatformAdmin?: boolean;
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  permissionGrants: string[];
  permissionDenials: string[];
}
interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}
const defaultResources: Record<string, string> = {
  dashboard: "نظرة عامة",
  analytics: "تحليل الأداء",
  branches: "الفروع",
  categories: "التصنيفات",
  menu: "المنتجات والخدمات",
  tables: "نقاط الطلب و QR",
  users: "المستخدمون",
  access: "إدارة الصلاحيات",
  logs: "سجل النظام",
  orders: "العمليات والطلبات",
  upload: "الصور",
  settings: "الإعدادات",
};
const defaultActions: Record<string, string> = {
  read: "عرض",
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  all: "الوصول لجميع الفروع",
  manage: "إدارة الأدوار والصلاحيات",
  prepare: "قبول وبدء التنفيذ",
  ready: "تحديد جاهزية الطلب",
  deliver: "تأكيد التسليم",
};
function message(error: unknown, fallback: string) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : fallback;
}
function Permissions({
  keys,
  selected,
  onChange,
  disabled = false,
  t,
}: {
  keys: string[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className={styles.permissions}>
      {Object.entries(defaultResources).map(([resource, fallbackLabel]) => {
        const entries = keys.filter((k) => k.startsWith(resource + "."));
        if (!entries.length) return null;
        let label = fallbackLabel;
        try {
          label = t(`resources.${resource}`);
        } catch {
          label = fallbackLabel;
        }
        return (
          <fieldset key={resource} className={styles.group}>
            <legend>{label}</legend>
            {entries.map((key) => {
              const actionKey = key.split(".")[1];
              let actionLabel = defaultActions[actionKey] || actionKey;
              try {
                actionLabel = t(`actions.${actionKey}`) || actionLabel;
              } catch {
                actionLabel = defaultActions[actionKey] || actionKey;
              }
              return (
                <label key={key} className={styles.checkRow}>
                  <input
                    className={styles.check}
                    type="checkbox"
                    disabled={disabled}
                    checked={selected.includes(key)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...selected, key]
                          : selected.filter((k) => k !== key),
                      )
                    }
                  />
                  {actionLabel}
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
function Modal({
  title,
  description,
  open,
  onClose,
  children,
  isRtl,
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isRtl?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.modal} dir={isRtl ? "rtl" : "ltr"}>
          <div className={styles.heading}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className={styles.button} aria-label={isRtl ? "إغلاق" : "Close"}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className={styles.muted}>
            {description}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export default function UsersPage() {
  const t = useTranslations("AdminUsers");
  const tCommon = useTranslations("AdminCommon");
  const locale = useLocale();
  const isRtl = locale !== "en";

  const { can, access, refresh } = useAccess();
  const canManageAccess = can("access.manage");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<User | null>(null);
  const [role, setRole] = useState("staff");
  const [branch, setBranch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [roleEdit, setRoleEdit] = useState<Role | null>(null);
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [create, setCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, b, c] = await Promise.all([
        apiClient.get<User[]>("/admin/users"),
        apiClient.get<Branch[]>("/staff/branches"),
        canManageAccess
          ? apiClient.get<{ roles: Role[]; permissions: string[] }>(
              "/admin/access",
            )
          : Promise.resolve(null),
      ]);
      setUsers(u.data);
      setBranches(b.data);
      setRoles(c?.data.roles ?? []);
      setKeys(c?.data.permissions ?? []);
    } catch {
      setError(isRtl ? "تعذر تحميل الفريق. تحقق من الاتصال ثم أعد المحاولة." : "Failed to load team. Check connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [canManageAccess, isRtl]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const openUser = (user: User) => {
    setTarget(user);
    setRole(user.role);
    setBranch(user.branchId ?? "");
    const base = roles.find((r) => r.key === user.role)?.permissions ?? [];
    setSelected(
      [...new Set([...base, ...user.permissionGrants])].filter(
        (k) => !user.permissionDenials.includes(k),
      ),
    );
    setDialogError("");
  };

  const saveUser = async () => {
    if (!target || busy) return;
    setBusy(true);
    setDialogError("");
    const base = roles.find((r) => r.key === role)?.permissions ?? [];
    try {
      await apiClient.patch(`/admin/access/users/${target.id}`, {
        role,
        branchId: branch || null,
        grants: selected.filter((k) => !base.includes(k)),
        denials: base.filter((k) => !selected.includes(k)),
      });
      setTarget(null);
      setNotice(isRtl ? "تم حفظ الصلاحيات. تسري على الطلبات التالية مباشرة." : "Permissions saved successfully.");
      await load();
      await refresh();
    } catch (e) {
      setDialogError(message(e, isRtl ? "تعذر حفظ التغيير. حاول مجدداً." : "Failed to save changes."));
    } finally {
      setBusy(false);
    }
  };

  const saveRole = async () => {
    if (busy) return;
    setBusy(true);
    setDialogError("");
    try {
      await apiClient.patch(`/admin/access/roles/${roleKey}`, {
        name: roleName,
        permissions: rolePermissions,
      });
      setRoleEdit(null);
      setNotice(isRtl ? "تم حفظ الدور وتحديث صلاحيات أعضائه." : "Role updated successfully.");
      await load();
    } catch (e) {
      setDialogError(message(e, isRtl ? "تعذر حفظ التغيير. حاول مجدداً." : "Failed to save role."));
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setDialogError("");
    try {
      const { data } = await apiClient.post<Credential>("/admin/users", {
        name,
        email,
        role,
        branchId: branch || undefined,
      });
      setCreate(false);
      setCredential({ ...data, email });
      setCopyNotice("");
      setNotice(isRtl ? "تم إنشاء الحساب بنجاح." : "User account created successfully.");
      await load();
    } catch (e) {
      setDialogError(message(e, isRtl ? "تعذر إنشاء الحساب." : "Failed to create user."));
    } finally {
      setBusy(false);
    }
  };

  const allowedKeys = keys.filter((key) => access?.permissions.includes(key));

  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div>
          <p className={styles.muted}>{t("pageDesc")}</p>
          <h1>{t("pageTitle")}</h1>
        </div>
        {can("users.create") && (
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={() => {
              setCreate(true);
              setRole("staff");
              setBranch(branches[0]?.id ?? "");
              setName("");
              setEmail("");
              setDialogError("");
            }}
          >
            <Plus size={18} />
            <span>{t("addUser")}</span>
          </button>
        )}
      </header>

      {notice && (
        <p role="status" className={styles.muted}>
          {notice}
        </p>
      )}

      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button className={styles.button} onClick={() => void load()}>
            {tCommon("retry")}
          </button>
        </div>
      )}

      {can("access.manage") && (
        <section className={styles.panel}>
          <div className={styles.heading}>
            <div>
              <h2>{isRtl ? "الأدوار" : "Roles"}</h2>
              <p className={styles.muted}>
                {isRtl
                  ? "الدور يجمع الصلاحيات؛ وتخصيص المستخدم يغيّر حسابه فقط."
                  : "Roles group permissions together; user overrides affect individual accounts."}
              </p>
            </div>
            <button
              className={styles.button}
              onClick={() => {
                setRoleEdit({ key: "", name: "", permissions: [] });
                setRoleKey("");
                setRoleName("");
                setRolePermissions([]);
                setDialogError("");
              }}
            >
              <Plus size={16} />
              <span>{isRtl ? "دور جديد" : "New Role"}</span>
            </button>
          </div>
          <div className={styles.controls}>
            {roles.map((r) => (
              <button
                key={r.key}
                className={styles.button}
                disabled={r.key === "admin" || r.key === "unassigned"}
                onClick={() => {
                  setRoleEdit(r);
                  setRoleKey(r.key);
                  setRoleName(r.name);
                  setRolePermissions(r.permissions);
                  setDialogError("");
                }}
              >
                <ShieldCheck size={16} />
                <span>{r.name}</span>
                <small>
                  {(r.key === "admin" || r.key === "unassigned") ? (isRtl ? "محمي" : "Protected") : r.permissions.length}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.panel}>
        <label className={styles.controls}>
          <Search size={18} />
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
        </label>
        {loading ? (
          <p role="status" className={styles.muted}>
            {tCommon("loading")}
          </p>
        ) : (
          <ul className={styles.list}>
            {users
              .filter((u) =>
                (u.name + " " + u.email)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((u) => {
                const assignedBranch = branches.find((b) => b.id === u.branchId);
                const branchName = assignedBranch
                  ? (isRtl
                      ? (assignedBranch.nameAr || assignedBranch.name || assignedBranch.nameEn)
                      : (assignedBranch.nameEn || assignedBranch.name || assignedBranch.nameAr))
                  : t("allBranches");
                const roleObj = roles.find((r) => r.key === u.role);
                const roleName = roleObj?.name || u.role;

                return (
                  <li className={styles.row} key={u.id}>
                    <div>
                      <strong>{u.name}</strong>
                      <p dir="ltr" className={styles.muted}>
                        {u.email}
                      </p>
                      <small className={styles.muted}>
                        {roleName} · {branchName}
                      </small>
                    </div>
                    {u.mustChangePassword && (
                      <small>{isRtl ? "بانتظار اختيار كلمة مرور شخصية" : "Password change required on next login"}</small>
                    )}
                    {u.isBusinessOwner && (
                      <small>{t("ownerBadge")}</small>
                    )}
                    {can("access.manage") && !u.isBusinessOwner && !u.isPlatformAdmin && (
                      <button
                        className={styles.button}
                        onClick={() => openUser(u)}
                        aria-label={`${t("editUser")} - ${u.name}`}
                      >
                        <ShieldCheck size={18} />
                        <span>{t("editUser")}</span>
                      </button>
                    )}
                    {u.id !== access?.id && !u.isPlatformAdmin && ((can("access.manage") && !u.isBusinessOwner) || access?.isPlatformAdmin) && (
                      <button className={styles.button} onClick={() => { setResetTarget(u); setDialogError(""); }}>
                        {t("resetPassword")}
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
        {!loading && !users.length && (
          <p className={styles.muted}>{t("emptyTitle")}</p>
        )}
      </section>

      {/* Temporary Credentials Modal */}
      <Modal
        open={!!credential}
        onClose={() => setCredential(null)}
        title={t("modalCredTitle")}
        description={t("modalCredDesc")}
        isRtl={isRtl}
      >
        <p dir="ltr" style={{ fontWeight: 600 }}>{credential?.email}</p>
        <label className={styles.field}>
          {t("tempPasswordLabel")}
          <input
            className={styles.input}
            dir="ltr"
            readOnly
            value={credential?.temporaryPassword ?? ""}
            onFocus={(e) => e.target.select()}
          />
        </label>
        <p className={styles.muted}>
          {credential && t("expiresAt", { time: new Date(credential.expiresAt).toLocaleString(locale) })}
        </p>
        <button
          className={styles.button}
          onClick={async () => {
            if (!credential) return;
            try {
              await navigator.clipboard.writeText(credential.temporaryPassword);
              setCopyNotice(t("copiedNotice"));
            } catch {
              setCopyNotice(isRtl ? "حدد كلمة المرور وانسخها يدوياً." : "Please select and copy manually.");
            }
          }}
        >
          {t("copyPassword")}
        </button>
        {copyNotice && <p role="status" className={styles.muted}>{copyNotice}</p>}
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        open={!!resetTarget}
        onClose={() => { if (!busy) setResetTarget(null); }}
        title={`${t("confirmResetTitle")} - ${resetTarget?.name ?? ""}`}
        description={t("confirmResetDesc", { email: resetTarget?.email ?? "" })}
        isRtl={isRtl}
      >
        {dialogError && <p className={styles.error} role="alert">{dialogError}</p>}
        <button
          className={`${styles.button} ${styles.primary}`}
          disabled={busy}
          onClick={async () => {
            if (!resetTarget || busy) return;
            setBusy(true);
            setDialogError("");
            try {
              const prefix = access?.isPlatformAdmin && resetTarget.isBusinessOwner ? "platform" : "admin";
              const { data } = await apiClient.post<Credential>(`/${prefix}/users/${resetTarget.id}/reset-password`);
              setCredential({ ...data, email: resetTarget.email });
              setCopyNotice("");
              setResetTarget(null);
              await load();
            } catch (e) {
              setDialogError(message(e, isRtl ? "تعذر إعادة تعيين كلمة المرور." : "Failed to reset password."));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? tCommon("loading") : t("resetAction")}
        </button>
      </Modal>

      {/* Edit User Permissions Modal */}
      <Modal
        open={!!target}
        onClose={() => {
          if (!busy) setTarget(null);
        }}
        title={`${t("modalEditTitle")} - ${target?.name ?? ""}`}
        description={t("modalEditDesc")}
        isRtl={isRtl}
      >
        <div className={styles.fields}>
          <label className={styles.field}>
            {t("roleLabel")}
            <select
              className={styles.select}
              disabled={busy}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSelected(
                  roles.find((r) => r.key === e.target.value)?.permissions ?? [],
                );
              }}
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            {t("branchLabel")}
            <select
              className={styles.select}
              disabled={busy}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">{t("noBranch")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {isRtl ? (b.nameAr || b.name || b.nameEn) : (b.nameEn || b.name || b.nameAr)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Permissions
          keys={keys}
          selected={selected}
          onChange={setSelected}
          disabled={busy}
          t={t}
        />
        {dialogError && (
          <p className={styles.error} role="alert">
            {dialogError}
          </p>
        )}
        <div className={styles.row}>
          <button
            className={styles.button}
            disabled={busy}
            onClick={() =>
              setSelected(roles.find((r) => r.key === role)?.permissions ?? [])
            }
          >
            {isRtl ? "استعادة صلاحيات الدور" : "Restore Role Defaults"}
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={busy}
            onClick={() => void saveUser()}
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : null}
            <span>{busy ? t("saving") : tCommon("save")}</span>
          </button>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        open={!!roleEdit}
        onClose={() => {
          if (!busy) setRoleEdit(null);
        }}
        title={roleEdit?.key ? (isRtl ? "تعديل الدور" : "Edit Role") : (isRtl ? "دور جديد" : "New Role")}
        description={isRtl ? "يطبق تعديل الدور على جميع أعضائه، مع الاحتفاظ بتخصيصات كل مستخدم." : "Modifications apply to all role members."}
        isRtl={isRtl}
      >
        <div className={styles.fields}>
          <label className={styles.field}>
            {isRtl ? "اسم الدور" : "Role Name"}
            <input
              className={styles.input}
              maxLength={80}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            {isRtl ? "رمز الدور" : "Role Key"}
            <input
              className={styles.input}
              dir="ltr"
              placeholder="operations"
              disabled={!!roleEdit?.key}
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
              pattern="[a-z][a-z0-9_-]{1,39}"
            />
          </label>
        </div>
        <Permissions
          keys={allowedKeys}
          selected={rolePermissions}
          onChange={setRolePermissions}
          disabled={busy}
          t={t}
        />
        {dialogError && (
          <p className={styles.error} role="alert">
            {dialogError}
          </p>
        )}
        <button
          className={`${styles.button} ${styles.primary}`}
          disabled={
            busy || !roleName.trim() || !/^[a-z][a-z0-9_-]{1,39}$/.test(roleKey)
          }
          onClick={() => void saveRole()}
        >
          {busy ? t("saving") : tCommon("save")}
        </button>
      </Modal>

      {/* Add New User Modal */}
      <Modal
        open={create}
        onClose={() => {
          if (!busy) setCreate(false);
        }}
        title={t("modalAddTitle")}
        description={t("modalAddDesc")}
        isRtl={isRtl}
      >
        <form onSubmit={createUser} className={styles.fields}>
          <label className={styles.field}>
            {t("fullNameLabel")}
            <input
              className={styles.input}
              required
              type="text"
              value={name}
              minLength={2}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            {t("emailLabel")}
            <input
              className={styles.input}
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            {t("roleLabel")}
            <select
              className={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {(roles.length
                ? roles
                : [
                    { key: "staff", name: isRtl ? "فريق التنفيذ" : "Staff" },
                    { key: "cashier", name: isRtl ? "موظف الاستقبال" : "Cashier" },
                  ]
              ).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            {t("branchLabel")}
            <select
              className={styles.select}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">{t("noBranch")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {isRtl ? (b.nameAr || b.name || b.nameEn) : (b.nameEn || b.name || b.nameAr)}
                </option>
              ))}
            </select>
          </label>
          {dialogError && (
            <p role="alert" className={styles.error}>
              {dialogError}
            </p>
          )}
          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={busy}
          >
            {busy ? t("creating") : t("addUser")}
          </button>
        </form>
      </Modal>
    </div>
  );
}
