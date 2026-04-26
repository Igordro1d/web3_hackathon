/// <reference types="vite/client" />
const _envUrl = import.meta.env.VITE_API_URL;
console.log('[API_CONFIG] Raw VITE_API_URL from environment:', _envUrl);

let API_URL = _envUrl ? _envUrl.replace(/\/+$/, '') : 'http://localhost:3001';
if (API_URL !== 'http://localhost:3001' && !API_URL.startsWith('http://') && !API_URL.startsWith('https://')) {
  API_URL = `https://${API_URL}`;
}
console.log('[API_CONFIG] Final API base URL:', API_URL);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const targetUrl = `${API_URL}${path}`;
  console.log(`[API_REQUEST] Sending request to: ${targetUrl}`);
  
  const response = await fetch(targetUrl, { ...options, headers });
  console.log(`[API_RESPONSE] Received status: ${response.status} for ${targetUrl}`);
  
  let body: unknown = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}
