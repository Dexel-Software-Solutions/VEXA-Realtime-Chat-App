/**
 * services/api.ts
 * Thin wrapper around the Fetch API.
 *
 * Responsibilities:
 *  - Attach JSON headers and the Authorization bearer token automatically.
 *  - Apply a request timeout (mobile networks can hang indefinitely otherwise).
 *  - Normalise errors so screens can show a friendly message with try/catch.
 */

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../constants/Config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

/**
 * Wraps fetch() with a timeout using Promise.race, since Fetch does not
 * support timeouts natively on React Native.
 */
const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // The backend always responds with JSON, even on errors.
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // Response had no JSON body (e.g. network gateway error page).
      throw new ApiError('The server returned an unexpected response.', response.status);
    }

    if (!response.ok || json?.success === false) {
      throw new ApiError(json?.message || 'Something went wrong. Please try again.', response.status);
    }

    return json.data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection.', 0);
    }
    // Typically a network failure (backend not reachable, wrong IP, etc.)
    throw new ApiError(
      'Could not connect to the server. Please check your network and the server address.',
      0
    );
  }
}
