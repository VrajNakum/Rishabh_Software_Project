import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

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
