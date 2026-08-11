import type { NextRequest } from "next/server";

import {
  reserveUploadRequestSchema,
  type ReserveUploadResponse,
} from "@/contracts/upload.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { parseJsonBody } from "@/server/core/http/parse-json-body";
import { requireSameOrigin } from "@/server/core/http/require-same-origin";
import { reserveUpload } from "@/server/modules/uploads/reserve-upload.service";
import { enforceApiRateLimit } from "@/server/core/abuse/enforce-api-rate-limit";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);

    const user = await requireApiUser();
    await enforceApiRateLimit(request, user.id, "upload-reserve");
    const parsedBody = reserveUploadRequestSchema.safeParse(
      await parseJsonBody(request),
    );

    if (!parsedBody.success) {
      throw new ApplicationError(
        "INVALID_UPLOAD_METADATA",
        "Некоректні метадані файлу.",
        400,
      );
    }

    const result = await reserveUpload(user.id, parsedBody.data);

    return privateJson<ReserveUploadResponse>(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
