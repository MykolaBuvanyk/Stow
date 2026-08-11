import { z } from "zod";

export const createShareRequestSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Вкажіть email отримувача.")
      .email("Вкажіть коректний email.")
      .transform((email) => email.toLowerCase()),
  })
  .strict();

export const fileShareSchema = z.object({
  shareId: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime({ offset: true }),
});

export const listSharesResponseSchema = z.object({
  items: z.array(fileShareSchema),
});

export const createShareResponseSchema = z.object({
  accepted: z.literal(true),
});

export type CreateShareRequest = z.infer<typeof createShareRequestSchema>;
export type FileShareDto = z.infer<typeof fileShareSchema>;
export type ListSharesResponse = z.infer<typeof listSharesResponseSchema>;
export type CreateShareResponse = z.infer<typeof createShareResponseSchema>;
