"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { GlassSelect } from "./glass-select";
import styles from "./users.module.css";

type Role = "admin" | "cashier";

interface Branch {
  id: string;
  name: string;
}

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
  branch: Branch | null;
  createdAt: string;
}

interface UserDraft {
  role: Role;
  branchId: string;
}

const createUserSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسمًا من حرفين على الأقل.").max(120, "الاسم طويل جدًا."),
  email: z.email("اكتب بريدًا إلكترونيًا صحيحًا."),
  password: z.string().min(8, "كلمة المرور لا تقل عن 8 أحرف.").max(128, "كلمة المرور طويلة جدًا."),
  role: z.enum(["admin", "cashier"]),
  branchId: z.string(),
}).superRefine((values, context) => {
  if (values.role === "cashier" && !values.branchId) {
    context.addIssue({
      code: "custom",
      path: ["branchId"],
      message: "اختر الفرع الذي سيستقبل الكاشير طلباته.",
    });
  }
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type RoleFilter = "all" | Role;

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s\p{P}\p{S}]+/gu, " ")
    .trim();
}

function readList<T>(data: unknown, key: "users" | "branches"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

function getRequestMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string") {
    const normalized = message.toLowerCase();
    if (normalized.includes("already") || normalized.includes("exist")) {
      return "يوجد حساب بهذا البريد بالفعل.";
    }
    if (normalized.includes("one admin") || normalized.includes("admin account must remain")) {
      return "لا يمكن تحويل آخر مدير إلى كاشير. يجب أن يبقى مدير واحد على الأقل.";
    }
    if (normalized.includes("assigned to a branch")) {
      return "يجب تعيين فرع للكاشير قبل الحفظ.";
    }
    if (normalized.includes("branch") && normalized.includes("not exist")) {
      return "الفرع المختار لم يعد موجودًا. حدّث الصفحة واختر فرعًا آخر.";
    }
    return message;
  }
  return fallback;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "؟";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function userDraft(user: ManagedUser): UserDraft {
  return { role: user.role, branchId: user.branchId ?? "" };
}

