import "server-only";

type ApplicationErrorOptions = ErrorOptions & {
  headers?: HeadersInit;
};

export class ApplicationError extends Error {
  readonly headers: Headers;

  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    options?: ApplicationErrorOptions,
  ) {
    super(message, options);
    this.name = "ApplicationError";
    this.headers = new Headers(options?.headers);
  }
}
