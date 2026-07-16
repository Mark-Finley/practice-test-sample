const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }
  
  const headers = new Headers(options.headers || {});
  
  // Set JSON content-type if not already set and body is not form data
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, config);

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    // Return validation errors array or string error message
    const errorMsg = data.message || 'An unexpected server error occurred.';
    throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  put: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  patch: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  delete: <T>(path: string, options?: RequestInit) => 
    request<T>(path, { ...options, method: 'DELETE' }),
};
