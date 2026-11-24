import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApprovalQueueComponent } from './approval-queue.component';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { RequestStatus, TravelClass, Role } from '../models/enums.model';
import { CurrentUser } from '../services/user-context.service';

describe('ApprovalQueueComponent', () => {
  let component: ApprovalQueueComponent;
  let fixture: ComponentFixture<ApprovalQueueComponent>;

  const mockManagerUser: CurrentUser = {
    id: 2,
    fullName: 'Manager Bob',
    email: 'bob@company.com',
    role: Role.MANAGER,
    departmentName: 'Engineering'
  };

  const sampleRequest: TravelRequestResponseDto = {
    id: 10,
    employeeId: 3,
    employeeName: 'Charlie',
    departmentName: 'Engineering',
    destination: 'Berlin',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    purpose: 'Tech Sprint',
    estimatedBudget: 800,
    travelClass: TravelClass.ECONOMY,
    status: RequestStatus.PENDING_MANAGER,
    managerId: 2,
    managerName: 'Manager Bob',
    financeId: 3,
    financeName: 'Carol Davis',
    policyViolated: false,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  const sampleRequestOtherManager: TravelRequestResponseDto = {
    id: 11,
    employeeId: 5,
    employeeName: 'David',
    departmentName: 'Product',
    destination: 'Tokyo',
    startDate: '2026-12-10',
    endDate: '2026-12-15',
    purpose: 'Client Meeting',
    estimatedBudget: 2000,
    travelClass: TravelClass.BUSINESS,
    status: RequestStatus.PENDING_MANAGER,
    managerId: 99,
    managerName: 'Other Manager',
    financeId: 3,
    financeName: 'Carol Davis',
    policyViolated: false,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalQueueComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ApprovalQueueComponent);
    component = fixture.componentInstance;
    component.requests = [sampleRequest, sampleRequestOtherManager];
    component.currentUser = mockManagerUser;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should filter requests so manager only sees requests routed to them', () => {
    // mockManagerUser has id 2
    expect(component.filteredRequests.length).toBe(1);
    expect(component.filteredRequests[0].id).toBe(10);
  });

  it('should allow admin to see all requests', () => {
    component.currentUser = {
      id: 4,
      fullName: 'Admin User',
      email: 'admin@company.com',
      role: Role.ADMIN,
      departmentName: 'Management'
    };
    expect(component.filteredRequests.length).toBe(2);
  });

  it('should allow finance officer to see only requests routed to their financeId', () => {
    component.currentUser = {
      id: 3,
      fullName: 'Carol Davis',
      email: 'carol@company.com',
      role: Role.FINANCE,
      departmentName: 'Finance'
    };
    // Both sampleRequest and sampleRequestOtherManager have financeId: 3
    expect(component.filteredRequests.length).toBe(2);

    // Another finance user with id 88 sees 0
    component.currentUser = {
      id: 88,
      fullName: 'Other Finance',
      email: 'otherfin@company.com',
      role: Role.FINANCE,
      departmentName: 'Finance'
    };
    expect(component.filteredRequests.length).toBe(0);
  });

  it('should accurately authorize canApprove for assigned reviewer', () => {
    // mockManagerUser (id: 2) can approve sampleRequest (managerId: 2, status: PENDING_MANAGER)
    component.currentUser = mockManagerUser;
    expect(component.canApprove(sampleRequest)).toBe(true);

    // mockManagerUser cannot approve request assigned to manager 99
    expect(component.canApprove(sampleRequestOtherManager)).toBe(false);

    // When status is PENDING_FINANCE, manager cannot approve even if assigned
    const pendingFinanceReq: TravelRequestResponseDto = {
      ...sampleRequest,
      status: RequestStatus.PENDING_FINANCE
    };
    expect(component.canApprove(pendingFinanceReq)).toBe(false);
  });

  it('should emit approve event when onApprove is called', () => {
    const approveSpy = vi.fn();
    component.approve.subscribe(approveSpy);

    component.onApprove(10);
    expect(approveSpy).toHaveBeenCalledWith(10);
  });

  it('should emit openRejectModal event when onOpenReject is called', () => {
    const rejectSpy = vi.fn();
    component.openRejectModal.subscribe(rejectSpy);

    component.onOpenReject(sampleRequest);
    expect(rejectSpy).toHaveBeenCalledWith(sampleRequest);
  });

  it('should emit confirmReject and cancelReject events', () => {
    const confirmSpy = vi.fn();
    const cancelSpy = vi.fn();
    component.confirmReject.subscribe(confirmSpy);
    component.cancelReject.subscribe(cancelSpy);

    component.onConfirmReject();
    expect(confirmSpy).toHaveBeenCalled();

    component.onCancelRejection();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should emit viewTripDetails event when onViewTripDetails is called', () => {
    const viewSpy = vi.fn();
    component.viewTripDetails.subscribe(viewSpy);

    component.onViewTripDetails(sampleRequest);
    expect(viewSpy).toHaveBeenCalledWith(sampleRequest);
  });

  it('should show employee their own requests in approval queue and allow viewing all via queueScope', () => {
    component.currentUser = {
      id: 3, // Matches sampleRequest.employeeId: 3
      fullName: 'Charlie',
      email: 'charlie@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering'
    };

    // In ASSIGNED mode, employee sees their own request (id: 10)
    expect(component.filteredRequests.length).toBe(1);
    expect(component.filteredRequests[0].id).toBe(10);

    // Switching to ALL mode shows all requests
    component.queueScope = 'ALL';
    expect(component.filteredRequests.length).toBe(2);
  });
});
