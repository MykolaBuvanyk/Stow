"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";

import {
  createFileShare,
  fileSharesQueryKey,
  getFileShares,
  revokeFileShare,
} from "@/client/features/share-file/share-file.api";
import { ApiClientError } from "@/client/shared/api/api-client";
import { createShareRequestSchema } from "@/contracts/share.contracts";

function mutationErrorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : "Не вдалося змінити доступ до файлу.";
}

export function ShareFileButton({
  fileId,
  fileName,
}: {
  fileId: string;
  fileName: string;
}) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const sharesQuery = useQuery({
    queryKey: fileSharesQueryKey(fileId),
    queryFn: () => getFileShares(fileId),
    enabled: isOpen,
  });
  const createMutation = useMutation({
    mutationFn: (normalizedEmail: string) =>
      createFileShare(fileId, { email: normalizedEmail }),
    onSuccess: async () => {
      setEmail("");
      setValidationMessage(null);
      await queryClient.invalidateQueries({
        queryKey: fileSharesQueryKey(fileId),
      });
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => revokeFileShare(fileId, shareId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: fileSharesQueryKey(fileId),
      });
    },
  });

  function openDialog() {
    createMutation.reset();
    revokeMutation.reset();
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.reset();
    const parsed = createShareRequestSchema.safeParse({ email });

    if (!parsed.success) {
      setValidationMessage(
        parsed.error.issues[0]?.message ?? "Некоректний отримувач.",
      );
      return;
    }

    setValidationMessage(null);
    createMutation.mutate(parsed.data.email);
  }

  return (
    <>
      <button className="button-secondary" type="button" onClick={openDialog}>
        Поділитися
      </button>

      <dialog
        ref={dialogRef}
        className="share-dialog"
        aria-labelledby={`share-title-${fileId}`}
        onClose={() => setIsOpen(false)}
      >
        <div className="share-dialog-heading">
          <div>
            <h2 id={`share-title-${fileId}`}>Доступ до файла</h2>
            <p title={fileName}>{fileName}</p>
          </div>
          <button
            className="button-secondary"
            type="button"
            disabled={createMutation.isPending || revokeMutation.isPending}
            onClick={closeDialog}
          >
            Закрити
          </button>
        </div>

        <form className="share-form" onSubmit={submit}>
          <label htmlFor={`share-email-${fileId}`}>Email отримувача</label>
          <div>
            <input
              id={`share-email-${fileId}`}
              type="email"
              value={email}
              autoComplete="email"
              disabled={createMutation.isPending}
              aria-invalid={Boolean(validationMessage || createMutation.error)}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Надаємо…" : "Надати доступ"}
            </button>
          </div>
          {validationMessage ? (
            <p className="form-error" role="alert">
              {validationMessage}
            </p>
          ) : null}
          {createMutation.error ? (
            <p className="form-error" role="alert">
              {mutationErrorMessage(createMutation.error)}
            </p>
          ) : null}
        </form>

        <section className="share-list" aria-label="Запити на доступ">
          <h3>Запити на доступ</h3>
          {sharesQuery.isPending ? <p role="status">Завантажуємо…</p> : null}
          {sharesQuery.error ? (
            <p className="form-error" role="alert">
              Не вдалося отримати список доступів.
            </p>
          ) : null}
          {sharesQuery.data?.items.length === 0 ? (
            <p>Запитів на доступ ще немає.</p>
          ) : null}
          {sharesQuery.data?.items.map((share) => (
            <div className="share-row" key={share.shareId}>
              <span>{share.email}</span>
              <button
                className="button-danger"
                type="button"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(share.shareId)}
              >
                Скасувати
              </button>
            </div>
          ))}
          {revokeMutation.error ? (
            <p className="form-error" role="alert">
              {mutationErrorMessage(revokeMutation.error)}
            </p>
          ) : null}
        </section>
      </dialog>
    </>
  );
}
