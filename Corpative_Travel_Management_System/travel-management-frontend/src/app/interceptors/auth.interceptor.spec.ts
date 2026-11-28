import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AUTH_TOKEN_STORAGE_KEY, authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should attach Bearer token to protected /api requests when token exists', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt-test-token-123');

    http.get('/api/travel-requests').subscribe();

    const req = httpMock.expectOne('/api/travel-requests');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-test-token-123');
    req.flush([]);
  });

  it('should not attach Authorization header on public /api/auth/login endpoint', () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, 'jwt-test-token-123');

    http.post('/api/auth/login', { identifier: 'user@company.com', password: 'secret' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should omit Authorization header when no token is stored', () => {
    http.get('/api/users').subscribe();

    const req = httpMock.expectOne('/api/users');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });
});
