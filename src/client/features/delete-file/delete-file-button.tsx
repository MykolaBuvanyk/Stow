"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { filesQueryRootKey } from "@/client/entities/file/file.queries";
import { deleteFile } from "@/client/features/delete-file/delete-file.api";
import { ApiClientError } from "@/client/shared/api/api-client";

export function DeleteFileButton({
  fileId,
  fileName,
  onDeleted,
}: {
  fileId: string;
  fileName: string;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => deleteFile(fileId),
    onSuccess: async () => {
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: filesQueryRootKey });
    },
  });

  function confirmDelete() {
    if (window.confirm(`Видалити «${fileName}»? Цю дію не можна скасувати.`)) {
      deleteMutation.mutate();
    }
  }

  const errorMessage =
    deleteMutation.error instanceof ApiClientError
      ? deleteMutation.error.message
      : "Не вдалося видалити файл.";

  return (
    <div className="file-action">
      <button
        className="button-danger"
        type="button"
        disabled={deleteMutation.isPending}
        onClick={confirmDelete}
      >
        {deleteMutation.isPending ? "Видаляємо…" : "Видалити"}
      </button>
      {deleteMutation.error ? (
        <span className="field-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
