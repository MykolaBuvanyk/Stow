import type { NextRequest } from "next/server";

import {
  listFilesQuerySchema,
  type ListFilesResponse,
} from "@/contracts/file.contracts";
import { requireApiUser } from "@/server/core/auth/require-api-user";
import { ApplicationError } from "@/server/core/errors/application-error";
import { toErrorResponse } from "@/server/core/errors/error-response";
import { privateJson } from "@/server/core/http/no-store-response";
import { listFiles } from "@/server/modules/files/list-files.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const parsedQuery = listFilesQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? undefined,
    });

    if (!parsedQuery.success) {
      throw new ApplicationError(
        "INVALID_QUERY",
        "Некоректні параметри сторінки.",
        400,
      );
    }

    const result = await listFiles(user.id, parsedQuery.data);

    return privateJson<ListFilesResponse>(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
