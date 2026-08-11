import { FileRow } from "@/client/widgets/file-list/file-row";
import type { FileDto } from "@/contracts/file.contracts";

export function FileList({
  files,
  onFileDeleted,
}: {
  files: FileDto[];
  onFileDeleted: () => void;
}) {
  if (files.length === 0) {
    return (
      <div className="empty-state">
        <h2>Файлів поки немає</h2>
        <p>Оберіть перший файл у формі вище.</p>
      </div>
    );
  }

  return (
    <ul className="file-list">
      {files.map((file) => (
        <FileRow file={file} key={file.id} onDeleted={onFileDeleted} />
      ))}
    </ul>
  );
}
