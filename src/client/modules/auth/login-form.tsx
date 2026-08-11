"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createSupabaseBrowserClient } from "@/client/shared/supabase/browser-client";
import { loginSchema, type LoginInput } from "@/contracts/auth.contracts";

export function LoginForm() {
  const router = useRouter();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("root", {
        message: "Не вдалося увійти. Перевірте email і пароль.",
      });
      return;
    }

    router.replace("/files");
    router.refresh();
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? <p className="field-error">{errors.email.message}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="login-password">Пароль</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="field-error">{errors.password.message}</p>
        ) : null}
      </div>

      {errors.root ? (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Входимо…" : "Увійти"}
      </button>

      <p className="auth-switch">
        Немає акаунта? <Link href="/register">Зареєструватися</Link>
      </p>
    </form>
  );
}
