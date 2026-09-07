"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
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
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import { permissionForPage } from "@/lib/access-context";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { reportClientIncident } from "@/lib/observability";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./auth.module.css";

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

async function openAuthenticatedArea(locale: string) {
  const { data } = await apiClient.get<{ permissions: string[]; mustChangePassword?: boolean }>("/access/me");
  const prefix = locale === "en" ? "/en" : "";
  if (data.mustChangePassword) {
    window.location.replace(prefix + "/account/password");
    return;
  }
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
  window.location.replace(prefix + (destination ?? "/staff"));
}

function getAuthError(error: AuthError | null, t: (key: string) => string) {
  const message = error?.message?.toLowerCase() ?? "";
  const code = error?.code?.toLowerCase() ?? "";

  if (message.includes("invalid") || code.includes("invalid")) {
    return t("errorInvalid");
  }
  if (
    message.includes("already") ||
    message.includes("exist") ||
    code.includes("user_already_exists")
  ) {
    return t("errorExists");
  }
  if (message.includes("password") || code.includes("password")) {
    return t("errorPassword");
  }
  return t("errorNetwork");
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
  const t = useTranslations("AdminLogin");
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
          aria-label={visible ? t("hidePassword") : t("showPassword")}
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
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminLogin");
  const [requestError, setRequestError] = useState<string | null>(null);

  const signInSchema = z.object({
    email: z.string().email(t("valEmail")),
    password: z.string().min(8, t("valPassword")),
  });

  type SignInValues = z.infer<typeof signInSchema>;

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
        setRequestError(getAuthError(error, t));
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
        setRequestError(t("errorSession"));
        return;
      }

      await openAuthenticatedArea(locale);
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
      setRequestError(getAuthError(null, t));
    }
  };

  const SubmitArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      {requestError ? (
        <div className={styles.formAlert} role="alert">
          <CircleAlert aria-hidden="true" size={19} />
          <p>{requestError}</p>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="sign-in-email">{t("emailLabel")}</label>
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
            placeholder={t("emailPlaceholder")}
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
        label={t("passwordLabel")}
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
            <span>{t("submitting")}</span>
          </>
        ) : (
          <>
            <span>{t("submit")}</span>
            <SubmitArrow aria-hidden="true" size={20} />
          </>
        )}
      </button>
    </form>
  );
}

export function AdminAuthScreen() {
  const t = useTranslations("AdminLogin");

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#auth-form">
        {t("skipLink")}
      </a>
      <div className={styles.shell}>
        <section
          className={styles.authPanel}
          id="auth-form"
          aria-labelledby="auth-title"
        >
          <div className={styles.authTopBar}>
            <AdminLanguageSwitcher variant="light" />
          </div>

          <div className={styles.mobileBrand}>
            <Link href="/" aria-label={t("mobileBrandAria")}>
              <Image src={logo} alt="" width={58} priority />
              <span dir="ltr">DineHub</span>
            </Link>
          </div>

          <div className={styles.authHeader}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 id="auth-title">{t("title")}</h1>
            <p>{t("subtitle")}</p>
          </div>

          <SignInForm />
          <p className={styles.secureNote}>
            <ShieldCheck aria-hidden="true" size={17} />
            {t("secureSession")}
          </p>
        </section>

        <aside
          className={styles.storyPanel}
          aria-label={t("storyAria")}
        >
          <Link
            className={styles.brand}
            href="/"
            aria-label="DineHub"
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
              {t("storyLive")}
            </p>
            <h2>{t("storyTitle")}</h2>
            <p>{t("storyDesc")}</p>
          </div>

          <div className={styles.signalScene} aria-hidden="true">
            <div className={styles.signalTrack} />
            <div className={styles.signalPulse} />
            <div className={styles.signalNode} data-step="scan">
              <span>
                <ScanLine size={22} />
              </span>
              <small>{t("stepScan")}</small>
            </div>
            <div className={styles.signalNode} data-step="order">
              <span>
                <ReceiptText size={22} />
              </span>
              <small>{t("stepReceive")}</small>
            </div>
            <div className={styles.signalNode} data-step="ready">
              <span>
                <ChefHat size={22} />
              </span>
              <small>{t("stepPrep")}</small>
            </div>
          </div>

          <div className={styles.storyFoot}>
            <span>{t("footCustomer")}</span>
            <span>{t("footTeam")}</span>
            <span>{t("footBranches")}</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
