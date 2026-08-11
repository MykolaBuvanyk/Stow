import type { NextRequest } from "next/server";

import { fileIdSchema } from "@/contracts/file.contracts";
import type { FinalizeUploadResponse } from "@/contracts/upload.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { requireSameOrigin } from "@/server/core/http/require-same-origin";
import { finalizeUpload } from "@/server/modules/uploads/finalize-upload.service";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/uploads/[fileId]/finalize">,
) {
  try {
    requireSameOrigin(request);

    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "upload-finalize");
    const { fileId: rawFileId } = await context.params;
    const parsedFileId = fileIdSchema.safeParse(rawFileId);

    if (!parsedFileId.success) {
      throw new ApplicationError(
        "INVALID_FILE_ID",
        "Некоректний ідентифікатор файлу.",
        400,
      );
    }

    const result = await finalizeUpload(user.id, parsedFileId.data);

    return privateJson<FinalizeUploadResponse>(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
