import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripDetailsComponent } from './trip-details.component';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { RequestStatus, TravelClass, Role, ExpenseCategory, SegmentType } from '../models/enums.model';
import { CurrentUser } from '../services/user-context.service';

describe('TripDetailsComponent', () => {
  let component: TripDetailsComponent;
  let fixture: ComponentFixture<TripDetailsComponent>;

  const mockFinanceUser: CurrentUser = {
    id: 3,
    fullName: 'Carol Finance',
    email: 'carol@company.com',
    role: Role.FINANCE,
    departmentName: 'Finance'
  };

  const sampleRequest: TravelRequestResponseDto = {
    id: 20,
    employeeId: 2,
    employeeName: 'Alice',
    departmentName: 'Engineering',
    destination: 'Madrid',
    startDate: '2026-12-10',
    endDate: '2026-12-15',
    purpose: 'Summit',
    estimatedBudget: 2000,
    travelClass: TravelClass.BUSINESS,
    status: RequestStatus.APPROVED,
    financeId: 3,
    financeName: 'Carol Finance',
    policyViolated: false,
    createdAt: '2026-11-01T10:00:00',
    updatedAt: '2026-11-01T10:00:00'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripDetailsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TripDetailsComponent);
    component = fixture.componentInstance;
    component.selectedRequest = sampleRequest;
    component.currentUser = mockFinanceUser;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly identify finance role', () => {
    expect(component.isFinance).toBe(true);
  });

  it('should emit toggleAddExpense and addExpense events', () => {
    const toggleSpy = vi.fn();
    const addSpy = vi.fn();
    component.toggleAddExpense.subscribe(toggleSpy);
    component.addExpense.subscribe(addSpy);

    component.onToggleAddExpenseForm();
    expect(toggleSpy).toHaveBeenCalled();

    component.onSubmitExpense();
    expect(addSpy).toHaveBeenCalled();
  });

  it('should emit expense approval, rejection, and reimbursement events', () => {
    const approveSpy = vi.fn();
    const rejectSpy = vi.fn();
    const reimburseSpy = vi.fn();

    component.approveExpense.subscribe(approveSpy);
    component.rejectExpense.subscribe(rejectSpy);
    component.reimburseExpense.subscribe(reimburseSpy);

    component.onApproveExpense(101);
    expect(approveSpy).toHaveBeenCalledWith(101);

    component.onRejectExpense(101);
    expect(rejectSpy).toHaveBeenCalledWith(101);

    component.onReimburseExpense(101);
    expect(reimburseSpy).toHaveBeenCalledWith(101);
  });

  it('should handle PDF file selection, reject non-PDF files, and remove PDF', () => {
    // Non-PDF file selection
    const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
    const mockTxtEvent = { target: { files: [textFile] } } as unknown as Event;

    component.onFileSelected(mockTxtEvent);
    expect(component.pdfUploadError).toContain('Please upload a PDF document');
    expect(component.selectedPdfFile).toBeNull();

    // Valid PDF file selection
    const pdfFile = new File(['%PDF-1.4 simulated content'], 'invoice_flight.pdf', { type: 'application/pdf' });
    const mockPdfEvent = { target: { files: [pdfFile] } } as unknown as Event;

    component.onFileSelected(mockPdfEvent);
    expect(component.pdfUploadError).toBeNull();
    expect(component.selectedPdfFile).toBe(pdfFile);
    expect(component.selectedPdfName).toBe('invoice_flight.pdf');

    // Remove PDF
    component.removeSelectedPdf();
    expect(component.selectedPdfFile).toBeNull();
    expect(component.selectedPdfName).toBe('');
    expect(component.expenseClaim.receiptFileUrl).toBe('');
  });

  it('should ensure payment reason and bill receipt filename upon onSubmitExpense', () => {
    const addSpy = vi.fn();
    component.addExpense.subscribe(addSpy);

    component.expenseClaim.paymentReason = 'Client dinner with Acme Corp leadership';
    component.onSubmitExpense();

    expect(component.expenseClaim.paymentReason).toBe('Client dinner with Acme Corp leadership');
    expect(component.expenseClaim.receiptFileName).toBeTruthy();
    expect(addSpy).toHaveBeenCalled();
  });

  it('should open and close the PDF preview modal', () => {
    const mockExpense = {
      id: 55,
      travelRequestId: 20,
      category: ExpenseCategory.FOOD,
      amount: 120,
      receiptFileName: 'hotel_tax_bill.pdf',
      receiptFileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      paymentReason: 'Accommodation near client office',
      status: component.expenseCategories[0] as any,
      createdAt: '2026-11-01T12:00:00'
    };

    component.openPdfPreview(mockExpense);
    expect(component.previewingExpense).toBe(mockExpense);
    expect(component.safePdfUrl).toBeTruthy();

    component.closePdfPreview();
    expect(component.previewingExpense).toBeNull();
    expect(component.safePdfUrl).toBeNull();
  });

  it('should restrict isAssignedFinance strictly to the designated finance officer', () => {
    // mockFinanceUser has id: 3, matching sampleRequest.financeId: 3
    component.currentUser = mockFinanceUser;
    expect(component.isAssignedFinance).toBe(true);

    // Another finance officer with id: 7 is NOT assigned to this trip
    component.currentUser = { id: 7, fullName: 'Other Finance', email: 'other@co.com', role: Role.FINANCE, departmentName: 'Finance' };
    expect(component.isAssignedFinance).toBe(false);

    // Admin has full authority
    component.currentUser = { id: 4, fullName: 'Admin', email: 'admin@co.com', role: Role.ADMIN, departmentName: 'Admin' };
    expect(component.isAssignedFinance).toBe(true);
  });

  it('should handle reimbursement submission calculations and conditions', () => {
    // Set current user as the traveler (Alice, id: 2)
    component.currentUser = { id: 2, fullName: 'Alice', email: 'alice@co.com', role: Role.EMPLOYEE, departmentName: 'Engineering' };

    // 1. When trip is APPROVED and has expenses, canSubmitReimbursement is true
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.APPROVED };
    component.expenses = [
      { id: 1, travelRequestId: 20, category: ExpenseCategory.FOOD, amount: 150, status: 'APPROVED' as any, createdAt: '' },
      { id: 2, travelRequestId: 20, category: ExpenseCategory.TRANSPORT, amount: 50, status: 'PENDING' as any, createdAt: '' }
    ];

    expect(component.canSubmitReimbursement).toBe(true);
    expect(component.totalExpensesAmount).toBe(200);
    expect(component.pendingReimbursementAmount).toBe(200);
    expect(component.totalReimbursedAmount).toBe(0);

    // 2. When trip is not approved (e.g. PENDING_MANAGER), canSubmitReimbursement is false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_MANAGER };
    expect(component.canSubmitReimbursement).toBe(false);

    // 3. When expenses list is empty, canSubmitReimbursement is false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.APPROVED };
    component.expenses = [];
    expect(component.canSubmitReimbursement).toBe(false);

    // 4. When all expenses are already REIMBURSED, canSubmitReimbursement is false and allExpensesReimbursed is true
    component.expenses = [
      { id: 1, travelRequestId: 20, category: ExpenseCategory.FOOD, amount: 150, status: 'REIMBURSED' as any, createdAt: '' }
    ];
    expect(component.allExpensesReimbursed).toBe(true);
    expect(component.canSubmitReimbursement).toBe(false);
  });

  it('should emit submitReimbursementClaim when onSubmitReimbursementClaim is called', () => {
    // Set current user as the traveler (Alice, id: 2)
    component.currentUser = { id: 2, fullName: 'Alice', email: 'alice@co.com', role: Role.EMPLOYEE, departmentName: 'Engineering' };
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.APPROVED };
    component.expenses = [
      { id: 1, travelRequestId: 20, category: ExpenseCategory.FOOD, amount: 150, status: 'APPROVED' as any, createdAt: '' }
    ];

    const claimSpy = vi.fn();
    component.submitReimbursementClaim.subscribe(claimSpy);

    component.onSubmitReimbursementClaim();
    expect(claimSpy).toHaveBeenCalledWith(component.selectedRequest);
  });

  it('should manage itinerary segments and emit add/delete events', () => {
    // 1. Initial form state
    expect(component.showAddSegmentForm).toBe(false);
    component.onToggleAddSegmentForm();
    expect(component.showAddSegmentForm).toBe(true);

    // 2. Icon helper
    expect(component.getSegmentIcon(SegmentType.FLIGHT)).toBe('bi-airplane-fill text-primary');
    expect(component.getSegmentIcon(SegmentType.HOTEL)).toBe('bi-building text-warning');
    expect(component.getSegmentIcon(SegmentType.CAB)).toBe('bi-taxi-front-fill text-success');
    expect(component.getSegmentIcon(SegmentType.TRAIN)).toBe('bi-train-front-fill text-info');
    expect(component.getSegmentIcon(SegmentType.FOOD)).toBe('bi-cup-hot-fill text-danger');
    expect(component.segmentTypes).toContain(SegmentType.FOOD);

    // 3. Emit addSegment
    const addSpy = vi.fn();
    component.addSegment.subscribe(addSpy);

    component.newSegment = {
      segmentType: SegmentType.FLIGHT,
      title: 'Flight AI-502',
      location: 'Bengaluru',
      startTime: '2026-12-10T09:00',
      endTime: '2026-12-10T11:30',
      notes: 'Terminal 2'
    };

    component.onSubmitSegment();
    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({
      segmentType: SegmentType.FLIGHT,
      title: 'Flight AI-502'
    }));
    expect(component.showAddSegmentForm).toBe(false);

    // 4. Emit deleteSegment
    const deleteSpy = vi.fn();
    component.deleteSegment.subscribe(deleteSpy);
    component.onDeleteSegment(42);
    expect(deleteSpy).toHaveBeenCalledWith(42);
  });

  it('should correctly evaluate isManagerApproved based on request status', () => {
    // Approved status -> true
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.APPROVED };
    expect(component.isManagerApproved).toBe(true);

    // Pending finance (manager has already approved) -> true
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_FINANCE };
    expect(component.isManagerApproved).toBe(true);

    // Pending manager approval -> false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_MANAGER };
    expect(component.isManagerApproved).toBe(false);

    // Draft or Rejected -> false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.DRAFT };
    expect(component.isManagerApproved).toBe(false);

    component.selectedRequest = { ...sampleRequest, status: RequestStatus.REJECTED };
    expect(component.isManagerApproved).toBe(false);

    // Null request -> false
    component.selectedRequest = null;
    expect(component.isManagerApproved).toBe(false);
  });

  it('should block adding itinerary segments if request is not manager approved', () => {
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_MANAGER };
    component.showAddSegmentForm = false;

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const addSpy = vi.fn();
    component.addSegment.subscribe(addSpy);

    // Attempt to open form
    component.onToggleAddSegmentForm();
    expect(component.showAddSegmentForm).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('only be added after this travel request is approved by your Manager'));

    // Attempt to submit
    component.onSubmitSegment();
    expect(addSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should handle itinerary segment PDF proof upload, rejection, and removal', () => {
    // Non-PDF file selection
    const textFile = new File(['flight ticket'], 'ticket.txt', { type: 'text/plain' });
    const mockTxtEvent = { target: { files: [textFile] } } as unknown as Event;

    component.onSegmentFileSelected(mockTxtEvent);
    expect(component.segmentPdfUploadError).toContain('Please upload a PDF document');
    expect(component.selectedSegmentPdfFile).toBeNull();

    // Valid PDF selection
    const pdfFile = new File(['%PDF-1.4 simulated ticket'], 'flight_ai502_ticket.pdf', { type: 'application/pdf' });
    const mockPdfEvent = { target: { files: [pdfFile] } } as unknown as Event;

    component.onSegmentFileSelected(mockPdfEvent);
    expect(component.segmentPdfUploadError).toBeNull();
    expect(component.selectedSegmentPdfFile).toBe(pdfFile);
    expect(component.selectedSegmentPdfName).toBe('flight_ai502_ticket.pdf');

    // Remove PDF
    component.removeSelectedSegmentPdf();
    expect(component.selectedSegmentPdfFile).toBeNull();
    expect(component.selectedSegmentPdfName).toBe('');
    expect(component.newSegment.proofFileUrl).toBe('');
    expect(component.newSegment.proofFileName).toBe('');
  });

  it('should open, preview, download, and close itinerary segment PDF modal', () => {
    const mockSeg = {
      id: 99,
      travelRequestId: 20,
      segmentType: SegmentType.FLIGHT,
      title: 'Flight AI-502',
      location: 'Bengaluru',
      startTime: '2026-12-10T09:00',
      endTime: '2026-12-10T11:30',
      purposeOfWork: 'Technical meeting',
      notes: 'Terminal 2',
      proofFileName: 'booking_ai502.pdf',
      proofFileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...'
    };

    component.openSegmentPdfPreview(mockSeg);
    expect(component.previewingSegment).toBe(mockSeg);
    expect(component.safeSegmentPdfUrl).toBeTruthy();

    // Download/Open helper
    const openSpy = vi.spyOn(document, 'createElement');
    component.downloadOrOpenSegmentPdf(mockSeg);
    expect(openSpy).toHaveBeenCalledWith('a');

    component.closeSegmentPdfPreview();
    expect(component.previewingSegment).toBeNull();
    expect(component.safeSegmentPdfUrl).toBeNull();
  });

  it('should correctly evaluate isFinanceApproved based on request status', () => {
    // Approved status -> true (Finance has approved)
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.APPROVED };
    expect(component.isFinanceApproved).toBe(true);

    // Pending finance (Manager approved, but Finance not yet) -> false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_FINANCE };
    expect(component.isFinanceApproved).toBe(false);

    // Pending manager approval -> false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_MANAGER };
    expect(component.isFinanceApproved).toBe(false);

    // Draft or Rejected -> false
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.DRAFT };
    expect(component.isFinanceApproved).toBe(false);

    component.selectedRequest = { ...sampleRequest, status: RequestStatus.REJECTED };
    expect(component.isFinanceApproved).toBe(false);

    // Null request -> false
    component.selectedRequest = null;
    expect(component.isFinanceApproved).toBe(false);
  });

  it('should block adding expenses if request is not finance approved', () => {
    // Even if manager approved (PENDING_FINANCE), finance has not approved yet
    component.selectedRequest = { ...sampleRequest, status: RequestStatus.PENDING_FINANCE };
    component.showAddExpenseForm = false;

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const toggleSpy = vi.fn();
    const addSpy = vi.fn();

    component.toggleAddExpense.subscribe(toggleSpy);
    component.addExpense.subscribe(addSpy);

    // Attempt to open expense claim form
    component.onToggleAddExpenseForm();
    expect(toggleSpy).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('only be submitted after this travel request is approved by Finance'));

    // Attempt to submit expense claim
    component.onSubmitExpense();
    expect(addSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should hide Assigned Finance Officer details when logged in as EMPLOYEE', () => {
    fixture.componentRef.setInput('currentUser', {
      id: 2,
      fullName: 'Alice',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      managerName: 'Bob Miller',
      financeId: 3,
      financeName: 'Carol Finance'
    });
    component.selectedRequest = { ...sampleRequest };
    component.expenses = [{
      id: 101,
      travelRequestId: 20,
      category: ExpenseCategory.FOOD,
      amount: 500,
      receiptFileName: 'meal.pdf',
      receiptFileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
      paymentReason: 'Client dinner',
      status: 'PENDING' as any,
      createdAt: '2026-12-11T10:00:00'
    }];
    component.reimbursementRequested = true;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(component.isEmployee).toBe(true);
    expect(text).not.toContain('Assigned Finance Officer:');
    expect(text).not.toContain('Carol Finance');
    expect(text).toContain('Awaiting Finance');
  });
});
