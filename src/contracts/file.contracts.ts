import { z } from "zod";

export const fileStatusSchema = z.enum(["pending", "ready", "rejected"]);
export const fileAccessSchema = z.enum(["owner", "shared"]);
export const fileIdSchema = z.string().uuid();

export const fileSchema = z.object({
  id: fileIdSchema,
  originalName: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative().nullable(),
  contentType: z.string().min(1).nullable(),
  status: fileStatusSchema,
  access: fileAccessSchema,
  createdAt: z.string().datetime({ offset: true }),
  finalizedAt: z.string().datetime({ offset: true }).nullable(),
});

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(25),
});

export const listFilesResponseSchema = z.object({
  items: z.array(fileSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type FileDto = z.infer<typeof fileSchema>;
export type FileStatus = z.infer<typeof fileStatusSchema>;
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;
export type ListFilesResponse = z.infer<typeof listFilesResponseSchema>;
