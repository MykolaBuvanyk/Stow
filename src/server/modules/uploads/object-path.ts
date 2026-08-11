import "server-only";

import { z } from "zod";

const uuidSchema = z.string().uuid();

export function buildObjectPath(ownerId: string, fileId: string): string {
  return `${uuidSchema.parse(ownerId)}/${uuidSchema.parse(fileId)}`;
}
