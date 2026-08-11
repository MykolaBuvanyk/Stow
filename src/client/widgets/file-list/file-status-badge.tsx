import type { FileStatus } from "@/contracts/file.contracts";

const statusLabels: Record<FileStatus, string> = {
  pending: "Очікує",
  ready: "Готовий",
  rejected: "Відхилений",
};

export function FileStatusBadge({ status }: { status: FileStatus }) {
  return (
    <span className={`file-status file-status--${status}`}>
      {statusLabels[status]}
    </span>
  );
}
