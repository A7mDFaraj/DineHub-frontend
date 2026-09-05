"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search, ShieldCheck, X } from "lucide-react";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { useAccess } from "@/lib/access-context";
import styles from "@/components/admin/business.module.css";
interface Role {
  key: string;
  name: string;
  permissions: string[];
}
interface User {
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
}
const resources: Record<string, string> = {
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
const actions: Record<string, string> = {
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
function message(error: unknown) {
  return axios.isAxiosError(error) &&
    typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "تعذر حفظ التغيير. حاول مجدداً.";
}
function Permissions({
  keys,
  selected,
  onChange,
  disabled = false,
}: {
  keys: string[];
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.permissions}>
      {Object.entries(resources).map(([resource, label]) => {
        const entries = keys.filter((k) => k.startsWith(resource + "."));
        if (!entries.length) return null;
        return (
          <fieldset key={resource} className={styles.group}>
            <legend>{label}</legend>
            {entries.map((key) => (
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
                {actions[key.split(".")[1]]}
              </label>
            ))}
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
}: {
  title: string;
  description: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
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
        <Dialog.Content className={styles.modal} dir="rtl">
          <div className={styles.heading}>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className={styles.button} aria-label="إغلاق">
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
  const { can, access, refresh } = useAccess();
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
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, b, c] = await Promise.all([
        apiClient.get<User[]>("/admin/users"),
        apiClient.get<Branch[]>("/staff/branches"),
        can("access.manage")
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
      setError("تعذر تحميل الفريق. تحقق من الاتصال ثم أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }, [can]);
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
      setNotice("تم حفظ الصلاحيات. تسري على الطلبات التالية مباشرة.");
      await load();
      await refresh();
    } catch (e) {
      setDialogError(message(e));
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
      setNotice("تم حفظ الدور وتحديث صلاحيات أعضائه.");
      await load();
    } catch (e) {
      setDialogError(message(e));
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
      await apiClient.post("/admin/users", {
        name,
        email,
        password,
        role,
        branchId: branch || undefined,
      });
      setCreate(false);
      setPassword("");
      setNotice("تم إنشاء الحساب. يمكنك تخصيص صلاحياته من زر الصلاحيات.");
      await load();
    } catch (e) {
      setDialogError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const allowedKeys = keys.filter((key) => access?.permissions.includes(key));
  return (
    <div className={styles.section}>
      <header className={styles.heading}>
        <div>
          <p className={styles.muted}>إدارة الفريق والصلاحيات</p>
          <h1>كل شخص، والصلاحيات المناسبة لعمله.</h1>
          <p className={styles.muted}>
            استقبال، تنفيذ، إدارة أو دور مخصص لنشاطك.
          </p>
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
              setPassword("");
              setDialogError("");
            }}
          >
            <Plus size={18} />
            إضافة مستخدم
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
            إعادة المحاولة
          </button>
        </div>
      )}
      {can("access.manage") && (
        <section className={styles.panel}>
          <div className={styles.heading}>
            <div>
              <h2>الأدوار</h2>
              <p className={styles.muted}>
                الدور يجمع الصلاحيات؛ وتخصيص المستخدم يغيّر حسابه فقط.
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
              دور جديد
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
                {r.name}
                <small>
                  {(r.key === "admin" || r.key === "unassigned") ? "محمي" : r.permissions.length}
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
            placeholder="ابحث بالاسم أو البريد"
            aria-label="البحث عن مستخدم"
          />
        </label>
        {loading ? (
          <p role="status" className={styles.muted}>
            جارٍ تحميل الفريق…
          </p>
        ) : (
          <ul className={styles.list}>
            {users
              .filter((u) =>
                (u.name + " " + u.email)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((u) => (
                <li className={styles.row} key={u.id}>
                  <div>
                    <strong>{u.name}</strong>
                    <p dir="ltr" className={styles.muted}>
                      {u.email}
                    </p>
                    <small className={styles.muted}>
                      {roles.find((r) => r.key === u.role)?.name ?? u.role} ·{" "}
                      {branches.find((b) => b.id === u.branchId)?.name ??
                        "جميع الفروع"}
                    </small>
                  </div>
                  {can("access.manage") && (
                    <button
                      className={styles.button}
                      onClick={() => openUser(u)}
                      aria-label={`صلاحيات ${u.name}`}
                    >
                      <ShieldCheck size={18} />
                      الصلاحيات
                    </button>
                  )}
                </li>
              ))}
          </ul>
        )}
        {!loading && !users.length && (
          <p className={styles.muted}>لا يوجد أعضاء حتى الآن.</p>
        )}
      </section>
      <Modal
        open={!!target}
        onClose={() => {
          if (!busy) setTarget(null);
        }}
        title={`صلاحيات ${target?.name ?? "المستخدم"}`}
        description="ألغِ تحديد صفحة لمنع عرضها وتحميل بياناتها. الصلاحيات تُطبق على الخادم أيضاً."
      >
        <div className={styles.fields}>
          <label className={styles.field}>
            الدور
            <select
              className={styles.select}
              disabled={busy}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSelected(
                  roles.find((r) => r.key === e.target.value)?.permissions ??
                    [],
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
            الفرع
            <select
              className={styles.select}
              disabled={busy}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">اختر الفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
            استعادة صلاحيات الدور
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={busy}
            onClick={() => void saveUser()}
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : null}حفظ
            الصلاحيات
          </button>
        </div>
      </Modal>
      <Modal
        open={!!roleEdit}
        onClose={() => {
          if (!busy) setRoleEdit(null);
        }}
        title={roleEdit?.key ? "تعديل الدور" : "دور جديد"}
        description="يطبق تعديل الدور على جميع أعضائه، مع الاحتفاظ بتخصيصات كل مستخدم."
      >
        <div className={styles.fields}>
          <label className={styles.field}>
            اسم الدور
            <input
              className={styles.input}
              maxLength={80}
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            رمز الدور
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
          حفظ الدور
        </button>
      </Modal>
      <Modal
        open={create}
        onClose={() => {
          if (!busy) setCreate(false);
        }}
        title="إضافة عضو للفريق"
        description="أنشئ الحساب، ثم خصص صلاحياته إذا احتجت."
      >
        <form onSubmit={createUser} className={styles.fields}>
          {[
            ["الاسم", name, setName, "text"],
            ["البريد الإلكتروني", email, setEmail, "email"],
            ["كلمة المرور", password, setPassword, "password"],
          ].map(([label, value, setter, type]) => (
            <label className={styles.field} key={String(label)}>
              {String(label)}
              <input
                className={styles.input}
                required
                type={String(type)}
                value={String(value)}
                minLength={type === "password" ? 8 : 2}
                onChange={(e) =>
                  (setter as (value: string) => void)(e.target.value)
                }
              />
            </label>
          ))}
          <label className={styles.field}>
            الدور
            <select
              className={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {(roles.length
                ? roles
                : [
                    { key: "staff", name: "فريق التنفيذ" },
                    { key: "cashier", name: "موظف الاستقبال" },
                  ]
              ).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            الفرع
            <select
              className={styles.select}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="">اختر الفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
            {busy ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
