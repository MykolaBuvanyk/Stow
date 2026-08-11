"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createSupabaseBrowserClient } from "@/client/shared/supabase/browser-client";
import {
  registerSchema,
  type RegisterInput,
} from "@/contracts/auth.contracts";

export function RegisterForm() {
  const router = useRouter();
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(
    null,
  );
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      confirmPassword: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setConfirmationMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError("root", {
        message: "Не вдалося створити акаунт. Спробуйте ще раз.",
      });
      return;
    }

    if (!data.session) {
      setConfirmationMessage(
        "Перевірте пошту та підтвердьте реєстрацію за посиланням.",
      );
      return;
    }

    router.replace("/files");
    router.refresh();
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="register-password">Пароль</label>
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="field-error">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="register-confirm-password">Повторіть пароль</label>
        <input
          id="register-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="field-error">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {errors.root ? (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      {confirmationMessage ? (
        <p className="form-success" role="status">
          {confirmationMessage}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Створюємо…" : "Створити акаунт"}
      </button>

      <p className="auth-switch">
        Вже є акаунт? <Link href="/login">Увійти</Link>
      </p>
    </form>
  );
}
