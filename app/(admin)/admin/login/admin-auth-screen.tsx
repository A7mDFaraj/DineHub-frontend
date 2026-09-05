"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ChefHat,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  ReceiptText,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { permissionForPage } from "@/lib/access-context";
import { authClient } from "@/lib/auth-client";
import { reportClientIncident } from "@/lib/observability";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./auth.module.css";

const signInSchema = z.object({
  email: z.email("اكتب بريدًا إلكترونيًا صحيحًا."),
  password: z.string().min(8, "كلمة المرور لا تقل عن 8 أحرف."),
});

type SignInValues = z.infer<typeof signInSchema>;
type AuthError = { code?: string; message?: string };

const SESSION_CONFIRMATION_ATTEMPTS = 3;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function confirmSession() {
  for (let attempt = 0; attempt < SESSION_CONFIRMATION_ATTEMPTS; attempt += 1) {
    const { data } = await authClient.getSession({
      query: { disableCookieCache: true },
      fetchOptions: { cache: "no-store" },
    });

    if (data?.user) {
      return data;
    }

    if (attempt < SESSION_CONFIRMATION_ATTEMPTS - 1) {
      await wait(150 * (attempt + 1));
    }
  }

  return null;
}

async function openAuthenticatedArea() {
  const { data } = await apiClient.get<{ permissions: string[]; mustChangePassword?: boolean }>("/access/me");
  if (data.mustChangePassword) { window.location.replace("/account/password"); return; }
  const destination = [
    "/admin",
    "/staff",
    "/admin/menu",
    "/admin/branches",
    "/admin/categories",
    "/admin/qr-code",
    "/admin/users",
    "/admin/logs",
    "/admin/settings",
  ].find((path) => data.permissions.includes(permissionForPage(path)));
  window.location.replace(destination ?? "/staff");
}

