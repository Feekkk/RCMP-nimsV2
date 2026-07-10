export type ApiErrorBody = {
  error: string;
  code?: string;
  message: string;
};

export function apiOk<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function apiError(message: string, status = 400, code?: string): Response {
  const body: ApiErrorBody = { error: code ?? httpStatusLabel(status), message };
  if (code) body.code = code;
  return Response.json(body, { status });
}

function httpStatusLabel(status: number): string {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 422) return 'validation_error';
  if (status >= 500) return 'server_error';
  return 'bad_request';
}

export async function readJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return apiError('Request body must be valid JSON.', 400, 'invalid_json');
  }
}

export function handleApiError(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  const status = inferStatus(message);
  return apiError(message, status);
}

function inferStatus(message: string): number {
  const lower = message.toLowerCase();
  if (lower.includes('required') || lower.includes('sign in') || lower.includes('unauthorized')) {
    return lower.includes('sign in') || lower.includes('unauthorized') ? 401 : 400;
  }
  if (lower.includes('administrator') || lower.includes('technician access') || lower.includes('not authorized')) {
    return 403;
  }
  if (lower.includes('not found') || lower.includes('no account')) {
    return 404;
  }
  return 400;
}
