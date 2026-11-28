import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { App } from './app';
import { TravelRequestService } from './services/travel-request.service';
import { ItineraryExpenseService } from './services/itinerary-expense.service';
import { ReportService } from './services/report.service';
import { TravelClass, RequestStatus, Role, ExpenseCategory, ReimbursementStatus, SegmentType } from './models/enums.model';
import { TravelRequestResponseDto } from './models/travel-request.model';
import { CurrentUser } from './services/user-context.service';

describe('App', () => {
  let travelRequestServiceMock: any;
  let itineraryExpenseServiceMock: any;
  let reportServiceMock: any;

  const mockRequest: TravelRequestResponseDto = {
    id: 101,
    employeeId: 2,
    employeeName: 'Alice Johnson',
    departmentName: 'Engineering',
    destination: 'New York, NY',
    startDate: '2027-01-10',
    endDate: '2027-01-15',
    purpose: 'Tech Conference',
    estimatedBudget: 1500,
    travelClass: TravelClass.ECONOMY,
    status: RequestStatus.PENDING_MANAGER,
    managerId: 1,
    managerName: 'Bob Miller',
    financeId: 3,
    financeName: 'Carol Davis',
    policyViolated: false,
    policyViolationReason: undefined,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  const mockDraftRequest: TravelRequestResponseDto = {
    id: 102,
    employeeId: 2,
    employeeName: 'Alice Johnson',
    departmentName: 'Engineering',
    destination: 'Chicago, IL',
    startDate: '2026-12-05',
    endDate: '2026-12-08',
    purpose: 'Architecture Review',
    estimatedBudget: 750,
    travelClass: TravelClass.BUSINESS,
    status: RequestStatus.DRAFT,
    policyViolated: false,
    policyViolationReason: undefined,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  const mockAdminUser: CurrentUser = {
    id: 4,
    fullName: 'Dave Wilson',
    email: 'dave.admin@company.com',
    role: Role.ADMIN,
    departmentName: 'Engineering'
  };

  const mockFinanceUser: CurrentUser = {
    id: 3,
    fullName: 'Carol Davis',
    email: 'carol.finance@company.com',
    role: Role.FINANCE,
    departmentName: 'Finance'
  };

  const mockManagerUser: CurrentUser = {
    id: 1,
    fullName: 'Bob Miller',
    email: 'bob.manager@company.com',
    role: Role.MANAGER,
    departmentName: 'Engineering'
  };

  beforeEach(async () => {
    travelRequestServiceMock = {
      getAllRequests: vi.fn().mockImplementation(() => of([{ ...mockRequest, status: RequestStatus.PENDING_MANAGER }, { ...mockDraftRequest }])),
      createRequest: vi.fn().mockImplementation((payload: any) => of({ ...mockRequest, ...payload, id: 999 })),
      updateRequest: vi.fn().mockImplementation((id: number, payload: any) => of({ ...mockDraftRequest, ...payload, id, status: RequestStatus.PENDING_MANAGER })),
      updatePriority: vi.fn().mockImplementation((id: number, priorityRequest: boolean) => of({ ...mockRequest, id, priorityRequest })),
      deleteRequest: vi.fn().mockReturnValue(of(undefined)),
      processApprovalAction: vi.fn().mockReturnValue(of({ ...mockRequest, status: RequestStatus.PENDING_FINANCE })),
      getAuditLogs: vi.fn().mockReturnValue(of([])),
      getRequestById: vi.fn().mockImplementation((id: number) => of({ ...mockRequest, id, status: RequestStatus.PENDING_MANAGER })),
      getRequestsByEmployee: vi.fn().mockImplementation(() => of([{ ...mockRequest, status: RequestStatus.PENDING_MANAGER }, { ...mockDraftRequest }]))
    };

    itineraryExpenseServiceMock = {
      getSegments: vi.fn().mockReturnValue(of([])),
      getExpenses: vi.fn().mockReturnValue(of([])),
      addExpense: vi.fn().mockReturnValue(of({})),
      addSegment: vi.fn().mockReturnValue(of({ id: 101, title: 'Flight AI-502', segmentType: 'FLIGHT' })),
      deleteSegment: vi.fn().mockReturnValue(of(undefined)),
      updateReimbursementStatus: vi.fn().mockReturnValue(of({}))
    };

    reportServiceMock = {
      getCostSummary: vi.fn().mockReturnValue(of({ totalRequests: 2, approvedRequests: 0, totalEstimatedBudget: 2250, totalActualReimbursedSpend: 0 })),
      getDepartmentSpend: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TravelRequestService, useValue: travelRequestServiceMock },
        { provide: ItineraryExpenseService, useValue: itineraryExpenseServiceMock },
        { provide: ReportService, useValue: reportServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render corporate title in header', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.userContext.loginWithUser(mockAdminUser);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.header-app-title')?.textContent).toContain('TMS.rishabhsoft.com');
    const logoImg = compiled.querySelector('.header-logo') as HTMLImageElement;
    expect(logoImg).toBeTruthy();
    expect(logoImg.getAttribute('src')).toContain('rishabh-logo.png');
  });

  it('should compute status counts and filter requests correctly', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const sampleRequests: TravelRequestResponseDto[] = [
      { ...mockRequest, id: 1, status: RequestStatus.DRAFT },
      { ...mockRequest, id: 2, status: RequestStatus.PENDING_MANAGER },
      { ...mockRequest, id: 3, status: RequestStatus.PENDING_FINANCE },
      { ...mockRequest, id: 4, status: RequestStatus.APPROVED },
      { ...mockRequest, id: 5, status: RequestStatus.REJECTED }
    ];

    app.requests = sampleRequests;

    expect(app.countDraft).toBe(1);
    expect(app.countPending).toBe(2);
    expect(app.countApproved).toBe(1);
    expect(app.countRejected).toBe(1);

    // Filtering
    app.setStatusFilter('APPROVED');
    expect(app.filteredRequests.length).toBe(1);
    expect(app.filteredRequests[0].id).toBe(4);

    app.setStatusFilter('PENDING');
    expect(app.filteredRequests.length).toBe(2);

    app.setStatusFilter('DRAFT');
    expect(app.filteredRequests.length).toBe(1);
    expect(app.filteredRequests[0].id).toBe(1);

    app.setStatusFilter('ALL');
    expect(app.filteredRequests.length).toBe(5);
  });

  it('should return clear status icons and human-readable status labels', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.formatStatusLabel('APPROVED')).toBe('Approved');
    expect(app.formatStatusLabel('DRAFT')).toBe('Draft');
    expect(app.formatStatusLabel('PENDING_MANAGER')).toBe('Pending Manager');
    expect(app.formatStatusLabel('PENDING_FINANCE')).toBe('Pending Finance');

    expect(app.getStatusIcon('APPROVED')).toBe('bi-check-circle-fill');
    expect(app.getStatusIcon('DRAFT')).toBe('bi-file-earmark-text-fill');
    expect(app.getStatusIcon('PENDING_MANAGER')).toBe('bi-person-clock');
  });

  it('should load draft details into input form when loadDraftIntoForm is called', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.loadDraftIntoForm(mockDraftRequest);

    expect(app.editingDraftId).toBe(mockDraftRequest.id);
    expect(app.newRequest.destination).toBe('Chicago, IL');
    expect(app.newRequest.startDate).toBe('2026-12-05');
    expect(app.newRequest.endDate).toBe('2026-12-08');
    expect(app.newRequest.purpose).toBe('Architecture Review');
    expect(app.newRequest.estimatedBudget).toBe(750);
    expect(app.newRequest.travelClass).toBe(TravelClass.BUSINESS);
    expect(app.activeTab).toBe('requests');
    expect(app.alertMessage).toContain('Draft #102 loaded into the input form');
  });

  it('should update existing draft and submit for approval via updateRequest', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.loadDraftIntoForm(mockDraftRequest);
    app.newRequest.destination = 'Chicago Downtown';

    app.submitRequest(false);

    expect(travelRequestServiceMock.updateRequest).toHaveBeenCalledWith(
      102,
      expect.objectContaining({
        destination: 'Chicago Downtown',
        draft: false
      })
    );
    expect(app.editingDraftId).toBeNull();
    expect(app.alertMessage).toContain('submitted for approval successfully');
  });

  it('should cancel draft editing and reset input fields', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.loadDraftIntoForm(mockDraftRequest);
    expect(app.editingDraftId).toBe(102);

    app.cancelEditDraft();
    expect(app.editingDraftId).toBeNull();
    expect(app.newRequest.destination).toBe('');
    expect(app.newRequest.purpose).toBe('');
  });

  it('should prevent non-admin users from deleting requests from history', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // Default currentUser is Alice (EMPLOYEE)
    expect(app.isAdmin).toBe(false);
    expect(app.canDeleteRequest(mockDraftRequest.status)).toBe(false);

    app.deleteRequest(mockDraftRequest);

    expect(travelRequestServiceMock.deleteRequest).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Unauthorized action: Only Admin can delete requests');
    expect(app.alertType).toBe('danger');
  });

  it('should delete unsubmitted draft from history when user is Admin', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.currentUser = mockAdminUser;
    app.requests = [mockRequest, mockDraftRequest];
    expect(app.requests.length).toBe(2);

    travelRequestServiceMock.getAllRequests.mockReturnValue(of([mockRequest]));
    app.deleteDraft(mockDraftRequest);

    expect(travelRequestServiceMock.deleteRequest).toHaveBeenCalledWith(102, 4);
    expect(app.requests.some(r => r.id === 102)).toBe(false);
    expect(app.alertMessage).toContain('Draft #102 deleted successfully');
  });

  it('should allow Admin to delete pending requests to manage database internally', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.currentUser = mockAdminUser;
    app.requests = [mockRequest, mockDraftRequest];
    travelRequestServiceMock.getAllRequests.mockReturnValue(of([mockDraftRequest]));

    // mockRequest is PENDING_MANAGER (submitted request)
    app.deleteRequest(mockRequest);

    expect(travelRequestServiceMock.deleteRequest).toHaveBeenCalledWith(101, 4);
    expect(app.requests.some(r => r.id === 101)).toBe(false);
    expect(app.alertMessage).toContain('Request #101 deleted successfully');
  });

  it('should delete approved request from history when user is Admin', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.currentUser = mockAdminUser;
    const mockApprovedRequest: TravelRequestResponseDto = {
      ...mockRequest,
      id: 103,
      status: RequestStatus.APPROVED
    };

    app.requests = [mockRequest, mockApprovedRequest];
    expect(app.requests.length).toBe(2);

    travelRequestServiceMock.getAllRequests.mockReturnValue(of([mockRequest]));
    app.deleteRequest(mockApprovedRequest);

    expect(travelRequestServiceMock.deleteRequest).toHaveBeenCalledWith(103, 4);
    expect(app.requests.some(r => r.id === 103)).toBe(false);
    expect(app.alertMessage).toContain('Approved request #103 deleted successfully');
  });

  it('should delete rejected request from history when user is Admin', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.currentUser = mockAdminUser;
    const mockRejectedRequest: TravelRequestResponseDto = {
      ...mockRequest,
      id: 104,
      status: RequestStatus.REJECTED
    };

    app.requests = [mockRequest, mockRejectedRequest];
    expect(app.requests.length).toBe(2);

    travelRequestServiceMock.getAllRequests.mockReturnValue(of([mockRequest]));
    app.deleteRequest(mockRejectedRequest);

    expect(travelRequestServiceMock.deleteRequest).toHaveBeenCalledWith(104, 4);
    expect(app.requests.some(r => r.id === 104)).toBe(false);
    expect(app.alertMessage).toContain('Rejected request #104 deleted successfully');
  });

  it('should execute submitRequest only once at a time and prevent concurrent submissions', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.newRequest = {
      employeeId: 2,
      destination: 'London',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      purpose: 'Client meeting',
      estimatedBudget: 800,
      travelClass: TravelClass.ECONOMY,
      draft: false
    };

    // First click: triggers createRequest
    app.submitRequest(false);
    expect(travelRequestServiceMock.createRequest).toHaveBeenCalledTimes(1);

    // If an operation is still in-flight, second click must be blocked
    app.isSubmittingRequest = 'submit';
    app.submitRequest(false);
    expect(travelRequestServiceMock.createRequest).toHaveBeenCalledTimes(1);
  });

  it('should unlock button state and show clear error message when an error occurs during submission', () => {
    travelRequestServiceMock.createRequest.mockReturnValue(throwError(() => ({
      status: 400,
      error: { message: 'End date cannot be earlier than start date' }
    })));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.newRequest = {
      employeeId: 2,
      destination: 'Tokyo',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      purpose: 'Conference',
      estimatedBudget: 1200,
      travelClass: TravelClass.ECONOMY,
      draft: false
    };

    app.submitRequest(false);

    // Button lock must be reset
    expect(app.isSubmittingRequest).toBeNull();
    // Error message must be captured
    expect(app.alertMessage).toBe('End date cannot be earlier than start date');
    expect(app.alertType).toBe('danger');
  });

  it('should handle approval review once at a time and reset lock when an error happens', () => {
    travelRequestServiceMock.processApprovalAction.mockReturnValue(throwError(() => ({
      status: 400,
      error: { message: 'Cannot APPROVE request currently in status: REJECTED' }
    })));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.userContext.loginWithUser(mockManagerUser);
    fixture.detectChanges();
    app.currentUser = mockManagerUser;

    app.reviewRequest(101, 'APPROVE');

    // Button lock for request 101 must be cleanly unlocked
    expect(app.processingApprovalId[101]).toBeUndefined();
    expect(app.alertMessage).toContain('Cannot APPROVE request currently in status: REJECTED');
  });

  it('should block APPROVE when startDate has reached or crossed today while allowing REJECT', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.userContext.loginWithUser(mockManagerUser);
    fixture.detectChanges();
    app.currentUser = mockManagerUser;

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const expiredReq: TravelRequestResponseDto = {
      ...mockRequest,
      id: 199,
      startDate: todayIso,
      endDate: '2027-01-20',
      status: RequestStatus.PENDING_MANAGER
    };
    app.requests = [expiredReq];

    app.reviewRequest(199, 'APPROVE');
    expect(travelRequestServiceMock.processApprovalAction).not.toHaveBeenCalled();
    expect(app.alertType).toBe('danger');
    expect(app.alertMessage).toContain('not accepted');
    expect(app.alertMessage).toContain('starting date has crossed');

    app.reviewRequest(199, 'REJECT', 'Start date already crossed');
    expect(travelRequestServiceMock.processApprovalAction).toHaveBeenCalledWith(199, {
      reviewerUserId: mockManagerUser.id,
      action: 'REJECT',
      comments: 'Start date already crossed'
    });
  });

  it('should open rejection modal and require feedback comment for employee when rejecting request', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.userContext.loginWithUser(mockManagerUser);
    fixture.detectChanges();
    app.currentUser = mockManagerUser;

    const testReq: TravelRequestResponseDto = { ...mockRequest, status: RequestStatus.PENDING_MANAGER };
    app.requests = [testReq];
    app.reviewRequest(101, 'REJECT');

    expect(app.rejectingRequest).toEqual(testReq);
    expect(travelRequestServiceMock.processApprovalAction).not.toHaveBeenCalled();

    // Trying to confirm with empty comment shows warning
    app.rejectionComment = '   ';
    app.confirmRejectRequest();
    expect(app.alertMessage).toContain('Please enter a comment explaining why');
    expect(travelRequestServiceMock.processApprovalAction).not.toHaveBeenCalled();

    // Confirming with comment triggers rejection with feedback
    app.rejectionComment = 'Budget exceeds allowed limit for this project';
    app.confirmRejectRequest();
    expect(travelRequestServiceMock.processApprovalAction).toHaveBeenCalledWith(101, {
      reviewerUserId: app.currentUser.id,
      action: 'REJECT',
      comments: 'Budget exceeds allowed limit for this project'
    });
    expect(app.rejectingRequest).toBeNull();
  });

  it('should compute countPendingApprovalsForUser based on assigned reviewer and role', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const testReq: TravelRequestResponseDto = { ...mockRequest, status: RequestStatus.PENDING_MANAGER };
    app.requests = [testReq, { ...mockDraftRequest }];

    // Default current user is Alice Johnson (EMPLOYEE) -> 0 pending
    expect(app.countPendingApprovalsForUser).toBe(0);

    // Switch to Bob Miller (id: 1, MANAGER) who is assigned manager for mockRequest
    app.currentUser = mockManagerUser;
    expect(app.countPendingApprovalsForUser).toBe(1);

    // Another manager (id: 99) should see 0 pending approvals
    app.currentUser = { id: 99, fullName: 'Other Mgr', email: 'other@co.com', role: Role.MANAGER, departmentName: 'Sales' };
    expect(app.countPendingApprovalsForUser).toBe(0);

    // Admin sees all pending
    app.currentUser = mockAdminUser;
    expect(app.countPendingApprovalsForUser).toBe(1);

    // Finance user Carol Davis (id: 3) sees 0 because status is PENDING_MANAGER (not yet PENDING_FINANCE)
    app.currentUser = mockFinanceUser;
    expect(app.countPendingApprovalsForUser).toBe(0);

    // If mockRequest moves to PENDING_FINANCE, finance user Carol Davis sees 1
    app.requests = [{ ...mockRequest, status: RequestStatus.PENDING_FINANCE }];
    expect(app.countPendingApprovalsForUser).toBe(1);
  });

  it('should block reviewRequest if current user is not authorized reviewer for the request', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // Switch current user to a different manager who is NOT assigned to mockRequest
    app.currentUser = { id: 99, fullName: 'Unauthorized Manager', email: 'unauth@co.com', role: Role.MANAGER, departmentName: 'Marketing' };
    app.requests = [mockRequest];

    app.reviewRequest(101, 'APPROVE');
    expect(travelRequestServiceMock.processApprovalAction).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Unauthorized action');
    expect(app.alertType).toBe('danger');
  });

  it('should dispatch notifications to assigned manager and finance when request submitted', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const notifySpy = vi.spyOn(app.notificationService, 'notifyRequestSubmitted');

    app.currentUser = {
      id: 2,
      fullName: 'Alice Johnson',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      managerName: 'Bob Miller',
      financeId: 3,
      financeName: 'Carol Davis'
    };

    app.newRequest = {
      employeeId: 2,
      destination: 'Singapore',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      purpose: 'Global Tech Expo',
      estimatedBudget: 2500,
      travelClass: TravelClass.BUSINESS,
      draft: false
    };

    app.submitRequest(false);

    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ destination: 'Singapore' }),
      app.currentUser,
      1,
      'Bob Miller',
      3,
      'Carol Davis'
    );
  });

  it('should navigate to appropriate tab and view when notification clicked', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const viewTripSpy = vi.spyOn(app, 'viewTripDetails');

    // For employee, navigateToRequestFromNotification opens Trip Details
    app.currentUser = { ...mockAdminUser, role: Role.EMPLOYEE };
    app.requests = [{ ...mockRequest, id: 101 }];
    app.navigateToRequestFromNotification(101);
    expect(viewTripSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));

    // For manager, navigateToRequestFromNotification opens approvals tab
    app.currentUser = mockManagerUser;
    app.navigateToRequestFromNotification(101);
    expect(app.activeTab).toBe('approvals');
  });

  it('should handle submitReimbursementClaim with approval check and notification dispatch', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const notifySpy = vi.spyOn(app.notificationService, 'sendNotification');

    const approvedTrip: TravelRequestResponseDto = {
      ...mockRequest,
      id: 205,
      employeeId: 2,
      employeeName: 'Alice Johnson',
      status: RequestStatus.APPROVED,
      financeId: 3,
      financeName: 'Carol Davis'
    };

    const pendingTrip: TravelRequestResponseDto = {
      ...mockRequest,
      id: 206,
      employeeId: 2,
      employeeName: 'Alice Johnson',
      status: RequestStatus.PENDING_MANAGER
    };

    // Set current user as the traveler (Alice Johnson, id: 2)
    app.currentUser = {
      id: 2,
      fullName: 'Alice Johnson',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    };

    // 1. If trip is not APPROVED, shows warning alert
    app.submitReimbursementClaim(pendingTrip);
    expect(app.alertMessage).toContain('Reimbursement claim records can only be submitted after the trip has been Approved by Finance');
    expect(app.alertType).toBe('warning');

    // 2. If non-traveler tries to submit
    app.currentUser = { id: 99, fullName: 'Other Employee', email: 'other@co.com', role: Role.EMPLOYEE, departmentName: 'Sales' };
    app.submitReimbursementClaim(approvedTrip);
    expect(app.alertMessage).toContain('Unauthorized action: Only the traveler');
    expect(app.alertType).toBe('danger');

    // Restore traveler
    app.currentUser = {
      id: 2,
      fullName: 'Alice Johnson',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      financeId: 3
    };

    // 3. If expenses list is empty
    app.expenses = [];
    app.submitReimbursementClaim(approvedTrip);
    expect(app.alertMessage).toContain('No pending reimbursable expense claims found');

    // 4. If trip is APPROVED and has expenses
    app.expenses = [
      { id: 91, travelRequestId: 205, category: ExpenseCategory.FOOD, amount: 250, status: ReimbursementStatus.APPROVED, createdAt: '' }
    ];
    app.submitReimbursementClaim(approvedTrip);
    expect(app.alertMessage).toContain('submitted exclusively to Assigned Finance Officer Carol Davis');
    expect(app.alertType).toBe('success');
    expect(app.isReimbursementRequested(205)).toBe(true);
    expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({
      recipientUserId: 3,
      type: 'EXPENSE'
    }));
  });

  it('should identify Finance role correctly with isFinance getter', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.currentUser = mockFinanceUser;
    expect(app.isFinance).toBe(true);

    app.currentUser = mockAdminUser;
    expect(app.isFinance).toBe(false);

    app.currentUser = { ...mockAdminUser, role: Role.EMPLOYEE };
    expect(app.isFinance).toBe(false);
  });

  it('should toggle add expense claim form visibility with toggleAddExpenseForm', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app.showAddExpenseForm).toBe(false);
    app.toggleAddExpenseForm();
    expect(app.showAddExpenseForm).toBe(true);
    app.toggleAddExpenseForm();
    expect(app.showAddExpenseForm).toBe(false);
  });

  it('should allow employee to submit an expense claim for an approved trip and block for non-approved trips', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const employeeUser: CurrentUser = {
      id: 2,
      fullName: 'Alice Johnson',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering'
    };
    app.currentUser = employeeUser;

    // 1. Trying to add expense when trip is not approved should be blocked
    app.selectedRequest = { ...mockRequest, status: RequestStatus.PENDING_MANAGER };
    app.addExpense();
    expect(itineraryExpenseServiceMock.addExpense).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Expense claims can only be filed once the request is Approved');

    // 2. When trip is approved, employee can submit claim
    app.selectedRequest = { ...mockRequest, status: RequestStatus.APPROVED };
    app.expenseClaim = {
      category: TravelClass.ECONOMY as any,
      amount: 85,
      remarks: 'Client dinner'
    };
    app.addExpense();
    expect(itineraryExpenseServiceMock.addExpense).toHaveBeenCalledWith(101, expect.objectContaining({
      amount: 85,
      remarks: 'Client dinner'
    }));
    expect(app.alertMessage).toContain('submitted successfully! Awaiting Finance approval');
    expect(app.alertType).toBe('success');
    expect(app.showAddExpenseForm).toBe(false);
  });

  it('should allow Finance to approve an expense claim and block non-Finance from approving', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // 1. Employee / Admin should be blocked
    app.currentUser = mockAdminUser;
    app.approveExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Unauthorized action: Only Finance personnel');

    // 2. Finance should be allowed
    app.currentUser = mockFinanceUser;
    app.approveExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).toHaveBeenCalledWith(501, 'APPROVED');
    expect(app.alertMessage).toContain('approved by Finance! Ready for reimbursement');
  });

  it('should allow Finance to reject an expense claim and block non-Finance from rejecting', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // 1. Employee / Admin should be blocked
    app.currentUser = mockAdminUser;
    app.rejectExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Unauthorized action: Only Finance personnel');

    // 2. Finance should be allowed
    app.currentUser = mockFinanceUser;
    app.rejectExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).toHaveBeenCalledWith(501, 'REJECTED');
    expect(app.alertMessage).toContain('rejected by Finance');
  });

  it('should restrict reimbursement strictly to Finance role only', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    // 1. Admin should be blocked
    app.currentUser = mockAdminUser;
    app.reimburseExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).not.toHaveBeenCalled();
    expect(app.alertMessage).toContain('Unauthorized action: Only Finance personnel');

    // 2. Finance should be allowed
    app.currentUser = mockFinanceUser;
    app.reimburseExpense(501);
    expect(itineraryExpenseServiceMock.updateReimbursementStatus).toHaveBeenCalledWith(501, 'REIMBURSED');
    expect(app.alertMessage).toContain('marked as REIMBURSED successfully by Finance');
  });

  describe('Admin Portal & User Creation Integration', () => {
    it('should allow Admin to activate admin tab when calling goToAdminPortal', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.currentUser = mockAdminUser;
      app.goToAdminPortal();
      expect(app.activeTab).toBe('admin');
    });

    it('should block non-Admin users (Employee, Manager, Finance) from accessing goToAdminPortal', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      // Employee
      app.currentUser = { id: 2, fullName: 'Alice', email: 'alice@test.com', role: Role.EMPLOYEE, departmentName: 'Eng' };
      app.activeTab = 'requests';
      app.goToAdminPortal();
      expect(app.activeTab).toBe('requests');
      expect(app.alertMessage).toContain('Unauthorized access: The Admin Portal is restricted to Administrators only.');

      // Finance
      app.currentUser = mockFinanceUser;
      app.goToAdminPortal();
      expect(app.activeTab).toBe('requests');
      expect(app.alertMessage).toContain('Unauthorized access: The Admin Portal is restricted to Administrators only.');
    });

    it('should redirect away from admin tab if switched to non-admin persona', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.currentUser = mockAdminUser;
      app.activeTab = 'admin';

      // Switch to employee
      app.userContext.setCurrentUser(2);
      expect(app.activeTab).toBe('requests');
    });

    it('should show success alert when onUserCreated is triggered', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const loadSpy = vi.spyOn(app, 'loadData');
      const newUser: CurrentUser = {
        id: 99,
        fullName: 'Neo Anderson',
        email: 'neo@company.com',
        role: Role.EMPLOYEE,
        departmentName: 'Engineering'
      };

      app.onUserCreated(newUser);
      expect(app.alertMessage).toContain("User 'Neo Anderson' created successfully as EMPLOYEE");
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should update request budget when onAdminBudgetUpdated is triggered in admin portal', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.requests = [mockRequest];
      app.onAdminBudgetUpdated({ requestId: 101, newBudget: 3500 });

      expect(travelRequestServiceMock.updateRequest).toHaveBeenCalledWith(
        101,
        expect.objectContaining({
          estimatedBudget: 3500
        })
      );
      expect(app.alertMessage).toContain('Estimated Budget for Request #101 updated to ₹3500.00');
    });

    it('should display User Role : User Name in header when logged in', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      app.userContext.loginWithUser(mockAdminUser);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      const userRoleNameEl = compiled.querySelector('.user-role-name');
      expect(userRoleNameEl?.textContent?.trim()).toBe('ADMIN : Dave Wilson');
    });

    it('should handle login and logout flows appropriately', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      // On login success for Manager
      app.onLoginSuccess(mockManagerUser);
      expect(app.activeTab).toBe('approvals');
      expect(app.alertMessage).toContain('Welcome back, Bob Miller! Logged in as MANAGER.');

      // On login success for Finance and Admin -> Approval Queue first
      app.userContext.loginWithUser(mockFinanceUser);
      app.onLoginSuccess(mockFinanceUser);
      fixture.detectChanges();
      expect(app.activeTab).toBe('approvals');

      app.userContext.loginWithUser(mockAdminUser);
      app.onLoginSuccess(mockAdminUser);
      fixture.detectChanges();
      expect(app.activeTab).toBe('approvals');

      const navButtons = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.corporate-nav-tabs .nav-link')
      ).map(el => (el.textContent || '').trim());
      expect(navButtons[0]).toContain('Approval Queue');

      // On logout
      const logoutSpy = vi.spyOn(app.userContext, 'logout');
      app.logout();
      expect(logoutSpy).toHaveBeenCalled();
      expect(app.selectedRequest).toBeNull();
      expect(app.alertMessage).toContain('safely signed out');
    });

    it('should display splash screen initially with emblem and hide it after 3 seconds', () => {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      expect(app.showSplash).toBe(true);
      const compiled = fixture.nativeElement as HTMLElement;
      const splashLogo = compiled.querySelector('.splash-logo') as HTMLImageElement;
      expect(splashLogo).toBeTruthy();
      expect(splashLogo.getAttribute('src')).toContain('rishabh-splash-logo.png');

      // Fast-forward 2700ms -> fading
      vi.advanceTimersByTime(2700);
      expect(app.isFadingSplash).toBe(true);

      // Fast-forward past 3000ms -> hidden
      vi.advanceTimersByTime(350);
      expect(app.showSplash).toBe(false);

      vi.useRealTimers();
    });

    it('should directly render login page when not logged in after splash dismisses', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      app.showSplash = false;
      app.isLoggedIn = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.direct-login-view')).toBeTruthy();
      expect(compiled.querySelector('app-login')).toBeTruthy();
      expect(compiled.querySelector('.corporate-header')).toBeNull();
    });

    it('should switch to profile tab and handle onProfileUpdated', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.activeTab = 'profile';
      expect(app.activeTab).toBe('profile');

      const updatedUser: CurrentUser = {
        id: 2,
        fullName: 'Alice Updated',
        email: 'alice.updated@company.com',
        role: Role.EMPLOYEE,
        departmentName: 'Engineering'
      };

      app.onProfileUpdated(updatedUser);
      expect(app.currentUser).toBe(updatedUser);
      expect(app.alertMessage).toContain('Profile details for Alice Updated updated successfully!');
      expect(app.alertType).toBe('success');
    });

    it('should switch to notifications tab before profile and manage user notifications', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.switchTab('notifications');
      expect(app.activeTab).toBe('notifications');
      expect(app.unreadNotificationCount).toBeGreaterThanOrEqual(0);
      expect(app.userNotifications).toBeDefined();

      app.notificationFilter = 'UNREAD';
      expect(app.filteredUserNotifications).toBeDefined();
    });

    it('should recalculate cost summary and department spends dynamically from active requests and reimbursed expenses', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.requests = [
        { ...mockRequest, id: 101, departmentName: 'Engineering', estimatedBudget: 1500, status: RequestStatus.APPROVED },
        { ...mockRequest, id: 102, departmentName: 'Sales', estimatedBudget: 2500, status: RequestStatus.APPROVED }
      ];

      // Save a reimbursed expense for Trip 101
      app.saveStoredExpenses(101, [
        {
          id: 501,
          travelRequestId: 101,
          category: ExpenseCategory.FOOD,
          amount: 450,
          status: ReimbursementStatus.REIMBURSED,
          receiptFileName: 'receipt.pdf',
          createdAt: new Date().toISOString()
        }
      ]);

      app.recalculateReports();

      expect(app.costSummary).toBeTruthy();
      expect(app.costSummary?.totalRequests).toBe(2);
      expect(app.costSummary?.totalActualReimbursedSpend).toBe(450);
      expect(app.costSummary?.totalEstimatedBudget).toBe(4000);

      // Verify department spends
      const engSpend = app.departmentSpends.find(d => d.departmentName.toLowerCase() === 'engineering');
      expect(engSpend).toBeTruthy();
      expect(engSpend?.totalTrips).toBe(1);
      expect(engSpend?.totalReimbursedSpend).toBe(450);

      const salesSpend = app.departmentSpends.find(d => d.departmentName.toLowerCase() === 'sales');
      expect(salesSpend).toBeTruthy();
      expect(salesSpend?.totalTrips).toBe(1);
      expect(salesSpend?.totalReimbursedSpend).toBe(0);
    });

    it('should update cost summary and department spends when Finance reimburses an expense', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.userContext.loginWithUser(mockFinanceUser);
      app.selectedRequest = { ...mockRequest, id: 201, departmentName: 'Engineering' };
      app.requests = [app.selectedRequest];

      app.expenses = [
        {
          id: 601,
          travelRequestId: 201,
          category: ExpenseCategory.STAY,
          amount: 320,
          status: ReimbursementStatus.APPROVED,
          createdAt: new Date().toISOString()
        }
      ];

      app.reimburseExpense(601);

      expect(app.expenses[0].status).toBe(ReimbursementStatus.REIMBURSED);
      expect(app.costSummary?.totalActualReimbursedSpend).toBeGreaterThanOrEqual(320);
      const engDept = app.departmentSpends.find(d => d.departmentName.toLowerCase() === 'engineering');
      expect(engDept?.totalReimbursedSpend).toBeGreaterThanOrEqual(320);
    });

    it('should add and delete itinerary segments via onAddSegment and onDeleteSegment', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      app.selectedRequest = { ...mockRequest, id: 301 };
      app.segments = [];

      // 1. Add segment
      const newSegDto = {
        segmentType: SegmentType.HOTEL,
        title: 'Hilton Hotel Stay',
        location: 'New York, NY',
        startTime: '2026-12-10T14:00',
        endTime: '2026-12-12T11:00',
        notes: '2 Nights reservation'
      };

      app.onAddSegment(newSegDto);
      expect(itineraryExpenseServiceMock.addSegment).toHaveBeenCalledWith(301, newSegDto);

      // 2. Delete segment
      app.segments = [
        { id: 101, travelRequestId: 301, segmentType: SegmentType.FLIGHT, title: 'Flight 101', location: 'NYC', startTime: '', endTime: '', notes: '' },
        { id: 102, travelRequestId: 301, segmentType: SegmentType.HOTEL, title: 'Hotel 102', location: 'NYC', startTime: '', endTime: '', notes: '' }
      ];

      app.onDeleteSegment(101);
      expect(itineraryExpenseServiceMock.deleteSegment).toHaveBeenCalledWith(101);
      expect(app.segments.length).toBe(1);
      expect(app.segments[0].id).toBe(102);
    });

    it('should flag policy violation warning and alert when submitting request over predefined budget limit', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const flaggedResponse: TravelRequestResponseDto = {
        ...mockRequest,
        id: 109,
        destination: 'Singapore',
        estimatedBudget: 3500,
        travelClass: TravelClass.ECONOMY,
        policyViolated: true,
        policyViolationReason: 'Estimated budget (₹3500.00) exceeds ECONOMY travel class max budget limit (₹2000.00)'
      };
      travelRequestServiceMock.createRequest.mockReturnValueOnce(of(flaggedResponse));
      travelRequestServiceMock.getAllRequests.mockReturnValueOnce(of([flaggedResponse]));

      app.currentUser = {
        id: 2,
        fullName: 'Alice Johnson',
        email: 'alice.employee@company.com',
        role: Role.EMPLOYEE,
        departmentName: 'Engineering',
        managerId: 1,
        financeId: 3
      };
      app.newRequest = {
        employeeId: 2,
        destination: 'Singapore',
        startDate: '2026-12-10',
        endDate: '2026-12-14',
        purpose: 'Regional Summit',
        estimatedBudget: 3500,
        travelClass: TravelClass.ECONOMY,
        draft: false
      };

      app.submitRequest(false);

      expect(app.alertType).toBe('warning');
      expect(app.alertMessage).toContain('Flagged Policy Violation');
      expect(app.alertMessage).toContain('exceeds ECONOMY travel class max budget limit');
      expect(app.requests[0].policyViolated).toBe(true);
    });

    it('should reject submission when Start Date is not after current date or End Date is not after Start Date', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomorrowIso = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

      app.newRequest = {
        employeeId: 2,
        destination: 'Boston',
        startDate: todayIso,
        endDate: tomorrowIso,
        purpose: 'Client Visit',
        estimatedBudget: 900,
        travelClass: TravelClass.ECONOMY,
        draft: false
      };

      app.submitRequest(false);
      expect(app.alertType).toBe('danger');
      expect(app.alertMessage).toBe('Start date must be after the current date.');
      expect(travelRequestServiceMock.createRequest).not.toHaveBeenCalled();

      app.newRequest.startDate = tomorrowIso;
      app.newRequest.endDate = tomorrowIso;

      app.submitRequest(false);
      expect(app.alertType).toBe('danger');
      expect(app.alertMessage).toBe('End date must be after the start date.');
      expect(travelRequestServiceMock.createRequest).not.toHaveBeenCalled();
    });

    it('should dispatch approval and rejection notifications across Manager, Finance, and Admin reviews', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const reviewSpy = vi.spyOn(app.notificationService, 'notifyRequestReviewed');

      // Admin approving a PENDING_FINANCE request must transition to APPROVED and dispatch notification
      app.currentUser = mockAdminUser;
      const financeStageReq: TravelRequestResponseDto = {
        ...mockRequest,
        id: 301,
        status: RequestStatus.PENDING_FINANCE
      };
      app.requests = [financeStageReq];
      travelRequestServiceMock.processApprovalAction.mockReturnValueOnce(of({ ...financeStageReq, status: RequestStatus.APPROVED }));

      app.reviewRequest(301, 'APPROVE');

      expect(financeStageReq.status).toBe(RequestStatus.APPROVED);
      expect(reviewSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 301, status: RequestStatus.APPROVED }),
        mockAdminUser,
        'APPROVE',
        expect.any(String)
      );

      // Finance rejecting a PENDING_FINANCE request dispatches REJECTION notification with comment
      app.currentUser = mockFinanceUser;
      const rejectReq: TravelRequestResponseDto = {
        ...mockRequest,
        id: 302,
        status: RequestStatus.PENDING_FINANCE
      };
      app.requests = [rejectReq];
      travelRequestServiceMock.processApprovalAction.mockReturnValueOnce(of({ ...rejectReq, status: RequestStatus.REJECTED }));

      app.reviewRequest(302, 'REJECT', 'Exceeds Q4 budget');

      expect(rejectReq.status).toBe(RequestStatus.REJECTED);
      expect(reviewSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 302, status: RequestStatus.REJECTED }),
        mockFinanceUser,
        'REJECT',
        'Exceeds Q4 budget'
      );
    });

    it('should show View Employee Details nav tab before My Profile for Finance and Admin only (not Manager or Employee)', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      // 1. Employee and Manager should NOT see View Employee Details nav and cannot switch to it
      for (const restrictedUser of [
        {
          id: 2,
          fullName: 'Alice Johnson',
          email: 'alice@company.com',
          role: Role.EMPLOYEE,
          departmentName: 'Engineering'
        },
        mockManagerUser
      ]) {
        app.clearAlert();
        app.userContext.loginWithUser(restrictedUser);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(app.canViewEmployeeDetails).toBe(false);
        const navText = (fixture.nativeElement as HTMLElement).querySelector('.corporate-nav-tabs')?.textContent || '';
        expect(navText).not.toContain('View Employee Details');
        app.switchTab('employee-details');
        expect(app.activeTab).not.toBe('employee-details');
        expect(app.alertType).toBe('danger');
      }

      // 2. Finance and Admin SHOULD see View Employee Details directly before My Profile
      for (const reviewer of [mockFinanceUser, mockAdminUser]) {
        app.userContext.loginWithUser(reviewer);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(app.canViewEmployeeDetails).toBe(true);
        const navButtons = Array.from(
          (fixture.nativeElement as HTMLElement).querySelectorAll('.corporate-nav-tabs .nav-link')
        ).map(el => (el.textContent || '').trim());
        const empIdx = navButtons.findIndex(t => t.includes('View Employee Details'));
        const profIdx = navButtons.findIndex(t => t.includes('My Profile'));
        expect(empIdx).toBeGreaterThan(-1);
        expect(profIdx).toBeGreaterThan(-1);
        expect(empIdx).toBe(profIdx - 1);

        app.switchTab('employee-details');
        expect(app.activeTab).toBe('employee-details');
      }
    });

    it('should update request priority via onTogglePriority for all request statuses with 404/500 fallback', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      const pendingReq: TravelRequestResponseDto = { ...mockRequest, id: 101, priorityRequest: false, status: RequestStatus.PENDING_MANAGER };
      const approvedReq: TravelRequestResponseDto = { ...mockRequest, id: 103, priorityRequest: false, status: RequestStatus.APPROVED };
      app.requests = [pendingReq, approvedReq];

      app.onTogglePriority({ request: pendingReq, priorityRequest: true });
      expect(travelRequestServiceMock.updatePriority).toHaveBeenCalledWith(101, true);
      expect(app.requests.find(r => r.id === 101)?.priorityRequest).toBe(true);
      expect(app.alertType).toBe('success');

      app.onTogglePriority({ request: approvedReq, priorityRequest: true });
      expect(travelRequestServiceMock.updatePriority).toHaveBeenCalledWith(103, true);
      expect(app.requests.find(r => r.id === 103)?.priorityRequest).toBe(true);

      // Falls back to PUT updateRequest if older backend returns 500 "No static resource"
      travelRequestServiceMock.updatePriority.mockReturnValueOnce(throwError(() => ({
        status: 500,
        error: { message: "No static resource api/travel-requests/101/priority for request '/api/travel-requests/101/priority'." }
      })));
      app.onTogglePriority({ request: pendingReq, priorityRequest: false });
      expect(travelRequestServiceMock.updateRequest).toHaveBeenCalledWith(101, expect.objectContaining({
        priorityRequest: false
      }));
    });
  });
});
