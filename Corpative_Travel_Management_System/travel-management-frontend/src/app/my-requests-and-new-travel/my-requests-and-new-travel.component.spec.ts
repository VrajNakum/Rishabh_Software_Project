import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyRequestsAndNewTravelComponent } from './my-requests-and-new-travel.component';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { RequestStatus, TravelClass, Role } from '../models/enums.model';
import { CurrentUser } from '../services/user-context.service';

describe('MyRequestsAndNewTravelComponent', () => {
  let component: MyRequestsAndNewTravelComponent;
  let fixture: ComponentFixture<MyRequestsAndNewTravelComponent>;

  const mockEmployeeUser: CurrentUser = {
    id: 2,
    fullName: 'Alice',
    email: 'alice@company.com',
    role: Role.EMPLOYEE,
    departmentName: 'Engineering'
  };

  const sampleRequests: TravelRequestResponseDto[] = [
    {
      id: 1,
      employeeId: 2,
      employeeName: 'Alice',
      departmentName: 'Engineering',
      destination: 'London',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      purpose: 'Meeting',
      estimatedBudget: 1000,
      travelClass: TravelClass.ECONOMY,
      status: RequestStatus.DRAFT,
      policyViolated: false,
      createdAt: '2026-11-01T10:00:00',
      updatedAt: '2026-11-01T10:00:00'
    },
    {
      id: 2,
      employeeId: 2,
      employeeName: 'Alice',
      departmentName: 'Engineering',
      destination: 'Paris',
      startDate: '2026-11-16',
      endDate: '2026-11-20',
      purpose: 'Conference',
      estimatedBudget: 1500,
      travelClass: TravelClass.BUSINESS,
      status: RequestStatus.APPROVED,
      policyViolated: false,
      createdAt: '2026-11-01T10:00:00',
      updatedAt: '2026-11-01T10:00:00'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyRequestsAndNewTravelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyRequestsAndNewTravelComponent);
    component = fixture.componentInstance;
    component.requests = sampleRequests;
    component.currentUser = mockEmployeeUser;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute status counts and filter correctly', () => {
    expect(component.countDraft).toBe(1);
    expect(component.countApproved).toBe(1);
    expect(component.countPending).toBe(0);
    expect(component.countRejected).toBe(0);

    component.statusFilter = 'DRAFT';
    expect(component.filteredRequests.length).toBe(1);
    expect(component.filteredRequests[0].id).toBe(1);
  });

  it('should emit submitRequest event with draft mode', () => {
    const submitSpy = vi.fn();
    component.submitRequest.subscribe(submitSpy);

    component.onFormSubmit(false);
    expect(submitSpy).toHaveBeenCalledWith(false);

    component.onFormSubmit(true);
    expect(submitSpy).toHaveBeenCalledWith(true);
  });

  it('should emit loadDraft event when draft is clicked', () => {
    const loadSpy = vi.fn();
    component.loadDraft.subscribe(loadSpy);

    component.onLoadDraft(sampleRequests[0]);
    expect(loadSpy).toHaveBeenCalledWith(sampleRequests[0]);
  });

  it('should emit viewTripDetails and deleteRequest events', () => {
    const viewSpy = vi.fn();
    const deleteSpy = vi.fn();
    component.viewTripDetails.subscribe(viewSpy);
    component.deleteRequest.subscribe(deleteSpy);

    component.onViewTripDetails(sampleRequests[1]);
    expect(viewSpy).toHaveBeenCalledWith(sampleRequests[1]);

    component.onDeleteRequest(sampleRequests[0]);
    expect(deleteSpy).toHaveBeenCalledWith(sampleRequests[0]);
  });

  it('should isolate records so each employee only sees their own travel requests', () => {
    const mixedRequests: TravelRequestResponseDto[] = [
      ...sampleRequests, // Alice's requests (id: 1, 2, employeeId: 2)
      {
        id: 99,
        employeeId: 5,
        employeeName: 'Sarah Connor',
        departmentName: 'Engineering',
        destination: 'Tokyo',
        startDate: '2026-12-01',
        endDate: '2026-12-05',
        purpose: 'Keynote',
        estimatedBudget: 3000,
        travelClass: TravelClass.BUSINESS,
        status: RequestStatus.PENDING_MANAGER,
        policyViolated: false,
        createdAt: '2026-11-01T10:00:00',
        updatedAt: '2026-11-01T10:00:00'
      }
    ];

    component.requests = mixedRequests;
    component.currentUser = mockEmployeeUser; // Alice (id: 2)

    // Alice should only see her 2 requests, NOT Sarah Connor's request #99
    expect(component.myRequests.length).toBe(2);
    expect(component.myRequests.some(r => r.id === 99)).toBe(false);

    // Switch currentUser to Sarah Connor (id: 5)
    component.currentUser = {
      id: 5,
      fullName: 'Sarah Connor',
      email: 'sarah@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering'
    };

    // Sarah Connor should only see her 1 request, NOT Alice's requests
    expect(component.myRequests.length).toBe(1);
    expect(component.myRequests[0].id).toBe(99);
  });
});
