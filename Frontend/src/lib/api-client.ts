export class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
  path?: string;
};

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Error ${response.status}`;
  let path: string | undefined;

  try {
    const body = (await response.json()) as ApiErrorBody;
    if (Array.isArray(body.message)) {
      message = body.message.join(', ');
    } else if (typeof body.message === 'string') {
      message = body.message;
    }
    path = body.path;
  } catch {
    // respuesta no JSON
  }

  return new ApiError(message, response.status, path);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      // Con FormData el navegador define el Content-Type (multipart + boundary).
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401 && !path.includes('/auth/refresh')) {
    const refreshed = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshed.ok) {
      return apiFetch<T>(path, init);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Descarga binaria/texto con cookies (p. ej. CSV admin). No parsea JSON. */
export async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: '*/*',
      ...init?.headers,
    },
  });

  if (response.status === 401 && !path.includes('/auth/refresh')) {
    const refreshed = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      return apiFetchBlob(path, init);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.blob();
}