function getAuthError(error: AuthError | null) {
  const message = error?.message?.toLowerCase() ?? "";
  const code = error?.code?.toLowerCase() ?? "";

  if (message.includes("invalid") || code.includes("invalid")) {
    return "البريد أو كلمة المرور غير صحيحة. راجعهما وحاول مرة أخرى.";
  }
  if (
    message.includes("already") ||
    message.includes("exist") ||
    code.includes("user_already_exists")
  ) {
    return "يوجد حساب بهذا البريد بالفعل. انتقل إلى تسجيل الدخول.";
  }
  if (message.includes("password") || code.includes("password")) {
    return "تعذّر قبول كلمة المرور. استخدم 8 أحرف على الأقل وحاول مجددًا.";
  }
  return "تعذّر الاتصال بخدمة الدخول الآن. تحقق من اتصالك ثم حاول مرة أخرى.";
}

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  registration,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputShell} data-invalid={Boolean(error)}>
        <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.7} />
        <input
          {...registration}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          dir="ltr"
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff aria-hidden="true" size={19} />
          ) : (
            <Eye aria-hidden="true" size={19} />
          )}
        </button>
      </div>
      {error ? (
        <p className={styles.fieldError} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SignInForm() {
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setRequestError(null);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });
      if (error) {
        reportClientIncident({
          level: "warn",
          event: "auth.sign_in_rejected",
          message: error.message ?? "Sign-in was rejected",
          metadata: { errorCode: error.code ?? "unknown" },
        });
        setRequestError(getAuthError(error));
        return;
      }

      const session = await confirmSession();
      if (!session) {
        reportClientIncident({
          level: "error",
          event: "auth.session_confirmation_failed",
          message: "Sign-in succeeded but the session could not be confirmed",
          metadata: { flow: "sign-in" },
        });
        setRequestError(
          "تم قبول بيانات الدخول، لكن تعذّر تثبيت الجلسة. حاول مرة أخرى.",
        );
        return;
      }

      await openAuthenticatedArea();
    } catch (error) {
      const reason =
        error instanceof Error
          ? error
          : new Error("Sign-in network request failed");
      reportClientIncident({
        level: "error",
        event: "auth.sign_in_network_error",
        message: reason.message,
        stack: reason.stack,
        metadata: { errorName: reason.name },
      });
      setRequestError(getAuthError(null));
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {requestError ? (
        <div className={styles.formAlert} role="alert">
          <CircleAlert aria-hidden="true" size={19} />
          <p>{requestError}</p>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="sign-in-email">البريد الإلكتروني</label>
        <div className={styles.inputShell} data-invalid={Boolean(errors.email)}>
          <Mail aria-hidden="true" size={19} strokeWidth={1.7} />
          <input
            {...register("email")}
            id="sign-in-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "sign-in-email-error" : undefined}
            dir="ltr"
            placeholder="name@business.com"
          />
        </div>
        {errors.email ? (
          <p className={styles.fieldError} id="sign-in-email-error">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <PasswordField
        id="sign-in-password"
        label="كلمة المرور"
        autoComplete="current-password"
        error={errors.password?.message}
        registration={register("password")}
      />

      <button
        className={styles.submitButton}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className={styles.spinner} aria-hidden="true" size={20} />
            <span>جارٍ الدخول إلى لوحة التحكم…</span>
          </>
        ) : (
          <>
            <span>ادخل إلى الإدارة</span>
            <ArrowLeft aria-hidden="true" size={20} />
          </>
        )}
      </button>
    </form>
  );
}

export function AdminAuthScreen() {
  const isSignIn = true;

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#auth-form">
        انتقل إلى نموذج الدخول
      </a>
      <div className={styles.shell}>
        <section
          className={styles.authPanel}
          id="auth-form"
          aria-labelledby="auth-title"
        >
          <div className={styles.mobileBrand}>
            <Link href="/" aria-label="DineHub، العودة إلى الصفحة الرئيسية">
              <Image src={logo} alt="" width={58} priority />
              <span dir="ltr">DineHub</span>
            </Link>
          </div>

          <div className={styles.authHeader}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              لوحة التحكم
            </p>
            <h1 id="auth-title">
              {isSignIn
                ? "أهلاً بعودتك إلى خط الخدمة."
                : "ابدأ مسار طلباتك من مكان واحد."}
            </h1>
            <p>
              {isSignIn
                ? "أدخل بياناتك لتصل إلى الفروع والقائمة والطلبات."
                : "حساب واحد يربط ما يراه العميل بما يحتاجه فريقك."}
            </p>
          </div>

          <SignInForm />
          <p className={styles.secureNote}>
            <ShieldCheck aria-hidden="true" size={17} />
            جلسة دخول آمنة ومشفّرة
          </p>
        </section>

        <aside
          className={styles.storyPanel}
          aria-label="كيف يربط DineHub رحلة الطلب"
        >
          <Link
            className={styles.brand}
            href="/"
            aria-label="DineHub، الصفحة الرئيسية"
          >
            <Image
              className={styles.logo}
              src={logo}
              alt=""
              width={92}
              priority
            />
            <span dir="ltr">DineHub</span>
          </Link>

          <div className={styles.storyCopy}>
            <p className={styles.liveLabel}>
              <span aria-hidden="true" />
              الإشارة متصلة
            </p>
            <h2>من مسح واحد، يبدأ يوم أوضح.</h2>
            <p>
              نفس المسار الذي يبدأ عند العميل يصل إلى فريقك مرتبًا، ويبقى ظاهرًا
              لك حتى التسليم.
            </p>
          </div>

          <div className={styles.signalScene} aria-hidden="true">
            <div className={styles.signalTrack} />
            <div className={styles.signalPulse} />
            <div className={styles.signalNode} data-step="scan">
              <span>
                <ScanLine size={22} />
              </span>
              <small>يمسح</small>
            </div>
            <div className={styles.signalNode} data-step="order">
              <span>
                <ReceiptText size={22} />
              </span>
              <small>يصل</small>
            </div>
            <div className={styles.signalNode} data-step="ready">
              <span>
                <ChefHat size={22} />
              </span>
              <small>يُجهّز</small>
            </div>
          </div>

          <div className={styles.storyFoot}>
            <span>العميل</span>
            <span>الفريق</span>
            <span>الفروع</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