function sameDraft(user: ManagedUser, draft: UserDraft) {
  return user.role === draft.role
    && (draft.role === "admin" || (user.branchId ?? "") === draft.branchId);
}

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savedUserId, setSavedUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "cashier",
      branchId: "",
    },
  });

  const newUserRole = watch("role");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [usersResponse, branchesResponse] = await Promise.all([
        apiClient.get("/admin/users"),
        apiClient.get("/admin/branches"),
      ]);
      const userList = readList<ManagedUser>(usersResponse.data, "users");
      const branchList = readList<Branch>(branchesResponse.data, "branches");
      setUsers(userList);
      setBranches(branchList);
      setDrafts(Object.fromEntries(userList.map((user) => [user.id, userDraft(user)])));
      if (branchList[0]) setValue("branchId", branchList[0].id);
    } catch (error) {
      setLoadError(getRequestMessage(error, "تعذّر تحميل المستخدمين والفروع. تحقق من الاتصال ثم أعد المحاولة."));
    } finally {
      setIsLoading(false);
    }
  }, [setValue]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const admins = users.filter((user) => user.role === "admin").length;
    const cashiers = users.filter((user) => user.role === "cashier");
    return {
      total: users.length,
      admins,
      cashiers: cashiers.length,
      assigned: cashiers.filter((user) => Boolean(user.branchId)).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const searchTerms = normalizeSearchText(query).split(" ").filter(Boolean);

    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const searchableText = normalizeSearchText([
        user.name,
        user.email,
        user.role,
        user.role === "admin" ? "مدير ادمن" : "كاشير موظف",
        user.branch?.name ?? "",
      ].join(" "));
      const matchesQuery = searchTerms.every((term) => searchableText.includes(term));

      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  const updateDraft = (user: ManagedUser, change: Partial<UserDraft>) => {
    setDrafts((current) => {
      const next = { ...(current[user.id] ?? userDraft(user)), ...change };
      if (change.role === "admin") next.branchId = "";
      return { ...current, [user.id]: next };
    });
    setRowErrors((current) => ({ ...current, [user.id]: "" }));
    setSavedUserId((current) => current === user.id ? null : current);
  };

  const saveUser = async (user: ManagedUser) => {
    const draft = drafts[user.id] ?? userDraft(user);
    if (draft.role === "cashier" && !draft.branchId) {
      setRowErrors((current) => ({ ...current, [user.id]: "اختر فرعًا للكاشير قبل الحفظ." }));
      return;
    }

    setSavingUserId(user.id);
    setRowErrors((current) => ({ ...current, [user.id]: "" }));
    try {
      const { data } = await apiClient.patch<ManagedUser>(`/admin/users/${user.id}/role`, {
        role: draft.role,
        branchId: draft.role === "cashier" ? draft.branchId : null,
      });
      setUsers((current) => current.map((entry) => entry.id === user.id ? data : entry));
      setDrafts((current) => ({ ...current, [user.id]: userDraft(data) }));
      setSavedUserId(user.id);
      setNotice(`تم تحديث صلاحيات ${data.name}.`);

      if (session?.user.id === user.id && data.role === "cashier") {
        router.replace("/staff");
        router.refresh();
      }
    } catch (error) {
      setRowErrors((current) => ({
        ...current,
        [user.id]: getRequestMessage(error, "تعذّر حفظ التغيير. حاول مرة أخرى."),
      }));
    } finally {
      setSavingUserId(null);
    }
  };

  const openCreateDialog = () => {
    reset({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      branchId: branches[0]?.id ?? "",
    });
    setCreateError(null);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const createUser = async (values: CreateUserValues) => {
    setCreateError(null);
    try {
      const { data } = await apiClient.post<ManagedUser>("/admin/users", {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
        branchId: values.role === "cashier" ? values.branchId : undefined,
      });
      setUsers((current) => [data, ...current]);
      setDrafts((current) => ({ ...current, [data.id]: userDraft(data) }));
      setDialogOpen(false);
      setNotice(`تم إنشاء حساب ${data.name}. يمكنه تسجيل الدخول بكلمة المرور المؤقتة.`);
      reset();
    } catch (error) {
      setCreateError(getRequestMessage(error, "تعذّر إنشاء الحساب. راجع البيانات وحاول مرة أخرى."));
    }
  };

  if (isLoading) {
    return (
      <section className={styles.statePanel} aria-busy="true">
        <Loader2 className={styles.spinner} aria-hidden="true" size={28} />
        <h1>نرتّب أعضاء الفريق…</h1>
        <p>نحمّل الحسابات والفروع المتاحة.</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.statePanel} role="alert">
        <CircleAlert aria-hidden="true" size={28} />
        <h1>تعذّر فتح إدارة المستخدمين</h1>
        <p>{loadError}</p>
        <button type="button" onClick={() => void loadData()}>إعادة المحاولة</button>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.liveRegion} aria-live="polite">{notice}</div>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true" />إدارة الفريق والصلاحيات</p>
          <h1>ضع كل شخص في مساره الصحيح.</h1>
          <p>أنشئ حسابات الفريق، وحدد من يدير النظام ومن يستقبل طلبات فرعه فقط.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreateDialog}>
          <UserPlus aria-hidden="true" size={19} />
          <span>إضافة مستخدم</span>
        </button>
      </header>

      <section className={styles.summaryGrid} aria-label="ملخص المستخدمين">
        <article><span><UsersRound aria-hidden="true" size={20} /></span><small>إجمالي المستخدمين</small><strong>{stats.total}</strong><p>كل الحسابات المسجلة</p></article>
        <article><span><ShieldCheck aria-hidden="true" size={20} /></span><small>المديرون</small><strong>{stats.admins}</strong><p>وصول كامل للإدارة</p></article>
        <article><span><WalletCards aria-hidden="true" size={20} /></span><small>موظفو الكاشير</small><strong>{stats.cashiers}</strong><p>وصول إلى شاشة الطلبات</p></article>
        <article data-tone="ready"><span><Check aria-hidden="true" size={20} /></span><small>كاشير مرتبط بفرع</small><strong>{stats.assigned}</strong><p>جاهزون لاستقبال الطلبات</p></article>
      </section>

      <section className={styles.usersPanel} aria-labelledby="users-list-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="users-list-title">أعضاء الفريق</h2>
            <p>
              غيّر الدور والفرع، ثم احفظ التعديل لكل حساب.
              <span className={styles.resultsCount} role="status" aria-live="polite" aria-atomic="true">
                {query.trim() || roleFilter !== "all"
                  ? `عرض ${filteredUsers.length} من ${users.length}`
                  : `${users.length} حسابات`}
              </span>
            </p>
          </div>
          <div className={styles.filters}>
            <div className={styles.searchField}>
              <label className={styles.srOnly} htmlFor="users-search">ابحث في المستخدمين</label>
              <Search aria-hidden="true" size={18} />
              <input
                id="users-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="اسم، بريد، دور أو فرع"
                type="search"
                dir="auto"
                autoComplete="off"
                spellCheck={false}
                aria-controls="users-results"
              />
              {query ? (
                <button
                  className={styles.searchClear}
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="مسح البحث"
                >
                  <X aria-hidden="true" size={17} />
                </button>
              ) : null}
            </div>
            <div className={styles.filterField}>
              <span className={styles.srOnly}>صفّ المستخدمين حسب الدور</span>
              <GlassSelect
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                ariaLabel="صفّ المستخدمين حسب الدور"
                className={styles.filterSelect}
                options={[
                  { value: "all", label: "كل الأدوار" },
                  { value: "admin", label: "المديرون" },
                  { value: "cashier", label: "الكاشير" },
                ]}
              />
            </div>
          </div>
        </div>

        <div className={styles.columnLabels} aria-hidden="true">
          <span>المستخدم</span><span>الدور</span><span>الفرع</span><span>الحفظ</span>
        </div>

        <div id="users-results">
          {filteredUsers.length ? (
            <div className={styles.userList}>
            {filteredUsers.map((user) => {
              const draft = drafts[user.id] ?? userDraft(user);
              const isLastAdmin = user.role === "admin" && stats.admins === 1;
              const isSaving = savingUserId === user.id;
              const unchanged = sameDraft(user, draft);
              return (
                <article className={styles.userRow} key={user.id}>
                  <div className={styles.identity}>
                    <span aria-hidden="true">{initials(user.name)}</span>
                    <div><strong>{user.name}</strong><small dir="ltr">{user.email}</small><time dateTime={user.createdAt}>انضم {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(user.createdAt))}</time></div>
                  </div>

                  <div className={styles.rowField}>
                    <span>الدور</span>
                    <GlassSelect
                      value={draft.role}
                      onValueChange={(value) => updateDraft(user, { role: value as Role })}
                      ariaLabel={`دور ${user.name}`}
                      className={styles.rowSelect}
                      options={[
                        { value: "admin", label: "مدير" },
                        { value: "cashier", label: "كاشير", disabled: isLastAdmin },
                      ]}
                    />
                    <small className={styles.fieldHint}>
                      {isLastAdmin
                        ? "آخر مدير • وصول كامل"
                        : draft.role === "admin"
                          ? "وصول كامل للإدارة"
                          : "وصول لطلبات الفرع"}
                    </small>
                  </div>

                  <div className={styles.rowField}>
                    <span>الفرع</span>
                    <GlassSelect
                      value={draft.branchId}
                      onValueChange={(value) => updateDraft(user, { branchId: value })}
                      disabled={draft.role === "admin"}
                      ariaLabel={`فرع ${user.name}`}
                      className={styles.rowSelect}
                      options={[
                        { value: "", label: "اختر فرعًا" },
                        ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
                      ]}
                    />
                    <small className={styles.fieldHint}>
                      {draft.role === "admin" ? "يرى جميع الفروع" : "يستقبل طلبات هذا الفرع"}
                    </small>
                  </div>

                  <div className={styles.saveCell}>
                    <button
                      type="button"
                      onClick={() => void saveUser(user)}
                      disabled={unchanged || isSaving || (draft.role === "cashier" && !draft.branchId)}
                    >
                      {isSaving ? <Loader2 className={styles.spinner} aria-hidden="true" size={17} /> : savedUserId === user.id && unchanged ? <Check aria-hidden="true" size={17} /> : null}
                      <span>{isSaving ? "جارٍ الحفظ" : savedUserId === user.id && unchanged ? "محفوظ" : unchanged ? "لا تغيير" : "حفظ"}</span>
                    </button>
                  </div>
                  {rowErrors[user.id] ? <p className={styles.rowError} role="alert"><CircleAlert aria-hidden="true" size={16} />{rowErrors[user.id]}</p> : null}
                </article>
              );
            })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <UsersRound aria-hidden="true" size={28} />
              <h3>{users.length ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون بعد"}</h3>
              <p>{users.length ? "جرّب اسمًا أو بريدًا أو دورًا أو فرعًا مختلفًا." : "أنشئ أول حساب لفريق التشغيل."}</p>
              {users.length && (query || roleFilter !== "all") ? (
                <button
                  className={styles.resetFiltersButton}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter("all");
                  }}
                >
                  عرض جميع المستخدمين
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl" aria-describedby="create-user-description">
            <div className={styles.dialogHeader}>
              <div><Dialog.Title>إضافة مستخدم جديد</Dialog.Title><Dialog.Description id="create-user-description">أنشئ الحساب الآن، ثم أرسل بيانات الدخول المؤقتة لصاحب الحساب بطريقة آمنة.</Dialog.Description></div>
              <Dialog.Close asChild><button type="button" aria-label="إغلاق"><X aria-hidden="true" size={20} /></button></Dialog.Close>
            </div>

            <form onSubmit={handleSubmit(createUser)} noValidate>
              {createError ? <div className={styles.formError} role="alert"><CircleAlert aria-hidden="true" size={18} /><p>{createError}</p></div> : null}

              <div className={styles.formGrid}>
                <label className={styles.formField}>
                  <span>الاسم الكامل</span>
                  <input {...register("name")} autoComplete="name" aria-invalid={Boolean(errors.name)} placeholder="مثال: سارة محمد" />
                  {errors.name ? <small>{errors.name.message}</small> : null}
                </label>
                <label className={styles.formField}>
                  <span>البريد الإلكتروني</span>
                  <input {...register("email")} type="email" inputMode="email" autoComplete="off" dir="ltr" aria-invalid={Boolean(errors.email)} placeholder="cashier@restaurant.com" />
                  {errors.email ? <small>{errors.email.message}</small> : null}
                </label>
                <label className={`${styles.formField} ${styles.fullField}`}>
                  <span>كلمة المرور المؤقتة</span>
                  <div className={styles.passwordField}>
                    <input {...register("password")} type={showPassword ? "text" : "password"} autoComplete="new-password" dir="ltr" aria-invalid={Boolean(errors.password)} />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword}>
                      {showPassword ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}
                    </button>
                  </div>
                  {errors.password ? <small>{errors.password.message}</small> : <em>8 أحرف على الأقل. لن تظهر كلمة المرور هنا بعد إنشاء الحساب.</em>}
                </label>
                <label className={styles.formField}>
                  <span>الدور</span>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <GlassSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        ariaLabel="دور المستخدم الجديد"
                        className={styles.formSelect}
                        options={[
                          { value: "cashier", label: "كاشير — طلبات الفرع فقط" },
                          { value: "admin", label: "مدير — وصول كامل" },
                        ]}
                      />
                    )}
                  />
                </label>
                {newUserRole === "cashier" ? (
                  <label className={styles.formField}>
                    <span>الفرع المعيّن</span>
                    <Controller
                      control={control}
                      name="branchId"
                      render={({ field }) => (
                        <GlassSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          ariaLabel="الفرع المعيّن للمستخدم الجديد"
                          className={styles.formSelect}
                          invalid={Boolean(errors.branchId)}
                          disabled={!branches.length}
                          options={[
                            { value: "", label: "اختر فرعًا" },
                            ...branches.map((branch) => ({ value: branch.id, label: branch.name })),
                          ]}
                        />
                      )}
                    />
                    {errors.branchId ? <small>{errors.branchId.message}</small> : !branches.length ? <small>أنشئ فرعًا أولًا قبل إضافة كاشير.</small> : null}
                  </label>
                ) : (
                  <div className={styles.adminAccessNote}><ShieldCheck aria-hidden="true" size={19} /><p><strong>وصول المدير</strong><span>يرى كل الفروع ولا يحتاج إلى تعيين فرع.</span></p></div>
                )}
              </div>

              <div className={styles.dialogActions}>
                <Dialog.Close asChild><button type="button" className={styles.secondaryButton}>إلغاء</button></Dialog.Close>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting || (newUserRole === "cashier" && !branches.length)}>
                  {isSubmitting ? <Loader2 className={styles.spinner} aria-hidden="true" size={18} /> : <UserPlus aria-hidden="true" size={18} />}
                  <span>{isSubmitting ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}</span>
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
