import type { NextRequest } from "next/server";

import { fileIdSchema } from "@/contracts/file.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateNoContent } from "@/server/core/http/no-store-response";
import { requireSameOrigin } from "@/server/core/http/require-same-origin";
import { revokeFileShare } from "@/server/modules/files/share-file.service";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/files/[fileId]/shares/[granteeId]">,
) {
  try {
    requireSameOrigin(request);

    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "file-mutation");
    const params = await context.params;
    const parsedFileId = fileIdSchema.safeParse(params.fileId);
    const parsedGranteeId = fileIdSchema.safeParse(params.granteeId);

    if (!parsedFileId.success || !parsedGranteeId.success) {
      throw new ApplicationError(
        "INVALID_SHARE_ID",
        "Некоректний ідентифікатор доступу.",
        400,
      );
    }

    await revokeFileShare(
      user.id,
      parsedFileId.data,
      parsedGranteeId.data,
    );

    return privateNoContent();
  } catch (error) {
    return toErrorResponse(error);
  }
}
