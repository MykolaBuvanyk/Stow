import type { Metadata } from "next";

import { RegisterForm } from "@/client/modules/auth/register-form";

export const metadata: Metadata = {
  title: "Реєстрація — Stow",
};

export default function RegisterPage() {
  return (
    <>
      <h1>Створити акаунт</h1>
      <p className="auth-description">
        Файли будуть приватними за замовчуванням.
      </p>
      <RegisterForm />
    </>
  );
}
