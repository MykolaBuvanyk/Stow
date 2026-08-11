"use client";

import { useMutation } from "@tanstack/react-query";

import { getFileDownload } from "@/client/features/download-file/download-file.api";
import { ApiClientError } from "@/client/shared/api/api-client";

export function DownloadFileButton({ fileId }: { fileId: string }) {
  const downloadMutation = useMutation({
    mutationFn: () => getFileDownload(fileId),
    onSuccess: ({ signedUrl }) => {
      window.location.assign(signedUrl);
    },
  });

  const errorMessage =
    downloadMutation.error instanceof ApiClientError
      ? downloadMutation.error.message
      : "Не вдалося почати скачування.";

  return (
    <div className="file-action">
      <button
        className="button-secondary"
        type="button"
        disabled={downloadMutation.isPending}
        onClick={() => downloadMutation.mutate()}
      >
        {downloadMutation.isPending ? "Готуємо…" : "Скачати"}
      </button>
      {downloadMutation.error ? (
        <span className="field-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
