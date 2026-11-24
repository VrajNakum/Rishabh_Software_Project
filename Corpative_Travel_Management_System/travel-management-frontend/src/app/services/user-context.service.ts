import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, Observable, of, catchError, tap, map } from 'rxjs';
import { Role } from '../models/enums.model';
import { UserService, UserCreatePayload } from './user.service';

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
  private usersList: CurrentUser[] = [...DEFAULT_USERS];

  private usersSubject = new BehaviorSubject<CurrentUser[]>(this.usersList);
  users$ = this.usersSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<CurrentUser>(this.usersList[0]);
  currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(@Optional() private userService?: UserService) {
    this.loadUsersFromStorage();
    this.initUsers();
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

  private initUsers(): void {
    if (this.userService) {
      this.userService.getAllUsers().pipe(
        catchError(() => of([]))
      ).subscribe(serverUsers => {
        if (serverUsers && serverUsers.length > 0) {
          this.setUsers(serverUsers);
        }
      });
    }
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
    const exists = this.usersList.find(u => u.id === current.id);
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
          console.warn('Backend update failed, kept local assignments:', err);
          return of(localUpdated);
        })
      );
    }

    return of(localUpdated);
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
          console.warn('Backend user profile update failed or offline, kept local state:', err);
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
    const defaultManager = this.usersList.find(u => u.role === Role.MANAGER) || this.usersList.find(u => u.id === 1);
    const defaultFinance = this.usersList.find(u => u.role === Role.FINANCE) || this.usersList.find(u => u.id === 3);

    // If no reporting manager provided/selected, default to user1manager (Bob Miller, id: 1)
    if (payload.role === Role.EMPLOYEE && (payload.managerId === null || payload.managerId === undefined)) {
      payload.managerId = defaultManager ? defaultManager.id : 1;
    }

    // If no finance officer provided/selected, default to user1finance (Carol Davis, id: 3)
    if (payload.role !== Role.FINANCE && (payload.financeId === null || payload.financeId === undefined)) {
      payload.financeId = defaultFinance ? defaultFinance.id : 3;
    }

    if (this.userService) {
      return this.userService.createUser(payload).pipe(
        tap(created => {
          this.addUserLocally(created);
        }),
        catchError(err => {
          // If backend fails (e.g., offline or network error), fall back to local creation
          const fallbackUser = this.createLocalUser(payload);
          return of(fallbackUser);
        })
      );
    }

    const localUser = this.createLocalUser(payload);
    return of(localUser);
  }

  private createLocalUser(payload: UserCreatePayload): CurrentUser {
    const maxId = this.usersList.reduce((max, u) => (u.id > max ? u.id : max), 0);
    const defaultManager = this.usersList.find(u => u.role === Role.MANAGER) || this.usersList.find(u => u.id === 1);
    const defaultFinance = this.usersList.find(u => u.role === Role.FINANCE) || this.usersList.find(u => u.id === 3);

    const assignedManagerId = payload.role === Role.EMPLOYEE 
      ? (payload.managerId ?? (defaultManager ? defaultManager.id : 1))
      : null;
    const assignedManager = assignedManagerId ? (this.usersList.find(u => u.id === assignedManagerId) || defaultManager) : null;

    const assignedFinanceId = payload.role === Role.FINANCE 
      ? null 
      : (payload.financeId ?? (defaultFinance ? defaultFinance.id : 3));
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
      financeName: payload.role === Role.FINANCE ? 'Self (Finance Officer)' : (assignedFinance ? assignedFinance.fullName : (assignedFinanceId ? 'Carol Davis' : null)),
      password: payload.password?.trim() || ((payload.fullName ? payload.fullName.split(' ')[0] : 'User') + '@' + payload.role.slice(0, 3) + '123')
    };
    this.addUserLocally(newUser);
    return newUser;
  }
}
