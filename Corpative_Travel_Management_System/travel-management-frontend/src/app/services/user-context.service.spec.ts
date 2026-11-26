import { TestBed } from '@angular/core/testing';
import { UserContextService, CurrentUser } from './user-context.service';
import { UserService } from './user.service';
import { Role } from '../models/enums.model';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('UserContextService', () => {
  let service: UserContextService;
  let userServiceSpy: any;

  beforeEach(() => {
    localStorage.clear();

    userServiceSpy = {
      getAllUsers: vi.fn().mockReturnValue(of([])),
      updateUser: vi.fn().mockImplementation((id: number, payload: any) => of({
        id,
        fullName: 'Alice Johnson',
        email: 'alice.employee@company.com',
        role: Role.EMPLOYEE,
        departmentName: 'Engineering',
        managerId: payload.managerId,
        financeId: payload.financeId,
        password: payload.password
      })),
      createUser: vi.fn(),
      deleteUser: vi.fn().mockReturnValue(of(void 0))
    };

    TestBed.configureTestingModule({
      providers: [
        UserContextService,
        { provide: UserService, useValue: userServiceSpy }
      ]
    });

    service = TestBed.inject(UserContextService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and each user should have their own unique password', () => {
    expect(service).toBeTruthy();
    const users = service.availableUsers;
    expect(users.length).toBeGreaterThan(0);

    const alice = users.find(u => u.id === 2);
    const bob = users.find(u => u.id === 1);
    const carol = users.find(u => u.id === 3);
    const dave = users.find(u => u.id === 4);

    expect(alice?.password).toBe('Alice@Emp123');
    expect(bob?.password).toBe('Bob@Mgr123');
    expect(carol?.password).toBe('Carol@Fin123');
    expect(dave?.password).toBe('Dave@Admin123');

    // Ensure all passwords are distinct (no shared 123)
    const passwords = users.map(u => u.password);
    const uniquePasswords = new Set(passwords);
    expect(uniquePasswords.size).toBe(users.length);
  });

  it('should require password during login and reject empty or incorrect password', () => {
    // Empty password
    const emptyRes = service.login('alice.employee@company.com', '');
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.message).toContain('Password is required');

    // Incorrect password (e.g. attempting old generic default)
    const wrongRes = service.login('alice.employee@company.com', '123');
    expect(wrongRes.success).toBe(false);
    expect(wrongRes.message).toContain('Incorrect password');

    // Correct unique password
    const successRes = service.login('alice.employee@company.com', 'Alice@Emp123');
    expect(successRes.success).toBe(true);
    expect(successRes.user?.id).toBe(2);
  });

  it('should update manager and finance assignments in database and local storage when reassigning', async () => {
    const targetUserId = 2; // Alice Johnson
    const newManagerId = 1; // Bob Miller
    const newFinanceId = 3; // Carol Davis

    const updated = await firstValueFrom(service.updateUserAssignments(targetUserId, newManagerId, newFinanceId));

    // 1. Check HTTP PUT call to backend API for database update
    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(targetUserId, {
      managerId: newManagerId,
      financeId: newFinanceId
    });

    // 2. Check updated user model
    expect(updated.id).toBe(targetUserId);
    expect(updated.managerId).toBe(newManagerId);
    expect(updated.managerName).toBe('Bob Miller');
    expect(updated.financeId).toBe(newFinanceId);
    expect(updated.financeName).toBe('Carol Davis');

    // 3. Check persistent database storage in localStorage
    const stored = localStorage.getItem('tms_corporate_users_database');
    expect(stored).toBeTruthy();
    const storedUsers: CurrentUser[] = JSON.parse(stored!);
    const storedAlice = storedUsers.find(u => u.id === targetUserId);
    expect(storedAlice).toBeTruthy();
    expect(storedAlice?.managerId).toBe(newManagerId);
    expect(storedAlice?.financeId).toBe(newFinanceId);
  });

  it('should support unassigning manager or finance to null and persist changes', async () => {
    const targetUserId = 2; // Alice Johnson

    const updated = await firstValueFrom(service.updateUserAssignments(targetUserId, null, null));

    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(targetUserId, {
      managerId: null,
      financeId: null
    });

    expect(updated.managerId).toBeNull();
    expect(updated.managerName).toBeNull();
    expect(updated.financeId).toBeNull();
    expect(updated.financeName).toBeNull();

    const stored = localStorage.getItem('tms_corporate_users_database');
    const storedUsers: CurrentUser[] = JSON.parse(stored!);
    const storedAlice = storedUsers.find(u => u.id === targetUserId);
    expect(storedAlice?.managerId).toBeNull();
    expect(storedAlice?.financeId).toBeNull();
  });

  it('should gracefully persist assignments even if backend HTTP fails (offline database resilience)', async () => {
    userServiceSpy.updateUser.mockReturnValue(throwError(() => new Error('Network error / backend offline')));

    const targetUserId = 2;
    const updated = await firstValueFrom(service.updateUserAssignments(targetUserId, 1, 3));

    expect(updated.managerId).toBe(1);
    expect(updated.financeId).toBe(3);

    const stored = localStorage.getItem('tms_corporate_users_database');
    const storedUsers: CurrentUser[] = JSON.parse(stored!);
    const storedAlice = storedUsers.find(u => u.id === targetUserId);
    expect(storedAlice?.managerId).toBe(1);
    expect(storedAlice?.financeId).toBe(3);
  });

  it('should update user access role in backend and local storage while preserving manager and finance assignments', async () => {
    const targetUserId = 2; // Alice Johnson (managerId: 1, financeId: 3)
    userServiceSpy.updateUser.mockImplementationOnce((id: number, payload: any) => of({
      id,
      fullName: 'Alice Johnson',
      email: 'alice.employee@company.com',
      role: payload.role,
      departmentName: 'Engineering',
      managerId: payload.managerId,
      managerName: 'Bob Miller',
      financeId: payload.financeId,
      financeName: 'Carol Davis'
    }));

    const updated = await firstValueFrom(service.updateUserRole(targetUserId, Role.MANAGER));

    expect(userServiceSpy.updateUser).toHaveBeenCalledWith(targetUserId, {
      role: Role.MANAGER,
      managerId: 1,
      financeId: 3
    });
    expect(updated.role).toBe(Role.MANAGER);

    const stored = localStorage.getItem('tms_corporate_users_database');
    const storedUsers: CurrentUser[] = JSON.parse(stored!);
    const storedAlice = storedUsers.find(u => u.id === targetUserId);
    expect(storedAlice?.role).toBe(Role.MANAGER);
    expect(storedAlice?.managerId).toBe(1);
    expect(storedAlice?.financeId).toBe(3);
  });

  it('should gracefully persist role change even if backend HTTP fails', async () => {
    userServiceSpy.updateUser.mockReturnValue(throwError(() => new Error('Network error')));

    const updated = await firstValueFrom(service.updateUserRole(3, Role.EMPLOYEE)); // Carol Davis (was FINANCE with financeId: 3)

    expect(updated.role).toBe(Role.EMPLOYEE);
    expect(updated.financeId).toBeNull();
    expect(updated.financeName).toBeNull();
  });

  it('should persist new user to backend database and propagate error instead of faking local save when backend fails', async () => {
    const payload = {
      fullName: 'DB User',
      email: 'db.user@company.com',
      password: 'Password@123',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    };

    userServiceSpy.createUser.mockReturnValueOnce(of({
      id: 99,
      ...payload,
      managerName: 'Bob Miller',
      financeName: 'Carol Davis'
    }));

    const created = await firstValueFrom(service.createUser(payload));
    expect(userServiceSpy.createUser).toHaveBeenCalledWith(payload);
    expect(created.id).toBe(99);
    expect(service.findUserById(99)?.email).toBe('db.user@company.com');

    // When backend rejects or is unreachable, createUser must error rather than silently faking local save
    userServiceSpy.createUser.mockReturnValueOnce(
      throwError(() => ({ status: 0, message: 'Http failure response' }))
    );

    await expect(firstValueFrom(service.createUser({
      ...payload,
      email: 'failed.user@company.com'
    }))).rejects.toThrow('Backend server is unreachable');

    expect(service.findUserByEmail('failed.user@company.com')).toBeUndefined();
  });

  it('should detect unsynced local-only users on refreshUsers and sync them to backend database', async () => {
    service.addUserLocally({
      id: 999,
      fullName: 'Offline Created',
      email: 'offline.created@company.com',
      password: 'Offline@123',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    });

    const serverUsers: CurrentUser[] = [
      { id: 1, fullName: 'Payal Dee', email: 'payaldee@gmail.com', role: Role.MANAGER, departmentName: 'Engineering' },
      { id: 2, fullName: 'Mansukhlal', email: 'mansukhlal@gmail.com', role: Role.FINANCE, departmentName: 'Finance' }
    ];
    userServiceSpy.getAllUsers.mockReturnValueOnce(of(serverUsers));

    await firstValueFrom(service.refreshUsers());

    expect(service.isBackendConnected).toBe(true);
    expect(service.unsyncedUsers.length).toBe(1);
    expect(service.unsyncedUsers[0].email).toBe('offline.created@company.com');

    userServiceSpy.createUser.mockReturnValueOnce(of({
      id: 10,
      fullName: 'Offline Created',
      email: 'offline.created@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 2
    }));

    const syncResult = await firstValueFrom(service.syncUnsyncedUsers());
    expect(syncResult.syncedCount).toBe(1);
    expect(syncResult.failed.length).toBe(0);
    expect(service.unsyncedUsers.length).toBe(0);
    expect(service.findUserByEmail('offline.created@company.com')?.id).toBe(10);
  });
});
