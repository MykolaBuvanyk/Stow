export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const FILE_SIGNATURE_READ_BYTES = 8 * 1024;
export const SIGNED_DOWNLOAD_TTL_SECONDS = 60;

export const ALLOWED_FILE_TYPES = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
} as const;

export type AllowedFileType = keyof typeof ALLOWED_FILE_TYPES;

export const ALLOWED_MIME_TYPES = Object.freeze(
  Object.keys(ALLOWED_FILE_TYPES) as AllowedFileType[],
);

export const ALLOWED_FILE_EXTENSIONS = Object.freeze(
  Object.values(ALLOWED_FILE_TYPES).flat(),
);
