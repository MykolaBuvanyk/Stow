import type { NextRequest } from "next/server";

import { fileIdSchema } from "@/contracts/file.contracts";
import {
  createShareRequestSchema,
  type CreateShareResponse,
  type ListSharesResponse,
} from "@/contracts/share.contracts";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { parseJsonBody } from "@/server/core/http/parse-json-body";
import { requireSameOrigin } from "@/server/core/http/require-same-origin";
import {
  getFileShares,
  shareFileWithEmail,
} from "@/server/modules/files/share-file.service";

async function parseFileId(
  context: RouteContext<"/api/files/[fileId]/shares">,
): Promise<string> {
  const { fileId: rawFileId } = await context.params;
  const parsedFileId = fileIdSchema.safeParse(rawFileId);

  if (!parsedFileId.success) {
    throw new ApplicationError(
      "INVALID_FILE_ID",
      "Некоректний ідентифікатор файлу.",
      400,
    );
  }

  return parsedFileId.data;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/files/[fileId]/shares">,
) {
  try {
    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "file-share");
    const fileId = await parseFileId(context);
    const result = await getFileShares(user.id, fileId);

    return privateJson<ListSharesResponse>(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/files/[fileId]/shares">,
) {
  try {
    requireSameOrigin(request);

    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "file-share");
    const fileId = await parseFileId(context);
    const parsedBody = createShareRequestSchema.safeParse(
      await parseJsonBody(request),
    );

    if (!parsedBody.success) {
      throw new ApplicationError(
        "INVALID_SHARE_RECIPIENT",
        parsedBody.error.issues[0]?.message ?? "Некоректний отримувач.",
        400,
      );
    }

    const result = await shareFileWithEmail(
      user.id,
      user.email,
      fileId,
      parsedBody.data.email,
    );

    return privateJson<CreateShareResponse>(result, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
