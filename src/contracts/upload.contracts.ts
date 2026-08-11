import { z } from "zod";

import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/config/file-policy";
import { fileSchema } from "@/contracts/file.contracts";

const declaredMimeSchema = z.enum([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const originalNameSchema = z
  .string()
  .trim()
  .min(1, "Назва файлу обов'язкова.")
  .max(255, "Назва файлу занадто довга.")
  .refine(
    (name) => !/[\u0000-\u001f\u007f]/u.test(name),
    "Назва файлу містить недопустимі символи.",
  );

function extensionOf(name: string): string | null {
  const dotIndex = name.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return null;
  }

  return name.slice(dotIndex + 1).toLowerCase();
}

export const reserveUploadRequestSchema = z
  .object({
    originalName: originalNameSchema,
    declaredMime: declaredMimeSchema,
    declaredSize: z
      .number()
      .int()
      .min(1, "Файл не може бути порожнім.")
      .max(MAX_FILE_SIZE_BYTES, "Файл перевищує дозволений розмір."),
  })
  .strict()
  .superRefine(({ originalName, declaredMime }, context) => {
    const extension = extensionOf(originalName);
    const allowedExtensions: readonly string[] =
      ALLOWED_FILE_TYPES[declaredMime];

    if (!extension || !allowedExtensions.includes(extension)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Розширення файлу не відповідає його MIME-типу.",
        path: ["originalName"],
      });
    }
  });

const objectPathSchema = z.string().refine((path) => {
  const parts = path.split("/");

  return (
    parts.length === 2 &&
    parts.every((part) => z.string().uuid().safeParse(part).success)
  );
}, "Некоректний шлях об'єкта.");

export const reserveUploadResponseSchema = z.object({
  fileId: z.string().uuid(),
  path: objectPathSchema,
  token: z.string().min(1),
});

export const finalizeUploadResponseSchema = z.object({
  file: fileSchema,
});

export type ReserveUploadRequest = z.infer<
  typeof reserveUploadRequestSchema
>;
export type ReserveUploadResponse = z.infer<
  typeof reserveUploadResponseSchema
>;
export type FinalizeUploadResponse = z.infer<
  typeof finalizeUploadResponseSchema
>;
