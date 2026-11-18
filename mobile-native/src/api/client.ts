const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'https://gurmad24.onrender.com';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
};

// Render's free instance may sleep. Give read-only requests enough time to wake,
// and retry only reads so a payment, booking or other write is never duplicated.
const READ_TIMEOUT_MS = 75000;
const WRITE_TIMEOUT_MS = 60000;
const READ_ATTEMPTS = 2;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const NETWORK_MESSAGE =
  'Server-ka lama gaadhi karo. Hubi internet-ka oo isku day mar kale.';
const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

async function fetchOnce(
  path: string,
  options: RequestOptions,
): Promise<Response> {
  const method = options.method ?? 'GET';
  const controller = new AbortController();
  const timeout = method === 'GET' ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const attempts = method === 'GET' ? READ_ATTEMPTS : 1;
  let response: Response | null = null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetchOnce(path, options);
      if (
        method === 'GET' &&
        RETRYABLE_STATUS.has(response.status) &&
        attempt < attempts
      ) {
        await sleep(1200 * attempt);
        continue;
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts) {
        throw new ApiError(
          error instanceof Error && error.name === 'AbortError'
            ? 'Server-ku jawaabtiisu way daahday. Mar kale isku day.'
            : NETWORK_MESSAGE,
          0,
        );
      }
      await sleep(1200 * attempt);
    }
  }

  if (!response) {
    throw new ApiError(
      lastError instanceof Error ? lastError.message : NETWORK_MESSAGE,
      0,
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'Codsiga lama dhammaystiri karin. Fadlan mar kale isku day.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
