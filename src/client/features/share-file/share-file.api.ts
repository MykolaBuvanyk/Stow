import { apiRequest } from "@/client/shared/api/api-client";
import {
  createShareResponseSchema,
  listSharesResponseSchema,
  type CreateShareRequest,
  type CreateShareResponse,
  type ListSharesResponse,
} from "@/contracts/share.contracts";

export const fileSharesQueryRootKey = ["file-shares"] as const;

export function fileSharesQueryKey(fileId: string) {
  return [...fileSharesQueryRootKey, fileId] as const;
}

export async function getFileShares(fileId: string): Promise<ListSharesResponse> {
  const payload = await apiRequest<unknown>(
    `/api/files/${encodeURIComponent(fileId)}/shares`,
  );

  return listSharesResponseSchema.parse(payload);
}

export async function createFileShare(
  fileId: string,
  input: CreateShareRequest,
): Promise<CreateShareResponse> {
  const payload = await apiRequest<unknown>(
    `/api/files/${encodeURIComponent(fileId)}/shares`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  return createShareResponseSchema.parse(payload);
}

export async function revokeFileShare(
  fileId: string,
  shareId: string,
): Promise<void> {
  await apiRequest<null>(
    `/api/files/${encodeURIComponent(fileId)}/shares/${encodeURIComponent(shareId)}`,
    { method: "DELETE" },
  );
}
