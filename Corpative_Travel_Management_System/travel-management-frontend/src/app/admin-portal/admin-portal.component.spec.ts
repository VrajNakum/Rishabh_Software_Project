import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPortalComponent } from './admin-portal.component';
import { UserContextService, CurrentUser } from '../services/user-context.service';
import { Role, TravelClass, RequestStatus } from '../models/enums.model';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { of, throwError } from 'rxjs';

describe('AdminPortalComponent', () => {
  let component: AdminPortalComponent;
  let fixture: ComponentFixture<AdminPortalComponent>;
  let userContextServiceMock: any;

  const mockAdminUser: CurrentUser = {
    id: 4,
    fullName: 'Dave Wilson',
    email: 'dave.admin@company.com',
    role: Role.ADMIN,
    departmentName: 'Engineering'
  };

  const mockUsers: CurrentUser[] = [
    { id: 2, fullName: 'Alice Johnson', email: 'alice.employee@company.com', role: Role.EMPLOYEE, departmentName: 'Engineering', managerId: 1, managerName: 'Bob Miller', financeId: 3, financeName: 'Carol Davis' },
    { id: 1, fullName: 'Bob Miller', email: 'bob.manager@company.com', role: Role.MANAGER, departmentName: 'Engineering', financeId: 3, financeName: 'Carol Davis' },
    { id: 3, fullName: 'Carol Davis', email: 'carol.finance@company.com', role: Role.FINANCE, departmentName: 'Finance', financeId: 3, financeName: 'Self (Finance Officer)' },
    { id: 4, fullName: 'Dave Wilson', email: 'dave.admin@company.com', role: Role.ADMIN, departmentName: 'Engineering', financeId: 3, financeName: 'Carol Davis' }
  ];

  const mockRequest: TravelRequestResponseDto = {
    id: 101,
    employeeId: 2,
    employeeName: 'Alice Johnson',
    departmentName: 'Engineering',
    destination: 'London, UK',
    startDate: '2026-11-20',
    endDate: '2026-11-25',
    purpose: 'Client Meeting',
    estimatedBudget: 1200,
    travelClass: TravelClass.ECONOMY,
    status: RequestStatus.PENDING_MANAGER,
    policyViolated: false,
    policyViolationReason: undefined,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  beforeEach(async () => {
    userContextServiceMock = {
      availableUsers: [...mockUsers],
      managers: [mockUsers[1]],
      backendConnected$: of(true),
      unsyncedUsers$: of([]),
      isBackendConnected: true,
      backendSyncError: null,
      refreshUsers: vi.fn().mockReturnValue(of([...mockUsers])),
      createUser: vi.fn().mockImplementation((payload) => of({
        id: 10,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        departmentName: payload.departmentName,
        managerId: payload.managerId,
        managerName: payload.managerId === 1 ? 'Bob Miller' : null
      })),
      removeUser: vi.fn().mockReturnValue(of(true)),
      updateUserAssignments: vi.fn().mockImplementation((userId, managerId, financeId) => {
        const u = mockUsers.find(x => x.id === userId) || mockUsers[0];
        const manager = mockUsers.find(x => x.id === managerId);
        const finance = mockUsers.find(x => x.id === financeId);
        return of({
          ...u,
          managerId,
          managerName: manager ? manager.fullName : null,
          financeId,
          financeName: finance ? finance.fullName : null
        });
      }),
      updateUserRole: vi.fn().mockImplementation((userId, newRole) => {
        const u = mockUsers.find(x => x.id === userId) || mockUsers[0];
        return of({
          ...u,
          role: newRole
        });
      }),
      setCurrentUser: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AdminPortalComponent],
      providers: [
        { provide: UserContextService, useValue: userContextServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPortalComponent);
    component = fixture.componentInstance;
    component.currentUser = mockAdminUser;
    component.requests = [mockRequest];
    fixture.detectChanges();
  });

  it('should create the admin portal component', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('DB Synced');
    expect(compiled.textContent).not.toContain('DB Offline');
    expect(compiled.querySelector('button[title*="Refresh user directory"]')).toBeNull();
  });

  it('should display metrics for Employees, Managers, and Finance officers', () => {
    expect(component.countEmployees).toBe(1);
    expect(component.countManagers).toBe(1);
    expect(component.countFinance).toBe(1);
    expect(component.countAdmins).toBe(1);
  });

  it('should open modal to Add New User with default role', () => {
    component.openAddUserModal(Role.MANAGER);
    fixture.detectChanges();
    expect(component.showAddUserModal).toBe(true);
    expect(component.newUser.role).toBe(Role.MANAGER);

    const compiled = fixture.nativeElement as HTMLElement;
    const passwordInput = compiled.querySelector('input[name="password"]') as HTMLInputElement;
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.getAttribute('type')).toBe('password');
    expect(passwordInput.closest('.input-group')?.querySelector('button')).toBeNull();
  });

  it('should validate form and add a new user as Finance Officer with Reporting Manager and Assigned Finance', () => {
    component.openAddUserModal(Role.FINANCE);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="managerId"]')).toBeTruthy();
    expect(compiled.querySelector('select[name="financeId"]')).toBeTruthy();

    component.newUser.fullName = 'Grace Hopper';
    component.newUser.email = 'grace.finance@company.com';
    component.newUser.password = 'gracePass123';
    component.newUser.departmentName = 'Finance';
    component.newUser.managerId = 1;
    component.newUser.financeId = 3;

    const emitSpy = vi.spyOn(component.userCreated, 'emit');
    component.submitAddUser();

    expect(userContextServiceMock.createUser).toHaveBeenCalledWith({
      fullName: 'Grace Hopper',
      email: 'grace.finance@company.com',
      password: 'gracePass123',
      role: Role.FINANCE,
      departmentName: 'Finance',
      managerId: 1,
      financeId: 3
    });
    expect(emitSpy).toHaveBeenCalled();
    expect(component.showAddUserModal).toBe(false);
  });

  it('should render Reporting Manager and Assigned Finance inputs for Manager role and submit assignments', () => {
    component.openAddUserModal(Role.MANAGER);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('select[name="managerId"]')).toBeTruthy();
    expect(compiled.querySelector('select[name="financeId"]')).toBeTruthy();

    component.newUser.fullName = 'Alan Turing';
    component.newUser.email = 'alan.manager@company.com';
    component.newUser.password = 'alanPass123';
    component.newUser.departmentName = 'Engineering';
    component.newUser.managerId = 1;
    component.newUser.financeId = 3;

    const emitSpy = vi.spyOn(component.userCreated, 'emit');
    component.submitAddUser();

    expect(userContextServiceMock.createUser).toHaveBeenCalledWith({
      fullName: 'Alan Turing',
      email: 'alan.manager@company.com',
      password: 'alanPass123',
      role: Role.MANAGER,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    });
    expect(emitSpy).toHaveBeenCalled();
    expect(component.showAddUserModal).toBe(false);
  });

  it('should add a new user as Employee with assigned Finance Officer', () => {
    component.openAddUserModal(Role.EMPLOYEE);
    component.newUser.fullName = 'Sarah Connor';
    component.newUser.email = 'sarah@company.com';
    component.newUser.password = 'sarahPass123';
    component.newUser.departmentName = 'Engineering';
    component.newUser.managerId = 1;
    component.newUser.financeId = 3;

    const emitSpy = vi.spyOn(component.userCreated, 'emit');
    component.submitAddUser();

    expect(userContextServiceMock.createUser).toHaveBeenCalledWith({
      fullName: 'Sarah Connor',
      email: 'sarah@company.com',
      password: 'sarahPass123',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    });
    expect(emitSpy).toHaveBeenCalled();
    expect(component.showAddUserModal).toBe(false);
  });

  it('should default managerId to 1 (user1manager) and financeId to 3 (user1finance) if not provided', () => {
    component.openAddUserModal(Role.EMPLOYEE);
    component.newUser.fullName = 'John Doe';
    component.newUser.email = 'john.doe@company.com';
    component.newUser.password = 'password123';
    component.newUser.departmentName = 'Engineering';
    component.newUser.managerId = null;
    component.newUser.financeId = null;

    component.submitAddUser();

    expect(userContextServiceMock.createUser).toHaveBeenCalledWith({
      fullName: 'John Doe',
      email: 'john.doe@company.com',
      password: 'password123',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    });
  });

  it('should validate empty or short password in Add New User modal', () => {
    component.openAddUserModal(Role.EMPLOYEE);
    component.newUser.fullName = 'Grace Hopper';
    component.newUser.email = 'grace.employee@company.com';
    component.newUser.departmentName = 'Engineering';

    // Empty password
    component.newUser.password = '';
    component.submitAddUser();
    expect(component.formError).toContain('Please enter an account password for login access.');

    // Short password (< 4 chars)
    component.newUser.password = 'abc';
    component.submitAddUser();
    expect(component.formError).toContain('Password must be at least 4 characters long.');
  });

  it('should display database error and keep modal open if createUser fails', () => {
    userContextServiceMock.createUser.mockReturnValueOnce(
      throwError(() => new Error('Backend server is unreachable (http://localhost:8080).'))
    );

    component.openAddUserModal(Role.EMPLOYEE);
    component.newUser.fullName = 'Test User';
    component.newUser.email = 'test.user@company.com';
    component.newUser.password = 'password123';
    component.newUser.departmentName = 'Engineering';

    const emitSpy = vi.spyOn(component.userCreated, 'emit');
    component.submitAddUser();

    expect(component.formError).toContain('Backend server is unreachable');
    expect(component.showAddUserModal).toBe(true);
    expect(component.isSavingUser).toBe(false);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should open modal to update Estimated Budget and emit budgetUpdated', () => {
    const budgetSpy = vi.spyOn(component.budgetUpdated, 'emit');
    component.openEditBudgetModal(mockRequest);
    expect(component.editingBudgetRequest).toBe(mockRequest);
    expect(component.updatedBudgetValue).toBe(1200);

    component.updatedBudgetValue = 1800;
    component.confirmUpdateBudget();

    expect(budgetSpy).toHaveBeenCalledWith({ requestId: 101, newBudget: 1800 });
    expect(component.editingBudgetRequest).toBeNull();
  });

  it('should prompt, cancel, and confirm removing a user', () => {
    const emitSpy = vi.spyOn(component.userDeleted, 'emit');

    // Attempting to delete oneself (currentUser is Dave Wilson, id: 4) should be blocked
    component.promptDeleteUser(mockUsers[3]);
    expect(component.userToDelete).toBeNull();

    // Selecting another user (Alice Johnson, id: 2)
    component.promptDeleteUser(mockUsers[0]);
    expect(component.userToDelete).toBe(mockUsers[0]);

    // Canceling deletion
    component.cancelDeleteUser();
    expect(component.userToDelete).toBeNull();

    // Prompting again and confirming deletion
    component.promptDeleteUser(mockUsers[0]);
    component.confirmDeleteUser();

    expect(userContextServiceMock.removeUser).toHaveBeenCalledWith(2);
    expect(emitSpy).toHaveBeenCalledWith(mockUsers[0]);
    expect(component.userToDelete).toBeNull();
    expect(component.isDeletingUser).toBe(false);
  });

  it('should open and close reassign manager or finance modal in dedicated mode without other role buttons', () => {
    const targetUser = mockUsers[0]; // Alice Johnson (managerId: 1, financeId: 3)
    
    // Open in MANAGER mode from Assigned Manager column
    component.openReassignModal(targetUser, 'MANAGER');
    expect(component.showReassignModal).toBe(true);
    expect(component.reassigningUser).toBe(targetUser);
    expect(component.reassignType).toBe('MANAGER');
    expect(component.selectedManagerId).toBe(1);

    component.closeReassignModal();
    expect(component.showReassignModal).toBe(false);

    // Open in FINANCE mode from Assigned FINANCE column
    component.openReassignModal(targetUser, 'FINANCE');
    expect(component.showReassignModal).toBe(true);
    expect(component.reassignType).toBe('FINANCE');
    expect(component.selectedFinanceId).toBe(3);

    component.closeReassignModal();
    expect(component.showReassignModal).toBe(false);
    expect(component.reassigningUser).toBeNull();
  });

  it('should save updated manager and finance assignments and emit userAssignmentsUpdated', () => {
    const targetUser = mockUsers[0]; // Alice Johnson
    const emitSpy = vi.spyOn(component.userAssignmentsUpdated, 'emit');

    component.openReassignModal(targetUser);
    component.selectedManagerId = 1;
    component.selectedFinanceId = 3;

    component.saveUserAssignments();

    expect(userContextServiceMock.updateUserAssignments).toHaveBeenCalledWith(2, 1, 3);
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 2,
      managerId: 1,
      financeId: 3
    }));
    expect(component.showReassignModal).toBe(false);
    expect(component.reassigningUser).toBeNull();
    expect(component.isSavingAssignments).toBe(false);
  });

  it('should exclude the current target user from eligible managers and finance officers in reassign modal', () => {
    const managerUser = mockUsers[1]; // Bob Miller (id: 1, Role.MANAGER)
    component.openReassignModal(managerUser);

    // Should not allow Bob Miller to pick himself as his own manager
    const eligibleMgrs = component.eligibleManagers;
    expect(eligibleMgrs.some((m: CurrentUser) => m.id === 1)).toBe(false);

    const financeUser = mockUsers[2]; // Carol Davis (id: 3, Role.FINANCE)
    component.openReassignModal(financeUser);
    const eligibleFin = component.eligibleFinanceOfficers;
    expect(eligibleFin.some((f: CurrentUser) => f.id === 3)).toBe(false);
  });

  it('should render edit buttons for Access Role, Assigned Manager, and Assigned Finance for all users', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const userTable = compiled.querySelectorAll('table')[0];
    const userRows = userTable.querySelectorAll('tbody tr');
    expect(userRows.length).toBe(mockUsers.length);

    // Each row in the Corporate User Directory should have Access Role, Assigned Manager, and Assigned FINANCE edit buttons
    userRows.forEach((row) => {
      const accessRoleCell = row.querySelectorAll('td')[2];
      expect(accessRoleCell.querySelector('.badge')).toBeNull();
      const roleTextSpan = accessRoleCell.querySelector('div > div > span');
      expect(roleTextSpan).toBeTruthy();
      expect(roleTextSpan?.querySelector('i')).toBeNull();

      const roleEditBtn = row.querySelector('button[title*="Access Role"]') as HTMLButtonElement;
      const managerEditBtn = row.querySelector('button[title*="Change Assigned Manager"]');
      const financeEditBtn = row.querySelector('button[title*="Change Assigned Finance Officer"]');
      expect(roleEditBtn).toBeTruthy();
      expect(managerEditBtn).toBeTruthy();
      expect(financeEditBtn).toBeTruthy();

      const departmentCell = row.querySelectorAll('td')[3];
      expect(departmentCell.querySelector('.badge')).toBeNull();
      expect(departmentCell.querySelector('i')).toBeNull();
      const deptSpan = departmentCell.querySelector('span');
      expect(deptSpan).toBeTruthy();
      expect(deptSpan?.className).toContain('fw-semibold');
    });
  });

  it('should open edit Access Role modal, update user role, and emit userRoleUpdated', () => {
    const targetUser = { ...mockUsers[0] }; // Alice Johnson (EMPLOYEE)
    const emitSpy = vi.spyOn(component.userRoleUpdated, 'emit');

    // Active admin cannot open edit role modal for themselves
    component.openEditRoleModal(mockUsers[3]);
    expect(component.showEditRoleModal).toBe(false);

    // Open for another user
    component.openEditRoleModal(targetUser);
    expect(component.showEditRoleModal).toBe(true);
    expect(component.editingRoleUser).toBe(targetUser);
    expect(component.selectedUserRole).toBe(Role.EMPLOYEE);

    component.selectedUserRole = Role.MANAGER;
    component.saveUserRole();

    expect(userContextServiceMock.updateUserRole).toHaveBeenCalledWith(2, Role.MANAGER);
    expect(targetUser.role).toBe(Role.MANAGER);
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 2,
      role: Role.MANAGER
    }));
    expect(component.showEditRoleModal).toBe(false);
    expect(component.editingRoleUser).toBeNull();
  });

  it('should immediately reassign manager and finance via quick select without loading', () => {
    const targetUser = { ...mockUsers[0] };
    const emitSpy = vi.spyOn(component.userAssignmentsUpdated, 'emit');

    // Quick manager change
    component.onQuickReassignManager(targetUser, 1);
    expect(targetUser.managerId).toBe(1);
    expect(targetUser.managerName).toBe('Bob Miller');
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ managerId: 1, managerName: 'Bob Miller' }));

    // Quick finance change
    component.onQuickReassignFinance(targetUser, 3);
    expect(targetUser.financeId).toBe(3);
    expect(targetUser.financeName).toBe('Carol Davis');
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ financeId: 3, financeName: 'Carol Davis' }));
  });

  it('should emit viewTripDetails event when Details button is clicked in Est. Budget Administration', () => {
    const viewSpy = vi.fn();
    component.viewTripDetails.subscribe(viewSpy);

    component.onViewTripDetails(mockRequest);
    expect(viewSpy).toHaveBeenCalledWith(mockRequest);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const detailsBtn = compiled.querySelector('button[title*="View Trip Details"]') as HTMLButtonElement;
    expect(detailsBtn).toBeTruthy();
    expect(detailsBtn.textContent).toContain('Details');
  });
});
