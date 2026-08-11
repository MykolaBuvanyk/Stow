import {
  formatFileDate,
  formatFileSize,
} from "@/client/entities/file/file.formatters";
import { DeleteFileButton } from "@/client/features/delete-file/delete-file-button";
import { DownloadFileButton } from "@/client/features/download-file/download-file-button";
import { ShareFileButton } from "@/client/features/share-file/share-file-button";
import { FileStatusBadge } from "@/client/widgets/file-list/file-status-badge";
import type { FileDto } from "@/contracts/file.contracts";

export function FileRow({
  file,
  onDeleted,
}: {
  file: FileDto;
  onDeleted: () => void;
}) {
  return (
    <li className="file-row">
      <div className="file-main">
        <strong title={file.originalName}>{file.originalName}</strong>
        <span>{file.contentType ?? file.status}</span>
      </div>
      <div className="file-meta">
        <span>{formatFileSize(file.sizeBytes)}</span>
        <span>{formatFileDate(file.createdAt)}</span>
        {file.access === "shared" ? (
          <span className="file-access">Поділилися з вами</span>
        ) : null}
        <FileStatusBadge status={file.status} />
        <div className="file-actions">
          {file.status === "ready" ? (
            <DownloadFileButton fileId={file.id} />
          ) : null}
          {file.access === "owner" && file.status === "ready" ? (
            <ShareFileButton fileId={file.id} fileName={file.originalName} />
          ) : null}
          {file.access === "owner" ? (
            <DeleteFileButton
              fileId={file.id}
              fileName={file.originalName}
              onDeleted={onDeleted}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}
