"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  DEFAULT_FILE_LIST_QUERY,
  filesQueryOptions,
} from "@/client/entities/file/file.queries";
import { UploadFileForm } from "@/client/features/upload-file/upload-file-form";
import { FileList } from "@/client/widgets/file-list/file-list";

export function FilesPage() {
  const [page, setPage] = useState(DEFAULT_FILE_LIST_QUERY.page);
  const query = {
    ...DEFAULT_FILE_LIST_QUERY,
    page,
  };
  const { data, error, isFetching } = useQuery(filesQueryOptions(query));

  function handleFileDeleted() {
    if (data?.items.length === 1 && page > 1) {
      setPage((current) => Math.max(1, current - 1));
    }
  }

  if (error) {
    return (
      <section className="files-page">
        <h1>Мої файли</h1>
        <p className="form-error" role="alert">
          Не вдалося завантажити список файлів.
        </p>
      </section>
    );
  }

  return (
    <section className="files-page">
      <div className="files-heading">
        <div>
          <h1>Мої файли</h1>
          <p>{data?.total ?? 0} файлів доступно</p>
        </div>
        {isFetching ? <span role="status">Оновлення…</span> : null}
      </div>

      <UploadFileForm onUploaded={() => setPage(1)} />
      <FileList
        files={data?.items ?? []}
        onFileDeleted={handleFileDeleted}
      />

      {data && (data.page > 1 || data.hasMore) ? (
        <nav className="pagination" aria-label="Сторінки файлів">
          <button
            type="button"
            disabled={data.page === 1 || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Назад
          </button>
          <span>Сторінка {data.page}</span>
          <button
            type="button"
            disabled={!data.hasMore || isFetching}
            onClick={() => setPage((current) => current + 1)}
          >
            Далі
          </button>
        </nav>
      ) : null}
    </section>
  );
}
