import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Вкажіть email")
  .email("Вкажіть коректний email");

const passwordSchema = z
  .string()
  .min(8, "Пароль повинен містити щонайменше 8 символів")
  .max(72, "Пароль не повинен перевищувати 72 символи");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Вкажіть пароль"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Повторіть пароль"),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Паролі не збігаються",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
