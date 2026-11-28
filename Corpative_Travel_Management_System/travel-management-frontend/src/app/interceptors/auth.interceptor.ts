import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const AUTH_TOKEN_STORAGE_KEY = 'tms_auth_token';

const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/account-lookup'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiCall = req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api/');
  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some(path => req.url.includes(path));

  if (!isApiCall || isPublicAuthCall) {
    return next(req);
  }

  let token: string | null = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    token = null;
  }

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
