import { z } from "zod";

export const downloadResponseSchema = z.object({
  signedUrl: z.string().url(),
  expiresIn: z.number().int().positive(),
});

export type DownloadResponse = z.infer<typeof downloadResponseSchema>;
