import type { NextRequest } from "next/server";

import { fileIdSchema } from "@/contracts/file.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateNoContent } from "@/server/core/http/no-store-response";
import { requireSameOrigin } from "@/server/core/http/require-same-origin";
import { deleteFile } from "@/server/modules/files/delete-file.service";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/files/[fileId]">,
) {
  try {
    requireSameOrigin(request);

    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "file-mutation");
    const { fileId: rawFileId } = await context.params;
    const parsedFileId = fileIdSchema.safeParse(rawFileId);

    if (!parsedFileId.success) {
      throw new ApplicationError(
        "INVALID_FILE_ID",
        "Некоректний ідентифікатор файлу.",
        400,
      );
    }

    await deleteFile(user.id, parsedFileId.data);

    return privateNoContent();
  } catch (error) {
    return toErrorResponse(error);
  }
}
