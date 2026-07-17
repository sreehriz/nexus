/**
 * Centralized API and Backend configurations.
 * Resolves production URL from environments or defaults to local developer server on port 8000.
 */
export const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
export const API_URL = `${BACKEND_URL}/api`;
