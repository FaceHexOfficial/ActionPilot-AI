import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a consistent local YYYY-MM-DD date string for a given task's dueDate.
 * Handles UTC-midnight boundaries and local timezone shifts gracefully.
 */
export function getTaskDateString(dueDateStr: string): string {
  if (!dueDateStr) return '';
  const trimmed = dueDateStr.trim();
  
  // Case 1: Simple date format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const dateObj = new Date(trimmed);
  if (isNaN(dateObj.getTime())) return '';

  // Case 2: Check if it's a UTC midnight/near-midnight boundary (indicates all-day or pure date target)
  const isUtcMidnight = trimmed.includes('T00:00:00') || (trimmed.endsWith('Z') && (trimmed.includes('T00:') || trimmed.includes('T01:') || trimmed.includes('T23:')));

  if (isUtcMidnight) {
    const yyyy = dateObj.getUTCFullYear();
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } else {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * A customized wrapper for fetch that automatically attaches the user-configured
 * Gemini API Key to API requests bound for '/api/ai' if present in localStorage.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof Request) {
    url = input.url;
  }

  const customKey = localStorage.getItem('user_gemini_api_key');
  if (customKey && (url.startsWith('/api/ai') || url.includes('/api/ai/'))) {
    init = init || {};
    const headers = new Headers(init.headers || {});
    headers.set('x-gemini-api-key', customKey);
    init.headers = headers;
  }
  return fetch(input, init);
}

