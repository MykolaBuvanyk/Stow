import type { NextRequest } from "next/server";

import type { DownloadResponse } from "@/contracts/download.contracts";
import { fileIdSchema } from "@/contracts/file.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { prepareFileDownload } from "@/server/modules/files/create-download.service";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/files/[fileId]/download">,
) {
  try {
    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "file-download");

    const { fileId: rawFileId } = await context.params;
    const parsedFileId = fileIdSchema.safeParse(rawFileId);

    if (!parsedFileId.success) {
      throw new ApplicationError(
        "INVALID_FILE_ID",
        "Некоректний ідентифікатор файлу.",
        400,
      );
    }

    const result = await prepareFileDownload(parsedFileId.data);

    return privateJson<DownloadResponse>(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
