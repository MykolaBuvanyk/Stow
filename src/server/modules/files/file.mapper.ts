import "server-only";

import {
  fileSchema,
  fileStatusSchema,
  type FileDto,
} from "@/contracts/file.contracts";
import type { Tables } from "@/server/infrastructure/supabase/database.types";

type FileRow = Tables<"files">;

export function toFileDto(row: FileRow, viewerId: string): FileDto {
  return fileSchema.parse({
    id: row.id,
    originalName: row.original_name,
    sizeBytes: row.size_bytes,
    contentType: row.content_type,
    status: fileStatusSchema.parse(row.status),
    access: row.owner_id === viewerId ? "owner" : "shared",
    createdAt: row.created_at,
    finalizedAt: row.finalized_at,
  });
}
