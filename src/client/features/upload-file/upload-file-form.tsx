"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";

import { filesQueryRootKey } from "@/client/entities/file/file.queries";
import {
  uploadFile,
  type UploadPhase,
} from "@/client/features/upload-file/upload-file.api";
import { ApiClientError } from "@/client/shared/api/api-client";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/config/file-policy";
import { reserveUploadRequestSchema } from "@/contracts/upload.contracts";

const phaseLabels: Record<UploadPhase, string> = {
  preparing: "Готуємо завантаження…",
  uploading: "Передаємо файл…",
  verifying: "Перевіряємо вміст…",
};

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Не вдалося завантажити файл. Перевірте формат і спробуйте ще раз.";
}

export function UploadFileForm({ onUploaded }: { onUploaded: () => void }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("preparing");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, setPhase),
    onSuccess: async ({ file }) => {
      onUploaded();
      await queryClient.invalidateQueries({ queryKey: filesQueryRootKey });
      setSelectedFile(null);
      setSuccessMessage(`«${file.originalName}» успішно завантажено.`);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
  });

  function selectFile(file: File | null) {
    uploadMutation.reset();
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      setValidationMessage(null);
      return;
    }

    const result = reserveUploadRequestSchema.safeParse({
      originalName: file.name,
      declaredMime: file.type,
      declaredSize: file.size,
    });

    if (!result.success) {
      setSelectedFile(null);
      setValidationMessage(
        result.error.issues[0]?.message ?? "Файл не відповідає правилам.",
      );
      return;
    }

    setSelectedFile(file);
    setValidationMessage(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <div>
        <h2>Завантажити файл</h2>
        <p>PDF, JPEG або PNG, не більше 25 MiB.</p>
      </div>

      <label className="upload-picker" htmlFor="file-upload">
        <span>{selectedFile?.name ?? "Оберіть файл"}</span>
        <input
          ref={inputRef}
          id="file-upload"
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          disabled={uploadMutation.isPending}
          aria-describedby="file-upload-help file-upload-feedback"
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <span id="file-upload-help" className="visually-hidden">
        Максимальний розмір {MAX_FILE_SIZE_BYTES} байтів.
      </span>

      <button
        type="submit"
        disabled={!selectedFile || uploadMutation.isPending}
      >
        {uploadMutation.isPending ? phaseLabels[phase] : "Завантажити"}
      </button>

      <div id="file-upload-feedback" aria-live="polite">
        {validationMessage ? (
          <p className="form-error" role="alert">
            {validationMessage}
          </p>
        ) : null}
        {uploadMutation.error ? (
          <p className="form-error" role="alert">
            {uploadErrorMessage(uploadMutation.error)}
          </p>
        ) : null}
        {successMessage ? <p className="form-success">{successMessage}</p> : null}
      </div>
    </form>
  );
}
