import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrentUser } from './user-context.service';
import { Role } from '../models/enums.model';

export interface UserCreatePayload {
  fullName: string;
  email: string;
  role: Role;
  departmentName: string;
  managerId?: number | null;
  financeId?: number | null;
  password?: string;
  bankName?: string;
  bankBranch?: string;
  ifscCode?: string;
  ifscName?: string;
  accountNumber?: string;
  bankProofFileName?: string;
  bankProofFileUrl?: string;
}

export interface AuthResponsePayload {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: CurrentUser;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(identifier: string, password: string): Observable<AuthResponsePayload> {
    return this.http.post<AuthResponsePayload>(`${this.authUrl}/login`, { identifier, password });
  }

  register(payload: { fullName: string; email: string; password: string; departmentName?: string }): Observable<AuthResponsePayload> {
    return this.http.post<AuthResponsePayload>(`${this.authUrl}/register`, payload);
  }

  resetPassword(email: string, newPassword: string): Observable<AuthResponsePayload> {
    return this.http.post<AuthResponsePayload>(`${this.authUrl}/reset-password`, { email, newPassword });
  }

  lookupAccount(email: string): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.authUrl}/account-lookup`, {
      params: { email }
    });
  }

  getAuthenticatedMe(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.authUrl}/me`);
  }

  getAllUsers(): Observable<CurrentUser[]> {
    return this.http.get<CurrentUser[]>(this.baseUrl);
  }

  createUser(payload: UserCreatePayload): Observable<CurrentUser> {
    return this.http.post<CurrentUser>(this.baseUrl, payload);
  }

  getUserById(id: number): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/${id}`);
  }

  updateUser(id: number, payload: Partial<UserCreatePayload>): Observable<CurrentUser> {
    return this.http.put<CurrentUser>(`${this.baseUrl}/${id}`, payload);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
