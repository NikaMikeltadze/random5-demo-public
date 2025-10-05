export const getToken = () => localStorage.getItem('access_token');

export const removeToken = () => localStorage.removeItem('access_token');

export const authFetch = (input: RequestInfo, init?: RequestInit) => {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const fetchMe = async () => {
  const res = await authFetch('http://localhost:8000/auth/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
};
