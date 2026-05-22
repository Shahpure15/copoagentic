const BASE_URL = 'http://localhost:8000/api';

const attemptAutoLogin = async () => {
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'atharv@engg.edu', password: 'copo' })
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      localStorage.setItem('access_token', data.access_token);
      return data.access_token;
    }
  } catch (e) {
    console.error("Auto-login failed", e);
  }
  return null;
};

export const apiClient = async (endpoint, options = {}) => {
  let token = localStorage.getItem('access_token');
  const isAuthRequest = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
  
  if (!token && !isAuthRequest) {
    token = await attemptAutoLogin();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (response.status === 401 && !isAuthRequest) {
    const newToken = await attemptAutoLogin();
    if (newToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`
      };
      response = await fetch(`${BASE_URL}${endpoint}`, { ...config, headers: retryHeaders });
    }
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `API Error: ${response.status}`);
  }
  
  return response.json();
};

export const api = {
  get: (endpoint) => apiClient(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiClient(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiClient(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
  upload: async (endpoint, formData) => {
    let token = localStorage.getItem('access_token');
    if (!token) {
      token = await attemptAutoLogin();
    }
    
    let response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    
    if (response.status === 401) {
      const newToken = await attemptAutoLogin();
      if (newToken) {
        response = await fetch(`${BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
          body: formData,
        });
      }
    }
    
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  }
};

