import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin, catchError, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role } from '../models/enums.model';
import { UserService, UserCreatePayload } from './user.service';
import { AUTH_TOKEN_STORAGE_KEY } from '../interceptors/auth.interceptor';

export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  departmentName: string;
  managerId?: number | null;
  managerName?: string | null;
  financeId?: number | null;
  financeName?: string | null;
  password?: string;
  bankName?: string;
  bankBranch?: string;
  ifscCode?: string;
  ifscName?: string;
  accountNumber?: string;
  bankProofFileName?: string;
  bankProofFileUrl?: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: CurrentUser;
}

const DEFAULT_USERS: CurrentUser[] = [
  { id: 2, fullName: 'Alice Johnson', email: 'alice.employee@company.com', role: Role.EMPLOYEE, departmentName: 'Engineering', managerId: 1, managerName: 'Bob Miller', financeId: 3, financeName: 'Carol Davis', password: 'Alice@Emp123', bankName: 'HDFC Bank', bankBranch: 'Vadodara Main Branch', ifscCode: 'HDFC0000123', ifscName: 'HDFC Bank Ltd - Vadodara Branch', accountNumber: '50100456789123' },
  { id: 1, fullName: 'Bob Miller', email: 'bob.manager@company.com', role: Role.MANAGER, departmentName: 'Engineering', financeId: 3, financeName: 'Carol Davis', password: 'Bob@Mgr123', bankName: 'State Bank of India', bankBranch: 'Corporate Finance Hub', ifscCode: 'SBIN0001234', ifscName: 'SBI Commercial Hub', accountNumber: '304958671234' },
  { id: 3, fullName: 'Carol Davis', email: 'carol.finance@company.com', role: Role.FINANCE, departmentName: 'Finance', financeId: 3, financeName: 'Self (Finance Officer)', password: 'Carol@Fin123', bankName: 'ICICI Bank', bankBranch: 'Financial District Branch', ifscCode: 'ICIC0000567', ifscName: 'ICICI Bank Tower', accountNumber: '102938475612' },
  { id: 4, fullName: 'Dave Wilson', email: 'dave.admin@company.com', role: Role.ADMIN, departmentName: 'Engineering', financeId: 3, financeName: 'Carol Davis', password: 'Dave@Admin123', bankName: 'Axis Bank', bankBranch: 'Tech Park Branch', ifscCode: 'UTIB0000890', ifscName: 'Axis Bank Central', accountNumber: '918273645019' },
  { id: 5, fullName: 'User1emp', email: 'user1emp@company.com', role: Role.EMPLOYEE, departmentName: 'Engineering', managerId: 6, managerName: 'user1manager', financeId: 7, financeName: 'user1finance', password: 'User1@Emp123', bankName: 'HDFC Bank', bankBranch: 'Whitefield Branch', ifscCode: 'HDFC0000456', ifscName: 'HDFC Bank Whitefield', accountNumber: '50100987654321' },
  { id: 6, fullName: 'user1manager', email: 'user1manager@company.com', role: Role.MANAGER, departmentName: 'Engineering', managerId: 9, managerName: 'User2manager', financeId: 7, financeName: 'user1finance', password: 'Manager1@123', bankName: 'Kotak Mahindra Bank', bankBranch: 'Electronic City', ifscCode: 'KKBK0000345', ifscName: 'Kotak City Branch', accountNumber: '601928374655' },
  { id: 7, fullName: 'user1finance', email: 'user1finance@company.com', role: Role.FINANCE, departmentName: 'Finance', managerId: 6, managerName: 'user1manager', financeId: 10, financeName: 'user2finance', password: 'Finance1@123', bankName: 'Punjab National Bank', bankBranch: 'Connaught Place', ifscCode: 'PUNB0000234', ifscName: 'PNB Central Branch', accountNumber: '204958671829' },
  { id: 8, fullName: 'User2emp', email: 'user2emp@company.com', role: Role.EMPLOYEE, departmentName: 'Sales', managerId: 6, managerName: 'user1manager', financeId: 7, financeName: 'user1finance', password: 'User2@Emp123', bankName: 'Bank of Baroda', bankBranch: 'Alkapuri Branch', ifscCode: 'BARB0ALKAPU', ifscName: 'BOB Alkapuri Vadodara', accountNumber: '08120100012345' },
  { id: 9, fullName: 'User2manager', email: 'user2manager@company.com', role: Role.MANAGER, departmentName: 'Sales', managerId: 6, managerName: 'user1manager', financeId: 7, financeName: 'user1finance', password: 'Manager2@123', bankName: 'HDFC Bank', bankBranch: 'Bandra Kurla Complex', ifscCode: 'HDFC0000789', ifscName: 'HDFC Bank BKC', accountNumber: '50100112233445' },
  { id: 10, fullName: 'user2finance', email: 'user2finance@company.com', role: Role.FINANCE, departmentName: 'Finance', managerId: 6, managerName: 'user1manager', financeId: 7, financeName: 'user1finance', password: 'Finance2@123', bankName: 'Canara Bank', bankBranch: 'MG Road Branch', ifscCode: 'CNRB0000123', ifscName: 'Canara Bank MG Road', accountNumber: '11223344556677' }
];

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  private readonly STORAGE_KEY = 'tms_logged_in_user_id';
  private readonly USERS_DB_STORAGE_KEY = 'tms_corporate_users_database';
  private readonly UNSYNCED_USERS_STORAGE_KEY = 'tms_unsynced_local_users';
  private authTokenValue: string | null = null;
  private usersList: CurrentUser[] = [...DEFAULT_USERS];

  private usersSubject = new BehaviorSubject<CurrentUser[]>(this.usersList);
  users$ = this.usersSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<CurrentUser>(this.usersList[0]);
  currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private backendConnectedSubject = new BehaviorSubject<boolean>(false);
  backendConnected$ = this.backendConnectedSubject.asObservable();

  private backendSyncErrorSubject = new BehaviorSubject<string | null>(null);
  backendSyncError$ = this.backendSyncErrorSubject.asObservable();

  private unsyncedUsersSubject = new BehaviorSubject<CurrentUser[]>([]);
  unsyncedUsers$ = this.unsyncedUsersSubject.asObservable();

  constructor(@Optional() private userService?: UserService) {
    this.loadAuthTokenFromStorage();
    this.loadUsersFromStorage();
    this.initUsers();
  }

  private loadAuthTokenFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        this.authTokenValue = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      this.authTokenValue = null;
    }
  }

  get authToken(): string | null {
    return this.authTokenValue;
  }

  setAuthToken(token: string | null): void {
    this.authTokenValue = token;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        } else {
          window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private loadUsersFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.USERS_DB_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.usersList = parsed.map((u: CurrentUser) => {
              if (!u.password || u.password === 'password123' || u.password === '123') {
                const match = DEFAULT_USERS.find(d => d.id === u.id || d.email.toLowerCase() === u.email.toLowerCase());
                if (match) {
                  u.password = match.password;
                } else {
                  u.password = (u.fullName ? u.fullName.split(' ')[0] : 'User') + '@' + (u.role || 'Emp') + '123';
                }
              }
              return u;
            });
            this.saveUsersToStorage();
            this.usersSubject.next(this.usersList);
            this.currentUserSubject.next(this.usersList[0]);
          }
        }
        const storedUnsynced = window.localStorage.getItem(this.UNSYNCED_USERS_STORAGE_KEY);
        if (storedUnsynced) {
          const parsedUnsynced = JSON.parse(storedUnsynced);
          if (Array.isArray(parsedUnsynced)) {
            this.unsyncedUsersSubject.next(parsedUnsynced);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private saveUsersToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.USERS_DB_STORAGE_KEY, JSON.stringify(this.usersList));
      }
    } catch {
      // ignore
    }
  }

  private saveUnsyncedUsersToStorage(users: CurrentUser[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (users.length === 0) {
          window.localStorage.removeItem(this.UNSYNCED_USERS_STORAGE_KEY);
        } else {
          window.localStorage.setItem(this.UNSYNCED_USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }
    } catch {
      // ignore
    }
  }

  private initUsers(): void {
    if (this.authTokenValue) {
      this.refreshUsers().subscribe();
    }
  }

  get isBackendConnected(): boolean {
    return this.backendConnectedSubject.value;
  }

  get backendSyncError(): string | null {
    return this.backendSyncErrorSubject.value;
  }

  get unsyncedUsers(): CurrentUser[] {
    return this.unsyncedUsersSubject.value;
  }

  refreshUsers(): Observable<CurrentUser[]> {
    if (!this.userService) {
      return of(this.usersList);
    }

    return this.userService.getAllUsers().pipe(
      tap(serverUsers => {
        this.backendConnectedSubject.next(true);
        this.backendSyncErrorSubject.next(null);

        if (serverUsers && serverUsers.length > 0) {
          const defaultEmails = new Set(DEFAULT_USERS.map(u => u.email.toLowerCase()));
          const serverEmails = new Set(serverUsers.map(u => u.email.toLowerCase()));

          const mergedUnsynced = [...this.unsyncedUsersSubject.value, ...this.usersList].filter((u, idx, arr) => {
            const email = (u.email || '').toLowerCase();
            return email &&
              !defaultEmails.has(email) &&
              !serverEmails.has(email) &&
              arr.findIndex(x => (x.email || '').toLowerCase() === email) === idx;
          });

          this.unsyncedUsersSubject.next(mergedUnsynced);
          this.saveUnsyncedUsersToStorage(mergedUnsynced);
          this.setUsers(serverUsers);
        }
      }),
      catchError(err => {
        this.backendConnectedSubject.next(false);
        this.backendSyncErrorSubject.next(
          this.extractBackendErrorMessage(err, `Unable to reach backend database at ${environment.apiBaseUrl}/users.`)
        );
        return of([]);
      })
    );
  }

  private extractBackendErrorMessage(err: any, fallback: string): string {
    if (!err) return fallback;
    if (err.status === 0) {
      return `Backend server is unreachable (${environment.apiBaseUrl}). Ensure the API service and database are running.`;
    }
    if (err.error) {
      if (err.error.errors && typeof err.error.errors === 'object') {
        const details = Object.entries(err.error.errors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        return `Validation failed: ${details}`;
      }
      if (err.error.fieldErrors && typeof err.error.fieldErrors === 'object') {
        const details = Object.entries(err.error.fieldErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(', ');
        return `Validation failed: ${details}`;
      }
      if (typeof err.error.message === 'string' && err.error.message.trim().length > 0) {
        return err.error.message;
      }
      if (typeof err.error === 'string' && err.error.trim().length > 0) {
        return err.error;
      }
    }
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    return fallback;
  }

  get isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  get availableUsers(): CurrentUser[] {
    return this.usersList;
  }

  get currentUser(): CurrentUser {
    return this.currentUserSubject.value;
  }

  get managers(): CurrentUser[] {
    return this.usersList.filter(u => u.role === Role.MANAGER);
  }

  authenticate(identifier: string, password: string): Observable<LoginResult> {
    if (!identifier || !identifier.trim()) {
      return of({ success: false, message: 'Please enter your corporate email address or username.' });
    }
    if (!password || !password.trim()) {
      return of({ success: false, message: 'Password is required. Please enter your account password to sign in.' });
    }

    if (this.userService && typeof this.userService.login === 'function') {
      return this.userService.login(identifier.trim(), password.trim()).pipe(
        tap(res => {
          this.setAuthToken(res.token);
          this.backendConnectedSubject.next(true);
          this.backendSyncErrorSubject.next(null);
          if (res.user) {
            this.addUserLocally(res.user);
            this.loginWithUser(res.user);
          }
          this.refreshUsers().subscribe();
        }),
        map(res => ({ success: true, user: res.user })),
        catchError(err => {
          if (err?.status === 0) {
            this.backendConnectedSubject.next(false);
            return of(this.login(identifier, password));
          }
          return of({
            success: false,
            message: this.extractBackendErrorMessage(err, 'Invalid email/username or password.')
          });
        })
      );
    }

    return of(this.login(identifier, password));
  }

  verifyEmailAsync(email: string): Observable<CurrentUser | null> {
    const clean = email?.trim();
    if (!clean) {
      return of(null);
    }
    if (this.userService && typeof this.userService.lookupAccount === 'function') {
      return this.userService.lookupAccount(clean).pipe(
        tap(user => {
          if (user) {
            this.addUserLocally(user);
          }
        }),
        catchError(err => {
          if (err?.status === 0) {
            return of(this.findUserByEmail(clean) ?? null);
          }
          return of(null);
        })
      );
    }
    return of(this.findUserByEmail(clean) ?? null);
  }

  resetPasswordAsync(email: string, newPassword: string): Observable<LoginResult> {
    const pwd = newPassword?.trim() || '';
    if (pwd.length < 4) {
      return of({ success: false, message: 'New password must be at least 4 characters long.' });
    }
    if (this.userService && typeof this.userService.resetPassword === 'function') {
      return this.userService.resetPassword(email.trim(), pwd).pipe(
        tap(res => {
          this.setAuthToken(res.token);
          this.backendConnectedSubject.next(true);
          if (res.user) {
            this.addUserLocally(res.user);
            this.loginWithUser(res.user);
          }
          this.refreshUsers().subscribe();
        }),
        map(res => ({ success: true, user: res.user })),
        catchError(err => {
          if (err?.status === 0) {
            return of(this.resetPassword(email, pwd));
          }
          return of({
            success: false,
            message: this.extractBackendErrorMessage(err, 'Failed to reset password.')
          });
        })
      );
    }
    return of(this.resetPassword(email, pwd));
  }

  login(identifier: string, password?: string): LoginResult {
    if (!identifier || !identifier.trim()) {
      return { success: false, message: 'Please enter your corporate email address or username.' };
    }
    const clean = identifier.trim().toLowerCase();

    // Match by email, username prefix before @, full name, or id
    const user = this.usersList.find(u =>
      u.email.toLowerCase() === clean ||
      u.email.toLowerCase().split('@')[0] === clean ||
      u.fullName.toLowerCase() === clean ||
      String(u.id) === clean
    );

    if (!user) {
      return {
        success: false,
        message: `No corporate account found matching '${identifier}'. Please check your credentials or select a demo role below.`
      };
    }

    if (!password || !password.trim()) {
      return {
        success: false,
        message: 'Password is required. Please enter your account password to sign in.'
      };
    }
    if (user.password && user.password !== password.trim()) {
      return {
        success: false,
        message: 'Incorrect password. Please verify your credentials and try again.'
      };
    }

    this.setCurrentUser(user.id);
    this.isLoggedInSubject.next(true);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, String(user.id));
      }
    } catch {
      // ignore
    }

    return { success: true, user };
  }

  findUserById(id: number): CurrentUser | undefined {
    return this.usersList.find(u => u.id === id);
  }

  findUserByEmail(email: string): CurrentUser | undefined {
    if (!email || !email.trim()) return undefined;
    const clean = email.trim().toLowerCase();
    return this.usersList.find(u =>
      u.email.toLowerCase() === clean ||
      u.email.toLowerCase().split('@')[0] === clean
    );
  }

  getAssignedManagerForRequest(req: { employeeId: number; managerId?: number | null; managerName?: string | null }): { id: number | null; name: string | null } {
    if (req.managerId !== undefined && req.managerId !== null) {
      return { id: req.managerId, name: req.managerName ?? null };
    }
    const emp = this.findUserById(req.employeeId);
    return { id: emp?.managerId ?? null, name: emp?.managerName ?? null };
  }

  getAssignedFinanceForRequest(req: { employeeId: number; financeId?: number | null; financeName?: string | null }): { id: number | null; name: string | null } {
    if (req.financeId !== undefined && req.financeId !== null) {
      return { id: req.financeId, name: req.financeName ?? null };
    }
    const emp = this.findUserById(req.employeeId);
    return { id: emp?.financeId ?? null, name: emp?.financeName ?? null };
  }

  isUserAssignedReviewer(req: { employeeId: number; managerId?: number | null; managerName?: string | null; financeId?: number | null; financeName?: string | null; status?: string }, user?: CurrentUser | null): boolean {
    if (!user) return false;
    if (user.role === Role.ADMIN || (user.role as string) === 'ADMIN') return true;

    if (user.role === Role.MANAGER) {
      const mgr = this.getAssignedManagerForRequest(req);
      return mgr.id === user.id;
    }

    if (user.role === Role.FINANCE) {
      const fin = this.getAssignedFinanceForRequest(req);
      return fin.id === user.id;
    }

    return false;
  }

  canUserApproveRequest(req: { employeeId: number; status: string; managerId?: number | null; managerName?: string | null; financeId?: number | null; financeName?: string | null }, user?: CurrentUser | null): boolean {
    if (!user) return false;
    if (user.role === Role.ADMIN || (user.role as string) === 'ADMIN') return true;

    if (req.status === 'PENDING_MANAGER' && user.role === Role.MANAGER) {
      const mgr = this.getAssignedManagerForRequest(req);
      return mgr.id === user.id;
    }

    if (req.status === 'PENDING_FINANCE' && user.role === Role.FINANCE) {
      const fin = this.getAssignedFinanceForRequest(req);
      return fin.id === user.id;
    }

    return false;
  }

  loginWithEmailOnly(email: string): LoginResult {
    const user = this.findUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: `No corporate account found matching '${email}'. Please verify your email address.`
      };
    }
    this.loginWithUser(user);
    return { success: true, user };
  }

  resetPassword(email: string, newPassword: string): LoginResult {
    const user = this.findUserByEmail(email);
    if (!user) {
      return {
        success: false,
        message: `No corporate account found matching '${email}'.`
      };
    }
    if (!newPassword || newPassword.trim().length < 4) {
      return {
        success: false,
        message: 'New password must be at least 4 characters long.'
      };
    }
    user.password = newPassword.trim();
    this.addUserLocally(user);
    if (this.userService) {
      this.userService.updateUser(user.id, {
        fullName: user.fullName,
        email: user.email,
        password: user.password,
        role: user.role,
        departmentName: user.departmentName,
        managerId: user.managerId,
        financeId: user.financeId
      }).subscribe({
        error: () => { /* offline fallback */ }
      });
    }
    this.loginWithUser(user);
    return { success: true, user };
  }

  loginWithUser(user: CurrentUser): void {
    this.setCurrentUser(user.id);
    this.isLoggedInSubject.next(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.STORAGE_KEY, String(user.id));
      }
    } catch {
      // ignore
    }
  }

  logout(): void {
    this.isLoggedInSubject.next(false);
    this.setAuthToken(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  setCurrentUser(userId: number): void {
    const user = this.usersList.find(u => u.id === userId);
    if (user) {
      this.currentUserSubject.next(user);
      if (this.isLoggedIn) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(this.STORAGE_KEY, String(user.id));
          }
        } catch {
          // ignore
        }
      }
    }
  }

  setUsers(users: CurrentUser[]): void {
    this.usersList = [...users];
    this.saveUsersToStorage();
    this.usersSubject.next(this.usersList);
    const current = this.currentUserSubject.value;
    const matchByEmail = current?.email
      ? this.usersList.find(u => u.email.toLowerCase() === current.email.toLowerCase())
      : undefined;
    const exists = matchByEmail || this.usersList.find(u => u.id === current.id);
    if (!exists && this.usersList.length > 0) {
      this.currentUserSubject.next(this.usersList[0]);
    }
  }

  addUserLocally(user: CurrentUser): void {
    const existingIndex = this.usersList.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existingIndex >= 0) {
      this.usersList[existingIndex] = user;
    } else {
      this.usersList.push(user);
    }
    this.saveUsersToStorage();
    this.usersSubject.next(this.usersList);
  }

  removeUser(userId: number): Observable<boolean> {
    if (this.userService) {
      return this.userService.deleteUser(userId).pipe(
        tap(() => {
          this.removeUserLocally(userId);
        }),
        map(() => true),
        catchError(() => {
          this.removeUserLocally(userId);
          return of(true);
        })
      );
    }
    this.removeUserLocally(userId);
    return of(true);
  }

  removeUserLocally(userId: number): void {
    // Unassign this user if they were a manager or finance officer for other employees
    this.usersList.forEach(u => {
      if (u.managerId === userId) {
        u.managerId = null;
        u.managerName = null;
      }
      if (u.financeId === userId) {
        u.financeId = null;
        u.financeName = null;
      }
    });

    this.usersList = this.usersList.filter(u => u.id !== userId);
    this.saveUsersToStorage();
    this.usersSubject.next(this.usersList);

    const current = this.currentUserSubject.value;
    if (current && current.id === userId && this.usersList.length > 0) {
      this.currentUserSubject.next(this.usersList[0]);
    }
  }

  updateUserAssignments(userId: number, managerId: number | null, financeId: number | null): Observable<CurrentUser> {
    const normMgrId = managerId !== null && managerId !== undefined && String(managerId) !== 'null' ? Number(managerId) : null;
    const normFinId = financeId !== null && financeId !== undefined && String(financeId) !== 'null' ? Number(financeId) : null;

    // 1. Immediately and synchronously apply local update so all components and bindings reflect the change NOW!
    const localUpdated = this.applyUserAssignmentsLocally(userId, normMgrId, normFinId);

    const payload: Partial<UserCreatePayload> = {
      managerId: normMgrId,
      financeId: normFinId
    };

    if (this.userService) {
      return this.userService.updateUser(userId, payload).pipe(
        map((resp) => {
          if (resp && resp.managerName) localUpdated.managerName = resp.managerName;
          if (resp && resp.financeName) localUpdated.financeName = resp.financeName;
          this.addUserLocally(localUpdated);
          return localUpdated;
        }),
        catchError((err) => {
          this.backendSyncErrorSubject.next(
            this.extractBackendErrorMessage(err, 'Backend unavailable; retained local manager/finance assignments.')
          );
          return of(localUpdated);
        })
      );
    }

    return of(localUpdated);
  }

  updateUserRole(userId: number, newRole: Role): Observable<CurrentUser> {
    const localUpdated = this.applyUserRoleLocally(userId, newRole);

    // Include managerId and financeId so backend PUT /api/users/{id} preserves existing assignments.
    const payload: Partial<UserCreatePayload> = {
      role: newRole,
      managerId: localUpdated.managerId ?? null,
      financeId: localUpdated.financeId ?? null
    };

    if (this.userService) {
      return this.userService.updateUser(userId, payload).pipe(
        map((resp) => {
          if (resp) {
            if (resp.role) localUpdated.role = resp.role;
            if (resp.managerName !== undefined) localUpdated.managerName = resp.managerName;
            if (resp.financeName !== undefined) localUpdated.financeName = resp.financeName;
          }
          this.addUserLocally(localUpdated);
          if (this.currentUserSubject.value.id === localUpdated.id) {
            this.currentUserSubject.next({ ...localUpdated });
          }
          return localUpdated;
        }),
        catchError((err) => {
          this.backendSyncErrorSubject.next(
            this.extractBackendErrorMessage(err, 'Backend unavailable; retained local role update.')
          );
          return of(localUpdated);
        })
      );
    }

    return of(localUpdated);
  }

  applyUserRoleLocally(userId: number, newRole: Role): CurrentUser {
    const user = this.usersList.find(u => Number(u.id) === Number(userId));
    if (!user) {
      throw new Error(`User with ID #${userId} not found.`);
    }

    user.role = newRole;

    if (newRole !== Role.FINANCE && user.financeId === user.id) {
      user.financeId = null;
      user.financeName = null;
    }
    if (newRole !== Role.MANAGER && user.managerId === user.id) {
      user.managerId = null;
      user.managerName = null;
    }
    if (newRole === Role.FINANCE && !user.financeId) {
      user.financeName = 'Self (Finance Officer)';
    } else if (newRole !== Role.FINANCE && user.financeName === 'Self (Finance Officer)' && !user.financeId) {
      user.financeName = null;
    }

    this.addUserLocally(user);

    if (this.currentUserSubject.value.id === user.id) {
      this.currentUserSubject.next({ ...user });
    }

    return user;
  }

  applyUserAssignmentsLocally(userId: number, managerId: number | null, financeId: number | null): CurrentUser {
    const user = this.usersList.find(u => Number(u.id) === Number(userId));
    if (!user) {
      throw new Error(`User with ID #${userId} not found.`);
    }

    const normMgrId = managerId !== null && managerId !== undefined && String(managerId) !== 'null' ? Number(managerId) : null;
    const normFinId = financeId !== null && financeId !== undefined && String(financeId) !== 'null' ? Number(financeId) : null;

    const assignedManager = normMgrId ? this.usersList.find(u => Number(u.id) === Number(normMgrId)) : null;
    const assignedFinance = normFinId ? this.usersList.find(u => Number(u.id) === Number(normFinId)) : null;

    user.managerId = normMgrId;
    user.managerName = assignedManager ? assignedManager.fullName : (normMgrId ? `Manager #${normMgrId}` : null);
    user.financeId = normFinId;
    user.financeName = assignedFinance ? assignedFinance.fullName : (user.role === Role.FINANCE ? 'Self (Finance Officer)' : (normFinId ? `Finance #${normFinId}` : null));

    this.addUserLocally(user);

    if (this.currentUserSubject.value.id === user.id) {
      this.currentUserSubject.next({ ...user });
    }

    return user;
  }

  updateUserProfile(userId: number, profileData: Partial<CurrentUser>): Observable<CurrentUser> {
    // 1. Immediately apply update locally so the entire system (header, tables, observables, localStorage) reflects the new profile instantly
    const localUpdated = this.applyUserProfileLocally(userId, profileData);

    const payload: Partial<UserCreatePayload> = {
      fullName: localUpdated.fullName,
      email: localUpdated.email,
      password: localUpdated.password,
      role: localUpdated.role,
      departmentName: localUpdated.departmentName,
      managerId: localUpdated.managerId,
      financeId: localUpdated.financeId,
      bankName: localUpdated.bankName,
      bankBranch: localUpdated.bankBranch,
      ifscCode: localUpdated.ifscCode,
      ifscName: localUpdated.ifscName,
      accountNumber: localUpdated.accountNumber,
      bankProofFileName: localUpdated.bankProofFileName,
      bankProofFileUrl: localUpdated.bankProofFileUrl
    };

    if (this.userService) {
      return this.userService.updateUser(userId, payload).pipe(
        map((serverUser) => {
          if (serverUser) {
            return this.applyUserProfileLocally(userId, serverUser);
          }
          return localUpdated;
        }),
        catchError((err) => {
          this.backendSyncErrorSubject.next(
            this.extractBackendErrorMessage(err, 'Backend unavailable; retained local profile updates.')
          );
          return of(localUpdated);
        })
      );
    }

    return of(localUpdated);
  }

  applyUserProfileLocally(userId: number, profileData: Partial<CurrentUser>): CurrentUser {
    const user = this.usersList.find(u => u.id === userId);
    if (!user) {
      throw new Error(`User with ID #${userId} not found.`);
    }

    if (profileData.fullName !== undefined && profileData.fullName.trim()) {
      user.fullName = profileData.fullName.trim();
    }
    if (profileData.email !== undefined && profileData.email.trim()) {
      user.email = profileData.email.trim().toLowerCase();
    }
    if (profileData.password !== undefined && profileData.password.trim()) {
      user.password = profileData.password.trim();
    }
    if (profileData.departmentName !== undefined && profileData.departmentName.trim()) {
      user.departmentName = profileData.departmentName.trim();
    }
    if (profileData.managerId !== undefined) {
      user.managerId = profileData.managerId;
      const mgr = profileData.managerId ? this.usersList.find(u => u.id === profileData.managerId) : null;
      user.managerName = mgr ? mgr.fullName : null;
    }
    if (profileData.financeId !== undefined) {
      user.financeId = profileData.financeId;
      const fin = profileData.financeId ? this.usersList.find(u => u.id === profileData.financeId) : null;
      user.financeName = fin ? fin.fullName : (user.role === Role.FINANCE ? 'Self (Finance Officer)' : null);
    }
    if (profileData.bankName !== undefined) {
      user.bankName = profileData.bankName ? profileData.bankName.trim() : '';
    }
    if (profileData.bankBranch !== undefined) {
      user.bankBranch = profileData.bankBranch ? profileData.bankBranch.trim() : '';
    }
    if (profileData.ifscCode !== undefined) {
      user.ifscCode = profileData.ifscCode ? profileData.ifscCode.trim().toUpperCase() : '';
    }
    if (profileData.ifscName !== undefined) {
      user.ifscName = profileData.ifscName ? profileData.ifscName.trim() : '';
    }
    if (profileData.accountNumber !== undefined) {
      user.accountNumber = profileData.accountNumber ? profileData.accountNumber.trim() : '';
    }
    if (profileData.bankProofFileName !== undefined) {
      user.bankProofFileName = profileData.bankProofFileName;
    }
    if (profileData.bankProofFileUrl !== undefined) {
      user.bankProofFileUrl = profileData.bankProofFileUrl;
    }

    // Update any other users where this user is their assigned manager or finance officer
    this.usersList.forEach(u => {
      if (u.managerId === userId) {
        u.managerName = user.fullName;
      }
      if (u.financeId === userId) {
        u.financeName = user.fullName;
      }
    });

    this.addUserLocally(user);

    if (this.currentUserSubject.value.id === userId) {
      this.currentUserSubject.next({ ...user });
    }

    return user;
  }

  createUser(payload: UserCreatePayload): Observable<CurrentUser> {
    const defaultManager = this.usersList.find(u => u.role === Role.MANAGER);
    const defaultFinance = this.usersList.find(u => u.role === Role.FINANCE);

    if (payload.managerId === null || payload.managerId === undefined) {
      payload.managerId = defaultManager ? defaultManager.id : null;
    }

    if (payload.financeId === null || payload.financeId === undefined) {
      payload.financeId = defaultFinance ? defaultFinance.id : null;
    }

    if (this.userService) {
      return this.userService.createUser(payload).pipe(
        tap(created => {
          this.backendConnectedSubject.next(true);
          this.backendSyncErrorSubject.next(null);
          this.addUserLocally(created);
        }),
        catchError(err => {
          const message = this.extractBackendErrorMessage(err, 'Failed to create user in database.');
          if (err?.status === 0) {
            this.backendConnectedSubject.next(false);
            this.backendSyncErrorSubject.next(message);
          }
          return throwError(() => new Error(message));
        })
      );
    }

    const localUser = this.createLocalUser(payload);
    return of(localUser);
  }

  syncUnsyncedUsers(): Observable<{ syncedCount: number; failed: { user: CurrentUser; error: string }[] }> {
    const pending = [...this.unsyncedUsersSubject.value];
    if (!this.userService || pending.length === 0) {
      return of({ syncedCount: 0, failed: [] });
    }

    const validManagerIds = new Set(this.usersList.filter(u => u.role === Role.MANAGER).map(u => u.id));
    const validFinanceIds = new Set(this.usersList.filter(u => u.role === Role.FINANCE).map(u => u.id));
    const fallbackManagerId = this.usersList.find(u => u.role === Role.MANAGER)?.id ?? null;
    const fallbackFinanceId = this.usersList.find(u => u.role === Role.FINANCE)?.id ?? null;

    const requests = pending.map(u => {
      const payload: UserCreatePayload = {
        fullName: u.fullName,
        email: u.email,
        password: u.password && u.password.trim().length >= 4 ? u.password.trim() : 'User@1234',
        role: u.role,
        departmentName: u.departmentName || 'Engineering',
        managerId: u.managerId && validManagerIds.has(u.managerId) ? u.managerId : fallbackManagerId,
        financeId: u.financeId && validFinanceIds.has(u.financeId) ? u.financeId : fallbackFinanceId
      };

      return this.userService!.createUser(payload).pipe(
        map(created => ({ ok: true as const, created, source: u })),
        catchError(err => of({
          ok: false as const,
          source: u,
          error: this.extractBackendErrorMessage(err, 'Failed to sync user')
        }))
      );
    });

    return forkJoin(requests).pipe(
      tap(results => {
        const remaining: CurrentUser[] = [];
        for (const r of results) {
          if (r.ok) {
            this.addUserLocally(r.created);
          } else {
            remaining.push(r.source);
          }
        }
        this.unsyncedUsersSubject.next(remaining);
        this.saveUnsyncedUsersToStorage(remaining);
      }),
      map(results => ({
        syncedCount: results.filter(r => r.ok).length,
        failed: results.filter((r): r is { ok: false; source: CurrentUser; error: string } => !r.ok)
          .map(r => ({ user: r.source, error: r.error }))
      }))
    );
  }

  discardUnsyncedUsers(): void {
    this.unsyncedUsersSubject.next([]);
    this.saveUnsyncedUsersToStorage([]);
  }

  private createLocalUser(payload: UserCreatePayload): CurrentUser {
    const maxId = this.usersList.reduce((max, u) => (u.id > max ? u.id : max), 0);
    const defaultManager = this.usersList.find(u => u.role === Role.MANAGER) || this.usersList.find(u => u.id === 1);
    const defaultFinance = this.usersList.find(u => u.role === Role.FINANCE) || this.usersList.find(u => u.id === 3);

    const assignedManagerId = payload.managerId ?? (defaultManager ? defaultManager.id : 1);
    const assignedManager = assignedManagerId ? (this.usersList.find(u => u.id === assignedManagerId) || defaultManager) : null;

    const assignedFinanceId = payload.financeId ?? (defaultFinance ? defaultFinance.id : 3);
    const assignedFinance = assignedFinanceId ? (this.usersList.find(u => u.id === assignedFinanceId) || defaultFinance) : null;

    const newUser: CurrentUser = {
      id: maxId + 1,
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
      departmentName: payload.departmentName.trim(),
      managerId: assignedManagerId,
      managerName: assignedManager ? assignedManager.fullName : (assignedManagerId ? 'Bob Miller' : null),
      financeId: assignedFinanceId,
      financeName: assignedFinance ? assignedFinance.fullName : (payload.role === Role.FINANCE ? 'Self (Finance Officer)' : (assignedFinanceId ? 'Carol Davis' : null)),
      password: payload.password?.trim() || ((payload.fullName ? payload.fullName.split(' ')[0] : 'User') + '@' + payload.role.slice(0, 3) + '123')
    };
    this.addUserLocally(newUser);
    return newUser;
  }
}
