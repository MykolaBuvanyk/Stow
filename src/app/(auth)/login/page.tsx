import type { Metadata } from "next";

import { LoginForm } from "@/client/modules/auth/login-form";

export const metadata: Metadata = {
  title: "Вхід — Stow",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const { confirmation } = await searchParams;

  return (
    <>
      <h1>Увійти в Stow</h1>
      <p className="auth-description">Ваше приватне сховище файлів.</p>
      {confirmation === "failed" ? (
        <p className="form-error" role="alert">
          Посилання підтвердження недійсне або вже застаріло.
        </p>
      ) : null}
      <LoginForm />
    </>
  );
}
