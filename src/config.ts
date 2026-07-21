export const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "";
export const BASE_API_URL = `${BACKEND_URL}/api`;
export const API_URL = BASE_API_URL; // Backwards compatibility alias
export const WEBSOCKET_URL = BACKEND_URL;
export const REQUEST_TIMEOUT = 15000; // 15 seconds

export const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

/**
 * Centralized fetch helper that applies BASE_API_URL, default headers, and request timeout.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_API_URL}${endpoint}`;
  
  // Set up timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  // Determine headers
  const headers = { ...DEFAULT_HEADERS };
  // If the body is FormData (e.g. file upload or oauth/auth forms),
  // delete Content-Type so the browser sets the boundary automatically
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }
  
  const mergedOptions: RequestInit = {
    signal: controller.signal,
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

