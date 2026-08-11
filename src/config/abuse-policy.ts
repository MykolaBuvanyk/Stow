export const API_RATE_LIMITS = {
  "file-download": { ip: 120, user: 60, windowSeconds: 60 },
  "file-mutation": { ip: 60, user: 30, windowSeconds: 60 },
  "file-share": { ip: 60, user: 30, windowSeconds: 60 },
  "upload-finalize": { ip: 40, user: 20, windowSeconds: 60 },
  "upload-reserve": { ip: 40, user: 20, windowSeconds: 60 },
} as const;

export type RateLimitAction = keyof typeof API_RATE_LIMITS;
