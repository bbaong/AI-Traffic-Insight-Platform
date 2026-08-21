import { Response } from 'express';

/** Express res.json / JSON.stringify용 BigInt 안전 변환 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function sendJson(res: Response, status: number, body: unknown): void {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body, jsonReplacer));
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly detail?: unknown,
    public readonly exposeMessage = true,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function ok(
  res: Response,
  data?: unknown,
  status = 200,
  extra?: Record<string, unknown>,
): void {
  sendJson(res, status, {
    success: true,
    ...(data !== undefined ? { data } : {}),
    ...extra,
  });
}

export function fail(
  res: Response,
  status: number,
  message: string,
  error?: unknown,
): void {
  sendJson(res, status, {
    success: false,
    message,
    ...(error !== undefined
      ? { error: typeof error === 'string' ? error : String(error) }
      : {}),
  });
}

export function handleRouteError(
  res: Response,
  error: unknown,
  fallbackMessage: string,
): void {
  console.error(error);
  if (error instanceof HttpError) {
    const message = error.exposeMessage ? error.message : fallbackMessage;
    return fail(res, error.status, message, error.detail);
  }
  return fail(res, 500, fallbackMessage);
}