import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, skip } from 'rxjs';
import { TravelRequestService } from './services/travel-request.service';
import { ItineraryExpenseService } from './services/itinerary-expense.service';
import { ReportService } from './services/report.service';
import { UserContextService, CurrentUser } from './services/user-context.service';
import { TravelClass, ExpenseCategory, ReimbursementStatus, Role, RequestStatus, SegmentType } from './models/enums.model';
import { TravelRequestCreateDto, TravelRequestResponseDto, ApprovalAuditLogDto, PredefinedTravelPolicyDto } from './models/travel-request.model';
import { ExpenseCreateDto, ExpenseResponseDto, ItinerarySegmentResponseDto, ItinerarySegmentRequestDto } from './models/itinerary-expense.model';
import { CostSummaryReportDto, DepartmentSpendDto } from './models/reports.model';
import { getStatusIcon, formatStatusLabel, evaluateTravelPolicy, DEFAULT_PREDEFINED_POLICIES } from './shared/status-utils';
import { MyRequestsAndNewTravelComponent } from './my-requests-and-new-travel/my-requests-and-new-travel.component';
import { ApprovalQueueComponent } from './approval-queue/approval-queue.component';
import { TripDetailsComponent } from './trip-details/trip-details.component';
import { CostAndAnalyticsComponent } from './cost-and-analytics/cost-and-analytics.component';
import { AdminPortalComponent } from './admin-portal/admin-portal.component';
import { LoginComponent } from './login/login.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { NotificationCenterComponent } from './notifications/notification-center.component';
import { EmployeeDetailsComponent } from './employee-details/employee-details.component';
import { NotificationService } from './services/notification.service';
import { AppNotification } from './models/notification.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MyRequestsAndNewTravelComponent,
    ApprovalQueueComponent,
    TripDetailsComponent,
    CostAndAnalyticsComponent,
    AdminPortalComponent,
    LoginComponent,
    MyProfileComponent,
    NotificationCenterComponent,
    EmployeeDetailsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  activeTab: 'requests' | 'approvals' | 'trip-details' | 'reports' | 'notifications' | 'employee-details' | 'admin' | 'profile' = 'requests';
  notificationFilter: 'ALL' | 'UNREAD' = 'ALL';
  currentUser: CurrentUser;
  isLoggedIn = false;
  isLoggingOut = false;

  // Splash Screen State (3 Seconds Duration)
  showSplash = true;
  isFadingSplash = false;
  private splashTimeoutId: any = null;
  private splashFadeTimeoutId: any = null;

  // Requests Data
  requests: TravelRequestResponseDto[] = [];
  policies: PredefinedTravelPolicyDto[] = [...DEFAULT_PREDEFINED_POLICIES];
  selectedRequest: TravelRequestResponseDto | null = null;
  auditLogs: ApprovalAuditLogDto[] = [];
  segments: ItinerarySegmentResponseDto[] = [];
  expenses: ExpenseResponseDto[] = [];
  private readonly EXPENSES_STORAGE_KEY = 'tms_corporate_expenses_store';

  // Status Filter for Fast Visibility: ALL, APPROVED, PENDING, DRAFT, REJECTED
  statusFilter: 'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED' = 'ALL';

  // Feedback, Alerts & Error Handling
  alertMessage: string | null = null;
  alertType: 'success' | 'danger' | 'warning' | 'info' = 'success';
  backendError: string | null = null;
  private alertTimeoutId: any = null;

  // Form State & Draft Editing State
  editingDraftId: number | null = null;
  isDeletingRequestId: number | null = null;

  // Backward compatibility alias for isDeletingDraftId
  get isDeletingDraftId(): number | null {
    return this.isDeletingRequestId;
  }
  set isDeletingDraftId(val: number | null) {
    this.isDeletingRequestId = val;
  }

  // "Once at a time" Button Click Execution Locks
  isSubmittingRequest: 'submit' | 'draft' | null = null;
  processingApprovalId: { [requestId: number]: 'APPROVE' | 'REJECT' } = {};
  isAddingExpense = false;
  reimbursingExpenseId: number | null = null;
  approvingExpenseId: number | null = null;
  rejectingExpenseId: number | null = null;
  isLoadingData = false;

  // Form Model
  newRequest: TravelRequestCreateDto = {
    employeeId: 2,
    destination: '',
    startDate: '',
    endDate: '',
    purpose: '',
    estimatedBudget: 500,
    travelClass: TravelClass.ECONOMY,
    draft: false
  };

  // Review Model & Rejection Comment Modal
  approvalComments = '';
  rejectingRequest: TravelRequestResponseDto | null = null;
  rejectionComment = '';
  expenseClaim: ExpenseCreateDto = {
    category: ExpenseCategory.FOOD,
    amount: 50,
    receiptFileUrl: '',
    receiptFileName: '',
    paymentReason: '',
    remarks: ''
  };
  showAddExpenseForm = false;
  isSubmittingReimbursement = false;
  reimbursementRequestedTripIds = new Set<number>();
  private readonly REIMBURSEMENT_STORAGE_KEY = 'tms_reimbursement_requested_trips_v1';

  // Reports Data
  costSummary: CostSummaryReportDto | null = {
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    totalEstimatedBudget: 0,
    totalActualReimbursedSpend: 0
  };
  departmentSpends: DepartmentSpendDto[] = [];

  travelClasses = Object.values(TravelClass);
  expenseCategories = Object.values(ExpenseCategory);

  getStatusIcon = getStatusIcon;
  formatStatusLabel = formatStatusLabel;

  constructor(
    public userContext: UserContextService,
    public notificationService: NotificationService,
    private travelRequestService: TravelRequestService,
    private itineraryExpenseService: ItineraryExpenseService,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.currentUser = this.userContext.currentUser;
  }

  ngOnInit(): void {
    // Initial state: not authenticated on fresh visit
    this.isLoggedIn = false;
    this.loadReimbursementRequestedTrips();

    // Splash screen runs for 3 seconds and directly redirects to Login Page
    this.ngZone.run(() => {
      this.splashFadeTimeoutId = setTimeout(() => {
        this.isFadingSplash = true;
        this.cdr.detectChanges();
      }, 2650);

      this.splashTimeoutId = setTimeout(() => {
        this.showSplash = false;
        this.isLoggedIn = false;
        this.cdr.detectChanges();
      }, 3000);
    });

    this.userContext.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.userContext.users$.subscribe(users => {
      const adminIds = (users || [])
        .filter(u => u.role === Role.ADMIN || (u.role as string) === 'ADMIN')
        .map(u => u.id);
      this.notificationService.setAdminUserIds(adminIds);
    });

    this.userContext.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!this.editingDraftId) {
        this.newRequest.employeeId = user.id;
      }
      if (!this.isAdmin && this.activeTab === 'admin') {
        this.activeTab = 'requests';
      }
      if (!this.canViewEmployeeDetails && this.activeTab === 'employee-details') {
        this.activeTab = 'requests';
      }
      this.loadData();
    });

    this.notificationService.notifications$?.pipe(skip(1)).subscribe(() => {
      this.cdr.markForCheck();
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.handleWindowFocus);
    }
  }

  private handleWindowFocus = (): void => {
    if (this.isLoggedIn && this.currentUser?.id) {
      this.notificationService.refreshForUser?.(this.currentUser.id);
    }
  };

  ngOnDestroy(): void {
    if (this.splashTimeoutId) clearTimeout(this.splashTimeoutId);
    if (this.splashFadeTimeoutId) clearTimeout(this.splashFadeTimeoutId);
    if (this.alertTimeoutId) clearTimeout(this.alertTimeoutId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.handleWindowFocus);
    }
  }

  // Status Filtering & Counts for Fast Visibility
  setStatusFilter(filter: 'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED'): void {
    this.statusFilter = filter;
  }

  get filteredRequests(): TravelRequestResponseDto[] {
    if (this.statusFilter === 'ALL') {
      return this.requests;
    }
    if (this.statusFilter === 'APPROVED') {
      return this.requests.filter(r => r.status === 'APPROVED');
    }
    if (this.statusFilter === 'PENDING') {
      return this.requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE');
    }
    if (this.statusFilter === 'DRAFT') {
      return this.requests.filter(r => r.status === 'DRAFT');
    }
    if (this.statusFilter === 'REJECTED') {
      return this.requests.filter(r => r.status === 'REJECTED');
    }
    return this.requests;
  }

  get countApproved(): number {
    return this.requests.filter(r => r.status === 'APPROVED').length;
  }

  get countPending(): number {
    return this.requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE').length;
  }

  get countPendingApprovalsForUser(): number {
    if (!this.currentUser) return 0;
    if (this.isAdmin) {
      return this.requests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE').length;
    }
    if (this.currentUser.role === Role.MANAGER) {
      return this.requests.filter(r => r.status === 'PENDING_MANAGER' && this.userContext.getAssignedManagerForRequest(r).id === this.currentUser.id).length;
    }
    if (this.currentUser.role === Role.FINANCE) {
      return this.requests.filter(r => r.status === 'PENDING_FINANCE' && this.userContext.getAssignedFinanceForRequest(r).id === this.currentUser.id).length;
    }
    return 0;
  }

  get countDraft(): number {
    return this.requests.filter(r => r.status === 'DRAFT').length;
  }

  get countRejected(): number {
    return this.requests.filter(r => r.status === 'REJECTED').length;
  }

  // Load a Draft from History directly into the Input form
  loadDraftIntoForm(req: TravelRequestResponseDto): void {
    if (req.status !== 'DRAFT') {
      this.showAlert('Only unsubmitted drafts can be loaded into the form.', 'warning');
      return;
    }

    this.editingDraftId = req.id;
    this.newRequest = {
      employeeId: req.employeeId,
      destination: req.destination,
      startDate: req.startDate,
      endDate: req.endDate,
      purpose: req.purpose,
      estimatedBudget: req.estimatedBudget,
      travelClass: req.travelClass,
      draft: true
    };
    this.activeTab = 'requests';
    this.showAlert(`Draft #${req.id} loaded into the input form. You can modify details and submit or save.`, 'info');
  }

  // Cancel editing the current draft and reset form to a blank state
  cancelEditDraft(): void {
    this.editingDraftId = null;
    this.newRequest = {
      employeeId: this.currentUser.id,
      destination: '',
      startDate: '',
      endDate: '',
      purpose: '',
      estimatedBudget: 500,
      travelClass: TravelClass.ECONOMY,
      draft: false
    };
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === Role.ADMIN || (this.currentUser?.role as string) === 'ADMIN';
  }

  get isFinance(): boolean {
    return this.currentUser?.role === Role.FINANCE || (this.currentUser?.role as string) === 'FINANCE';
  }

  get isManager(): boolean {
    return this.currentUser?.role === Role.MANAGER || (this.currentUser?.role as string) === 'MANAGER';
  }

  get isEmployee(): boolean {
    return this.currentUser?.role === Role.EMPLOYEE || (this.currentUser?.role as string) === 'EMPLOYEE';
  }

  get canViewEmployeeDetails(): boolean {
    return this.isManager || this.isFinance || this.isAdmin;
  }

  get canAddExpense(): boolean {
    return this.selectedRequest?.status === RequestStatus.APPROVED || (this.selectedRequest?.status as string) === 'APPROVED';
  }

  toggleAddExpenseForm(): void {
    this.showAddExpenseForm = !this.showAddExpenseForm;
  }

  canDeleteRequest(status: string | null | undefined): boolean {
    if (!this.isAdmin) {
      return false;
    }
    return true;
  }

  getDeleteTitle(status: string | null | undefined): string {
    switch (status) {
      case 'DRAFT': return 'Admin: Delete Draft from Database';
      case 'APPROVED': return 'Admin: Delete Approved Request from Database';
      case 'REJECTED': return 'Admin: Delete Rejected Request from Database';
      case 'PENDING_MANAGER': return 'Admin: Delete Pending Manager Request from Database';
      case 'PENDING_FINANCE': return 'Admin: Delete Pending Finance Request from Database';
      default: return 'Admin: Delete Request from Database';
    }
  }

  // --- Rejection Details & Feedback Getters ---
  get latestRejectionLog(): ApprovalAuditLogDto | undefined {
    if (!this.auditLogs || this.auditLogs.length === 0) {
      return undefined;
    }
    return this.auditLogs.find(
      log => log.newStatus === RequestStatus.REJECTED || (log.newStatus as string) === 'REJECTED'
    );
  }

  get rejectionReviewerName(): string {
    if (this.latestRejectionLog?.actionByUserName) {
      return this.latestRejectionLog.actionByUserName;
    }
    if (this.selectedRequest?.policyViolationReason?.includes('Rejected by')) {
      const match = this.selectedRequest.policyViolationReason.match(/Rejected by ([^:]+):/);
      if (match) return match[1].trim();
    }
    return 'Reviewer';
  }

  get rejectionFeedbackMessage(): string {
    if (this.latestRejectionLog?.comments) {
      return this.latestRejectionLog.comments;
    }
    if (this.selectedRequest?.policyViolationReason) {
      const colonIndex = this.selectedRequest.policyViolationReason.indexOf(':');
      if (colonIndex !== -1) {
        return this.selectedRequest.policyViolationReason.substring(colonIndex + 1).replace(/^["'\s]+|["'\s]+$/g, '').trim();
      }
      return this.selectedRequest.policyViolationReason;
    }
    return 'No specific comment provided.';
  }

  get rejectionTimestamp(): string | undefined {
    return this.latestRejectionLog?.actionTimestamp;
  }

  deleteRequest(req: TravelRequestResponseDto): void {
    if (!this.isAdmin) {
      this.showAlert('Unauthorized action: Only Admin can delete requests to manage the database internally.', 'danger');
      return;
    }

    const typeLabel = req.status === 'DRAFT'
      ? 'Draft'
      : (req.status === 'APPROVED' ? 'Approved request' : (req.status === 'REJECTED' ? 'Rejected request' : 'Request'));

    // 1. Instantly display success alert on button click
    this.showAlert(`${typeLabel} #${req.id} deleted successfully from internal database.`, 'success');

    // 2. Instantly update local requests array
    if (this.editingDraftId === req.id) {
      this.cancelEditDraft();
    }
    if (this.selectedRequest && this.selectedRequest.id === req.id) {
      this.selectedRequest = null;
      if (this.activeTab === 'trip-details') {
        this.activeTab = 'requests';
      }
    }
    this.requests = this.requests.filter(r => r.id !== req.id);
    this.isDeletingRequestId = null;
    this.cdr.detectChanges();

    // 3. Send HTTP delete in background
    this.travelRequestService.deleteRequest(req.id, this.currentUser.id).subscribe({
      next: () => {
        this.loadData();
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to delete ${typeLabel.toLowerCase()} #${req.id}`);
        this.showAlert(errMsg, 'danger', false);
        this.loadData();
      }
    });
  }

  deleteDraft(req: TravelRequestResponseDto): void {
    this.deleteRequest(req);
  }

  showAlert(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success', autoClose = true): void {
    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
      this.alertTimeoutId = null;
    }
    this.alertMessage = message;
    this.alertType = type;
    if (autoClose && (type === 'success' || type === 'info')) {
      this.alertTimeoutId = setTimeout(() => {
        this.alertMessage = null;
        this.alertTimeoutId = null;
      }, 5000);
    }
  }

  clearAlert(): void {
    if (this.alertTimeoutId) {
      clearTimeout(this.alertTimeoutId);
      this.alertTimeoutId = null;
    }
    this.alertMessage = null;
  }

  extractErrorMessage(err: any, fallbackMessage: string): string {
    if (!err) return fallbackMessage;
    if (err.status === 0) {
      return 'Backend server is unreachable (http://localhost:8080). Please ensure your Spring Boot service and PostgreSQL database are running.';
    }
    if (err.error) {
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
      if (err.error.error && typeof err.error.error === 'string') {
        return err.error.error;
      }
    }
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    return fallbackMessage;
  }

  switchUser(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.userContext.setCurrentUser(Number(select.value));
  }

  loadData(): void {
    this.isLoadingData = true;
    this.backendError = null;
    this.recalculateReports();
    this.userContext.refreshUsers().subscribe();
    if (this.currentUser?.id) {
      this.notificationService.refreshForUser?.(this.currentUser.id);
    }

    this.travelRequestService.getPolicies?.().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.policies = data;
        }
      },
      error: () => {
        // Keep default predefined policies on offline fallback
      }
    });

    this.travelRequestService.getAllRequests().subscribe({
      next: (data) => {
        this.requests = data;
        if (this.selectedRequest) {
          const fresh = data.find(r => r.id === this.selectedRequest!.id);
          if (fresh) {
            this.selectedRequest = fresh;
          }
        }
        this.isLoadingData = false;
        this.recalculateReports();
      },
      error: (err) => {
        this.isLoadingData = false;
        this.backendError = this.extractErrorMessage(err, 'Failed to load travel requests');
        console.error('Failed to load travel requests', err);
        if (!this.requests || this.requests.length === 0) {
          this.requests = this.getDefaultInitialRequests();
        }
        this.recalculateReports();
      }
    });

    this.reportService.getCostSummary().subscribe({
      next: (data) => {
        if (data) {
          this.mergeCostSummary(data);
        } else {
          this.recalculateReports();
        }
      },
      error: (err) => {
        console.error('Failed to load cost summary', err);
        this.recalculateReports();
      }
    });

    this.reportService.getDepartmentSpend().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.mergeDepartmentSpends(data);
        } else {
          this.recalculateDepartmentSpends();
        }
      },
      error: (err) => {
        console.error('Failed to load department spend', err);
        this.recalculateDepartmentSpends();
      }
    });
  }

  private getDefaultInitialRequests(): TravelRequestResponseDto[] {
    const today = new Date().toISOString().split('T')[0];
    const in5 = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
    const in10 = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const in19 = new Date(Date.now() + 19 * 86400000).toISOString().split('T')[0];
    const in25 = new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    return [
      {
        id: 1,
        employeeId: 2,
        employeeName: 'Alice Johnson',
        departmentName: 'Engineering',
        destination: 'San Francisco, CA',
        startDate: in5,
        endDate: in10,
        purpose: 'Attend AWS Cloud Architecture Summit and Enterprise Client Workshop',
        estimatedBudget: 1850,
        travelClass: TravelClass.ECONOMY,
        status: RequestStatus.APPROVED,
        policyViolated: false,
        createdAt: today,
        updatedAt: today
      },
      {
        id: 2,
        employeeId: 2,
        employeeName: 'Alice Johnson',
        departmentName: 'Engineering',
        destination: 'London, UK',
        startDate: in14,
        endDate: in19,
        purpose: 'European Client Discovery & Enterprise Security Review',
        estimatedBudget: 1600,
        travelClass: TravelClass.ECONOMY,
        status: RequestStatus.PENDING_MANAGER,
        policyViolated: false,
        createdAt: today,
        updatedAt: today
      },
      {
        id: 3,
        employeeId: 2,
        employeeName: 'Alice Johnson',
        departmentName: 'Engineering',
        destination: 'Tokyo, Japan',
        startDate: in25,
        endDate: in30,
        purpose: 'APAC Regional Partner Integration & Deployment',
        estimatedBudget: 1950,
        travelClass: TravelClass.ECONOMY,
        status: RequestStatus.PENDING_FINANCE,
        policyViolated: false,
        createdAt: today,
        updatedAt: today
      },
      {
        id: 4,
        employeeId: 2,
        employeeName: 'Alice Johnson',
        departmentName: 'Engineering',
        destination: 'Bengaluru, India',
        startDate: in30,
        endDate: in30,
        purpose: 'Quarterly Tech Council Workshop',
        estimatedBudget: 600,
        travelClass: TravelClass.ECONOMY,
        status: RequestStatus.DRAFT,
        policyViolated: false,
        createdAt: today,
        updatedAt: today
      }
    ];
  }

  submitRequest(draftMode: boolean): void {
    if (this.isSubmittingRequest !== null) {
      return;
    }

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (!draftMode) {
      if (!this.newRequest.destination?.trim()) {
        this.showAlert('Please provide a destination.', 'danger');
        return;
      }
      if (!this.newRequest.startDate || !this.newRequest.endDate) {
        this.showAlert('Please provide both start date and end date.', 'danger');
        return;
      }
      if (this.newRequest.startDate <= todayIso) {
        this.showAlert('Start date must be after the current date.', 'danger');
        return;
      }
      if (this.newRequest.endDate <= this.newRequest.startDate) {
        this.showAlert('End date must be after the start date.', 'danger');
        return;
      }
      if (!this.newRequest.estimatedBudget || this.newRequest.estimatedBudget <= 0) {
        this.showAlert('Estimated budget must be greater than 0.', 'danger');
        return;
      }
      if (!this.newRequest.purpose?.trim()) {
        this.showAlert('Please provide the travel purpose.', 'danger');
        return;
      }
    } else {
      if (this.newRequest.startDate && this.newRequest.startDate <= todayIso) {
        this.showAlert('Start date must be after the current date.', 'danger');
        return;
      }
      if (this.newRequest.startDate && this.newRequest.endDate &&
          this.newRequest.endDate <= this.newRequest.startDate) {
        this.showAlert('End date must be after the start date.', 'danger');
        return;
      }
    }

    const wasEditingDraft = this.editingDraftId !== null;
    const editingId = this.editingDraftId;
    const employeeId = this.newRequest.employeeId || this.currentUser.id;
    const policyEval = evaluateTravelPolicy(
      this.newRequest.travelClass,
      this.newRequest.estimatedBudget,
      this.policies
    );

    // 1. Instantly display success or policy violation warning alert on button click!
    const baseMessage = draftMode
      ? (wasEditingDraft ? `Draft #${editingId} updated successfully!` : 'Draft saved successfully!')
      : (wasEditingDraft ? `Draft #${editingId} submitted for approval successfully!` : 'Travel request submitted successfully!');
    if (policyEval.violated) {
      this.showAlert(`${baseMessage} Flagged Policy Violation: ${policyEval.reason}`, 'warning', false);
    } else {
      this.showAlert(baseMessage, 'success');
    }

    // 2. Prepare payload
    const payload: TravelRequestCreateDto = {
      employeeId: employeeId,
      destination: this.newRequest.destination,
      startDate: this.newRequest.startDate,
      endDate: this.newRequest.endDate,
      purpose: this.newRequest.purpose,
      estimatedBudget: this.newRequest.estimatedBudget,
      travelClass: this.newRequest.travelClass,
      draft: draftMode
    };

    // 3. Immediately clear & reset form
    this.cancelEditDraft();

    // 4. Optimistically update local requests array so it shows immediately in the table!
    const tempId = editingId ?? Date.now();
    const optimisticRequest: TravelRequestResponseDto = {
      id: tempId,
      employeeId: payload.employeeId,
      employeeName: this.currentUser.fullName,
      departmentName: this.currentUser.departmentName || 'Engineering',
      destination: payload.destination,
      startDate: payload.startDate,
      endDate: payload.endDate,
      purpose: payload.purpose,
      estimatedBudget: payload.estimatedBudget,
      travelClass: payload.travelClass,
      status: draftMode ? RequestStatus.DRAFT : RequestStatus.PENDING_MANAGER,
      managerId: this.currentUser.managerId ?? null,
      managerName: this.currentUser.managerName ?? null,
      financeId: this.currentUser.financeId ?? null,
      financeName: this.currentUser.financeName ?? null,
      policyViolated: policyEval.violated,
      policyViolationReason: policyEval.reason ?? undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (wasEditingDraft) {
      this.requests = this.requests.map(r => r.id === editingId ? optimisticRequest : r);
    } else {
      this.requests = [optimisticRequest, ...this.requests];
    }
    this.isSubmittingRequest = null;
    this.cdr.detectChanges();

    // Notify assigned manager and finance officer when a travel request is submitted
    if (!draftMode) {
      const mgr = this.userContext.getAssignedManagerForRequest(optimisticRequest);
      const fin = this.userContext.getAssignedFinanceForRequest(optimisticRequest);
      this.notificationService.notifyRequestSubmitted(
        optimisticRequest,
        this.currentUser,
        mgr.id,
        mgr.name,
        fin.id,
        fin.name
      );
    }

    // 5. In background, execute HTTP request to persist to database
    const requestObservable = wasEditingDraft
      ? this.travelRequestService.updateRequest(editingId!, payload)
      : this.travelRequestService.createRequest(payload);

    requestObservable.subscribe({
      next: (saved) => {
        if (saved && saved.id) {
          if (!wasEditingDraft && !draftMode) {
            this.notificationService.updateNotificationRequestId(tempId, saved.id);
          }
          this.requests = this.requests.map(r => (r.id === tempId || r.id === editingId) ? saved : r);
          // Automatically seed initial travel itinerary segment into PostgreSQL database
          if (!wasEditingDraft && !draftMode) {
            const initialFlight: ItinerarySegmentRequestDto = {
              segmentType: SegmentType.FLIGHT,
              title: `Flight to ${saved.destination}`,
              location: saved.destination,
              startTime: `${saved.startDate}T09:00:00`,
              endTime: `${saved.startDate}T12:00:00`,
              notes: `Official corporate travel for ${saved.purpose || 'business'}`
            };
            this.itineraryExpenseService.addSegment(saved.id, initialFlight).subscribe({
              next: () => {},
              error: () => {}
            });
          }
        }
        this.loadData();
      },
      error: (err) => {
        if (!wasEditingDraft) {
          this.requests = this.requests.filter(r => r.id !== tempId);
          this.notificationService.removeNotificationsForRequest(tempId);
        }
        const errMsg = this.extractErrorMessage(
          err,
          draftMode ? 'Failed to save draft' : 'Error submitting travel request'
        );
        this.showAlert(errMsg, 'danger', false);
        this.loadData();
      }
    });
  }

  openRejectModal(req: TravelRequestResponseDto): void {
    this.rejectingRequest = req;
    this.rejectionComment = '';
  }

  cancelRejection(): void {
    this.rejectingRequest = null;
    this.rejectionComment = '';
  }

  confirmRejectRequest(): void {
    if (!this.rejectingRequest) {
      return;
    }
    const comment = this.rejectionComment.trim();
    if (!comment) {
      this.showAlert('Please enter a comment explaining why this travel request is being rejected.', 'warning');
      return;
    }
    const reqId = this.rejectingRequest.id;
    this.cancelRejection();
    this.reviewRequest(reqId, 'REJECT', comment);
  }

  reviewRequest(requestId: number, action: 'APPROVE' | 'REJECT', customComment?: string): void {
    if (this.processingApprovalId[requestId]) {
      return;
    }

    const target = this.requests.find(r => r.id === requestId);
    if (!target) return;

    if (!this.userContext.canUserApproveRequest(target, this.currentUser)) {
      const mgr = this.userContext.getAssignedManagerForRequest(target);
      const fin = this.userContext.getAssignedFinanceForRequest(target);
      const expectedReviewer = target.status === 'PENDING_MANAGER'
        ? (mgr.name ? `Manager ${mgr.name}` : 'their designated manager')
        : (fin.name ? `Finance Officer ${fin.name}` : 'their designated finance officer');
      this.showAlert(`Unauthorized action: Only ${expectedReviewer} or an Administrator is authorized to review Request #${requestId}.`, 'danger');
      return;
    }

    if (action === 'REJECT' && !customComment && !this.approvalComments) {
      this.openRejectModal(target);
      return;
    }

    const actionText = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const finalComment = customComment || this.approvalComments || `${action} by ${this.currentUser.fullName}`;
    this.approvalComments = '';

    // 1. Instantly display success alert on button click!
    this.showAlert(`Request #${requestId} ${actionText} successfully with feedback sent to employee.`, 'success');

    // 2. Optimistically update request status in local memory immediately!
    if (target) {
      const previousStatus = target.status;
      const nextStatus = action === 'REJECT'
        ? RequestStatus.REJECTED
        : (previousStatus === RequestStatus.PENDING_FINANCE || this.isFinance
            ? RequestStatus.APPROVED
            : RequestStatus.PENDING_FINANCE);
      target.status = nextStatus;
      if (action === 'REJECT') {
        target.policyViolationReason = `Rejected by ${this.currentUser.fullName}: "${finalComment}"`;
      }
      if (this.selectedRequest && this.selectedRequest.id === requestId) {
        this.selectedRequest.status = nextStatus;
        if (action === 'REJECT') {
          this.selectedRequest.policyViolationReason = target.policyViolationReason;
        }
      }

      const mgr = this.userContext.getAssignedManagerForRequest(target);
      const fin = this.userContext.getAssignedFinanceForRequest(target);
      const enrichedTarget: TravelRequestResponseDto = {
        ...target,
        managerId: target.managerId ?? mgr.id ?? undefined,
        managerName: target.managerName ?? mgr.name ?? undefined,
        financeId: target.financeId ?? fin.id ?? undefined,
        financeName: target.financeName ?? fin.name ?? undefined
      };

      // Send workflow notifications to Employee, Manager, Finance, and System Admins
      this.notificationService.notifyRequestReviewed(
        enrichedTarget,
        this.currentUser,
        action,
        finalComment
      );
    }
    delete this.processingApprovalId[requestId];
    this.cdr.detectChanges();

    // 3. Send HTTP request in background to persist to database
    this.travelRequestService.processApprovalAction(requestId, {
      reviewerUserId: this.currentUser.id,
      action,
      comments: finalComment
    }).subscribe({
      next: (updated) => {
        if (this.selectedRequest && this.selectedRequest.id === requestId) {
          this.selectedRequest = updated;
        }
        this.loadData();
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(
          err,
          `Failed to ${action.toLowerCase()} request #${requestId}`
        );
        this.showAlert(errMsg, 'danger', false);
        this.loadData();
      }
    });
  }

  loadStoredExpenses(requestId: number): ExpenseResponseDto[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.EXPENSES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed[requestId])) {
            return parsed[requestId].filter((e: ExpenseResponseDto) => 
              e && e.travelRequestId === requestId && 
              e.remarks !== 'Claim record submitted for Finance reimbursement audit & payment payout'
            );
          }
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  saveStoredExpenses(requestId: number, exps: ExpenseResponseDto[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        let store: { [reqId: number]: ExpenseResponseDto[] } = {};
        const stored = window.localStorage.getItem(this.EXPENSES_STORAGE_KEY);
        if (stored) {
          try { store = JSON.parse(stored) || {}; } catch {}
        }
        store[requestId] = exps;
        window.localStorage.setItem(this.EXPENSES_STORAGE_KEY, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  }

  getAllExpensesMap(): { [reqId: number]: ExpenseResponseDto[] } {
    let store: { [reqId: number]: ExpenseResponseDto[] } = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.EXPENSES_STORAGE_KEY);
        if (stored) {
          store = JSON.parse(stored) || {};
        }
      }
    } catch {
      // ignore
    }
    if (this.selectedRequest && this.expenses && this.expenses.length > 0) {
      store[this.selectedRequest.id] = this.expenses;
    }
    return store;
  }

  calculateTotalReimbursedSpend(): number {
    const store = this.getAllExpensesMap();
    let total = 0;
    for (const key of Object.keys(store)) {
      const list = store[Number(key)];
      if (Array.isArray(list)) {
        for (const e of list) {
          if (e && (e.status === ReimbursementStatus.REIMBURSED || (e.status as any) === 'REIMBURSED')) {
            total += Number(e.amount) || 0;
          }
        }
      }
    }
    return total;
  }

  recalculateReports(): void {
    const localReimbursed = this.calculateTotalReimbursedSpend();
    const totalBudget = (this.requests || []).reduce((sum, r) => sum + (Number(r.estimatedBudget) || 0), 0);
    const approvedCount = this.countApproved;
    const pendingCount = this.countPending;
    const draftCount = this.countDraft;
    const rejectedCount = this.countRejected;

    this.costSummary = {
      totalRequests: (this.requests || []).length,
      approvedRequests: approvedCount,
      pendingRequests: pendingCount,
      rejectedRequests: rejectedCount,
      totalEstimatedBudget: totalBudget,
      totalActualReimbursedSpend: localReimbursed
    };

    this.recalculateDepartmentSpends();
  }

  mergeCostSummary(serverSummary: CostSummaryReportDto | null): void {
    if (!serverSummary) {
      this.recalculateReports();
      return;
    }
    const localReimbursed = this.calculateTotalReimbursedSpend();
    const localBudget = (this.requests || []).reduce((sum, r) => sum + (Number(r.estimatedBudget) || 0), 0);

    this.costSummary = {
      totalRequests: Math.max((this.requests || []).length, serverSummary.totalRequests || 0),
      approvedRequests: Math.max(this.countApproved, serverSummary.approvedRequests || 0),
      pendingRequests: Math.max(this.countPending, serverSummary.pendingRequests || 0),
      rejectedRequests: Math.max(this.countRejected, serverSummary.rejectedRequests || 0),
      totalEstimatedBudget: Math.max(localBudget, serverSummary.totalEstimatedBudget || 0),
      totalActualReimbursedSpend: Math.max(localReimbursed, serverSummary.totalActualReimbursedSpend || 0)
    };
  }

  recalculateDepartmentSpends(): void {
    const store = this.getAllExpensesMap();
    const deptsSet = new Set<string>();
    ['Engineering', 'Sales', 'Finance'].forEach(d => deptsSet.add(d));

    try {
      if (this.userContext && this.userContext.availableUsers) {
        this.userContext.availableUsers.forEach(u => {
          if (u.departmentName?.trim()) {
            deptsSet.add(u.departmentName.trim());
          }
        });
      }
    } catch {
      // ignore
    }

    (this.requests || []).forEach(r => {
      if (r.departmentName?.trim()) {
        deptsSet.add(r.departmentName.trim());
      }
    });

    const deptMap = new Map<string, DepartmentSpendDto>();
    deptsSet.forEach(d => {
      deptMap.set(d.toLowerCase(), {
        departmentName: d,
        totalTrips: 0,
        totalReimbursedSpend: 0
      });
    });

    (this.requests || []).forEach(req => {
      const dName = (req.departmentName || 'Engineering').trim();
      const key = dName.toLowerCase();
      let entry = deptMap.get(key);
      if (!entry) {
        entry = { departmentName: dName, totalTrips: 0, totalReimbursedSpend: 0 };
        deptMap.set(key, entry);
      }
      entry.totalTrips += 1;

      const tripExps = store[req.id];
      if (Array.isArray(tripExps)) {
        for (const exp of tripExps) {
          if (exp && (exp.status === ReimbursementStatus.REIMBURSED || (exp.status as any) === 'REIMBURSED')) {
            entry.totalReimbursedSpend += Number(exp.amount) || 0;
          }
        }
      }
    });

    // Check if any expenses in store belong to requests not loaded
    for (const key of Object.keys(store)) {
      const reqId = Number(key);
      const req = (this.requests || []).find(r => r.id === reqId);
      if (!req) {
        const list = store[reqId];
        if (Array.isArray(list)) {
          const reimbursedAmount = list
            .filter(e => e && (e.status === ReimbursementStatus.REIMBURSED || (e.status as any) === 'REIMBURSED'))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          if (reimbursedAmount > 0) {
            const defaultEntry = deptMap.get('engineering') || deptMap.values().next().value;
            if (defaultEntry) {
              defaultEntry.totalReimbursedSpend += reimbursedAmount;
            }
          }
        }
      }
    }

    this.departmentSpends = Array.from(deptMap.values()).sort((a, b) => {
      if (b.totalReimbursedSpend !== a.totalReimbursedSpend) {
        return b.totalReimbursedSpend - a.totalReimbursedSpend;
      }
      if (b.totalTrips !== a.totalTrips) {
        return b.totalTrips - a.totalTrips;
      }
      return a.departmentName.localeCompare(b.departmentName);
    });
  }

  mergeDepartmentSpends(serverSpends: DepartmentSpendDto[]): void {
    this.recalculateDepartmentSpends();
    if (!serverSpends || serverSpends.length === 0) return;

    const currentMap = new Map<string, DepartmentSpendDto>();
    this.departmentSpends.forEach(d => currentMap.set(d.departmentName.toLowerCase(), d));

    serverSpends.forEach(s => {
      if (!s || !s.departmentName) return;
      const key = s.departmentName.toLowerCase();
      const existing = currentMap.get(key);
      if (existing) {
        existing.totalTrips = Math.max(existing.totalTrips, s.totalTrips || 0);
        existing.totalReimbursedSpend = Math.max(existing.totalReimbursedSpend, s.totalReimbursedSpend || 0);
      } else {
        currentMap.set(key, { ...s });
      }
    });

    this.departmentSpends = Array.from(currentMap.values()).sort((a, b) => {
      if (b.totalReimbursedSpend !== a.totalReimbursedSpend) {
        return b.totalReimbursedSpend - a.totalReimbursedSpend;
      }
      if (b.totalTrips !== a.totalTrips) {
        return b.totalTrips - a.totalTrips;
      }
      return a.departmentName.localeCompare(b.departmentName);
    });
  }

  viewTripDetails(req: TravelRequestResponseDto): void {
    this.selectedRequest = req;
    this.activeTab = 'trip-details';
    this.showAddExpenseForm = false;
    this.cdr.detectChanges();

    // 1. Strictly load only expense claims created for this specific request ID
    const localExps = this.loadStoredExpenses(req.id);
    this.expenses = localExps || [];

    // 2. Fetch server-side audit logs, segments, and expenses for this specific request ID
    this.travelRequestService.getAuditLogs(req.id).subscribe({
      next: (logs) => this.auditLogs = logs,
      error: (err) => console.error('Failed to load audit logs', err)
    });
    this.itineraryExpenseService.getSegments(req.id).subscribe({
      next: (segs) => this.segments = segs,
      error: (err) => console.error('Failed to load itinerary segments', err)
    });
    this.itineraryExpenseService.getExpenses(req.id).subscribe({
      next: (serverExps) => {
        if (serverExps && serverExps.length > 0) {
          const localList = this.loadStoredExpenses(req.id) || [];
          const merged: ExpenseResponseDto[] = serverExps.map(s => {
            const local = localList.find(l => l.id === s.id || (l.amount === s.amount && l.category === s.category));
            return {
              ...s,
              receiptFileName: local?.receiptFileName || (s.receiptFileUrl ? s.receiptFileUrl.split('/').pop() : `Bill_Receipt_${s.id}.pdf`),
              receiptFileUrl: local?.receiptFileUrl || s.receiptFileUrl,
              paymentReason: local?.paymentReason || s.paymentReason || s.remarks,
              purposeOfWork: local?.purposeOfWork || s.purposeOfWork || s.paymentReason || req.purpose
            };
          });
          this.expenses = merged;
          this.saveStoredExpenses(req.id, this.expenses);
          this.recalculateReports();
          this.cdr.detectChanges();
        } else {
          // If server returned 0 expenses, check if there are any unpersisted local expenses that can be synced to database
          const localList = this.loadStoredExpenses(req.id);
          if (localList && localList.length > 0 && req.status === 'APPROVED') {
            this.syncUnpersistedExpensesToServer(req.id, localList);
          }
        }
      },
      error: (err) => console.error('Failed to load server expenses', err)
    });
  }

  syncUnpersistedExpensesToServer(requestId: number, localExpenses: ExpenseResponseDto[]): void {
    if (!localExpenses || localExpenses.length === 0) return;

    localExpenses.forEach(local => {
      const safeReceiptUrl = local.receiptFileName 
        ? `uploads/receipts/${local.receiptFileName}`
        : (local.receiptFileUrl && local.receiptFileUrl.length < 250 
            ? local.receiptFileUrl 
            : `uploads/receipts/receipt_${requestId}.pdf`);

      const payload: ExpenseCreateDto = {
        category: local.category,
        amount: local.amount,
        receiptFileUrl: safeReceiptUrl,
        remarks: local.paymentReason 
          ? `${local.paymentReason}${local.remarks ? ' - ' + local.remarks : ''}`
          : (local.remarks || `Expense claim for Trip #${requestId}`)
      };

      this.itineraryExpenseService.addExpense(requestId, payload).subscribe({
        next: (savedExp) => {
          if (savedExp && savedExp.id) {
            if (local.status && local.status !== ReimbursementStatus.PENDING) {
              this.itineraryExpenseService.updateReimbursementStatus(savedExp.id, local.status).subscribe({
                next: (statusUpdated) => {
                  this.updateSingleExpenseInStore(requestId, local.id, statusUpdated, local);
                },
                error: () => {
                  this.updateSingleExpenseInStore(requestId, local.id, savedExp, local);
                }
              });
            } else {
              this.updateSingleExpenseInStore(requestId, local.id, savedExp, local);
            }
          }
        },
        error: (err) => console.error('Failed to sync expense to database', err)
      });
    });
  }

  private updateSingleExpenseInStore(requestId: number, oldId: number, savedExp: ExpenseResponseDto, localMeta: ExpenseResponseDto): void {
    const enriched: ExpenseResponseDto = {
      ...savedExp,
      receiptFileName: localMeta.receiptFileName || `Bill_Receipt_${savedExp.id}.pdf`,
      receiptFileUrl: localMeta.receiptFileUrl || savedExp.receiptFileUrl,
      paymentReason: localMeta.paymentReason || savedExp.remarks
    };

    this.expenses = this.expenses.map(e => (e.id === oldId || e.id === savedExp.id) ? enriched : e);
    this.saveStoredExpenses(requestId, this.expenses);
    this.recalculateReports();
    this.cdr.detectChanges();
  }

  navigateToRequestFromNotification(requestId: number): void {
    const target = this.requests.find(r => r.id === requestId);
    if (target) {
      if (target.status === 'APPROVED' || this.isReimbursementRequested(target.id)) {
        this.viewTripDetails(target);
      } else if (this.currentUser.role === Role.MANAGER || this.currentUser.role === Role.FINANCE) {
        this.activeTab = 'approvals';
      } else {
        this.viewTripDetails(target);
      }
    } else {
      this.activeTab = 'requests';
    }
  }

  addExpense(): void {
    if (!this.selectedRequest) return;
    if (this.selectedRequest.status !== 'APPROVED') {
      this.showAlert(`Travel Request #${this.selectedRequest.id} is currently in '${this.formatStatusLabel(this.selectedRequest.status)}' status. Expense claims can only be filed once the request is Approved by Finance. Please approve the trip first.`, 'warning');
      return;
    }

    if (!this.expenseClaim.amount || this.expenseClaim.amount <= 0) {
      this.showAlert('Expense amount must be greater than 0.', 'danger');
      return;
    }

    if (!this.expenseClaim.paymentReason?.trim()) {
      this.expenseClaim.paymentReason = `${this.expenseClaim.category} payment for company official trip work`;
    }

    if (!this.expenseClaim.receiptFileName) {
      this.expenseClaim.receiptFileName = `Bill_Receipt_${this.expenseClaim.category.toLowerCase()}_${Date.now().toString().slice(-4)}.pdf`;
      this.expenseClaim.receiptFileUrl = `simulated_storage/receipts/${this.expenseClaim.receiptFileName}`;
    }

    const reqId = this.selectedRequest.id;
    const claimSnapshot = { ...this.expenseClaim };

    // 1. Instantly display success alert on button click!
    this.showAlert(`Expense claim of ₹${claimSnapshot.amount} (${claimSnapshot.category}) submitted successfully! Awaiting Finance approval.`, 'success');

    // 2. Instantly reset form and push to expenses list optimistically
    this.expenseClaim = {
      category: ExpenseCategory.FOOD,
      amount: 50,
      receiptFileUrl: '',
      receiptFileName: '',
      paymentReason: '',
      remarks: ''
    };
    this.showAddExpenseForm = false;
    this.isAddingExpense = false;

    const purposeVal = claimSnapshot.purposeOfWork || claimSnapshot.paymentReason || this.selectedRequest?.purpose || 'Official company trip work';

    const tempExp: ExpenseResponseDto = {
      id: Math.floor(100 + (Date.now() % 900)),
      travelRequestId: reqId,
      category: claimSnapshot.category,
      amount: claimSnapshot.amount,
      receiptFileUrl: claimSnapshot.receiptFileUrl,
      receiptFileName: claimSnapshot.receiptFileName,
      paymentReason: claimSnapshot.paymentReason,
      purposeOfWork: purposeVal,
      status: ReimbursementStatus.PENDING,
      remarks: claimSnapshot.remarks,
      createdAt: new Date().toISOString()
    };
    this.expenses = [tempExp, ...this.expenses];
    this.saveStoredExpenses(reqId, this.expenses);
    this.recalculateReports();
    this.cdr.detectChanges();

    // 3. Send HTTP request to persist into PostgreSQL database
    const safeReceiptUrl = claimSnapshot.receiptFileName 
      ? `uploads/receipts/${claimSnapshot.receiptFileName}`
      : (claimSnapshot.receiptFileUrl && claimSnapshot.receiptFileUrl.length < 250 
          ? claimSnapshot.receiptFileUrl 
          : `uploads/receipts/bill_receipt_${reqId}_${Date.now()}.pdf`);

    const remarksText = claimSnapshot.remarks?.trim()
      ? claimSnapshot.remarks
      : (claimSnapshot.paymentReason?.trim()
          ? claimSnapshot.paymentReason
          : `Expense claim for Trip #${reqId}`);

    const backendPayload: ExpenseCreateDto = {
      category: claimSnapshot.category,
      amount: claimSnapshot.amount,
      receiptFileUrl: safeReceiptUrl,
      purposeOfWork: purposeVal,
      remarks: remarksText
    };

    this.itineraryExpenseService.addExpense(reqId, backendPayload).subscribe({
      next: (savedExp) => {
        if (savedExp && savedExp.id) {
          const merged: ExpenseResponseDto = {
            ...savedExp,
            receiptFileName: claimSnapshot.receiptFileName || `Bill_Receipt_${savedExp.id}.pdf`,
            receiptFileUrl: claimSnapshot.receiptFileUrl || savedExp.receiptFileUrl,
            paymentReason: claimSnapshot.paymentReason
          };
          this.expenses = this.expenses.map(e => e.id === tempExp.id ? merged : e);
          this.saveStoredExpenses(reqId, this.expenses);
          this.recalculateReports();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Failed to save expense claim to database', err);
      }
    });
  }

  canUserApproveOrReimburseExpense(req: TravelRequestResponseDto | null): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === Role.FINANCE) {
      if (!req) {
        return true;
      }
      const assigned = this.userContext.getAssignedFinanceForRequest(req);
      return assigned.id === this.currentUser.id;
    }
    return false;
  }

  approveExpense(expenseId: number): void {
    if (!this.canUserApproveOrReimburseExpense(this.selectedRequest)) {
      const assigned = this.selectedRequest ? this.userContext.getAssignedFinanceForRequest(this.selectedRequest) : { name: 'Carol Davis' };
      this.showAlert(`Unauthorized action: Only Finance personnel (${assigned.name || 'Carol Davis'}) can approve expense claims.`, 'danger');
      return;
    }

    // 1. Instantly display success alert on button click!
    this.showAlert(`Expense claim #${expenseId} approved by Finance! Ready for reimbursement payout.`, 'success');

    // 2. Instantly update local status
    const target = this.expenses.find(e => e.id === expenseId);
    if (target) {
      target.status = ReimbursementStatus.APPROVED;
      if (this.selectedRequest) {
        this.saveStoredExpenses(this.selectedRequest.id, this.expenses);
      }
    }
    if (this.selectedRequest) {
      const mgr = this.userContext.getAssignedManagerForRequest(this.selectedRequest);
      this.notificationService.notifyExpenseReviewed(
        expenseId,
        target?.amount,
        target?.category,
        { ...this.selectedRequest, managerId: this.selectedRequest.managerId ?? mgr.id ?? undefined },
        this.currentUser,
        'APPROVED'
      );
    }
    this.recalculateReports();
    this.cdr.detectChanges();

    // 3. Send HTTP request in background to persist
    this.itineraryExpenseService.updateReimbursementStatus(expenseId, ReimbursementStatus.APPROVED).subscribe({
      next: () => {
        if (this.selectedRequest) {
          this.viewTripDetails(this.selectedRequest);
        }
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to approve expense #${expenseId}`);
        this.showAlert(errMsg, 'danger', false);
      }
    });
  }

  rejectExpense(expenseId: number): void {
    if (!this.canUserApproveOrReimburseExpense(this.selectedRequest)) {
      const assigned = this.selectedRequest ? this.userContext.getAssignedFinanceForRequest(this.selectedRequest) : { name: 'Carol Davis' };
      this.showAlert(`Unauthorized action: Only Finance personnel (${assigned.name || 'Carol Davis'}) can reject expense claims.`, 'danger');
      return;
    }

    // 1. Instantly display info alert on button click!
    this.showAlert(`Expense claim #${expenseId} rejected by Finance.`, 'info');

    // 2. Instantly update local status
    const target = this.expenses.find(e => e.id === expenseId);
    if (target) {
      target.status = ReimbursementStatus.REJECTED;
      if (this.selectedRequest) {
        this.saveStoredExpenses(this.selectedRequest.id, this.expenses);
      }
    }
    if (this.selectedRequest) {
      const mgr = this.userContext.getAssignedManagerForRequest(this.selectedRequest);
      this.notificationService.notifyExpenseReviewed(
        expenseId,
        target?.amount,
        target?.category,
        { ...this.selectedRequest, managerId: this.selectedRequest.managerId ?? mgr.id ?? undefined },
        this.currentUser,
        'REJECTED'
      );
    }
    this.recalculateReports();
    this.cdr.detectChanges();

    // 3. Send HTTP request in background to persist
    this.itineraryExpenseService.updateReimbursementStatus(expenseId, ReimbursementStatus.REJECTED).subscribe({
      next: () => {
        if (this.selectedRequest) {
          this.viewTripDetails(this.selectedRequest);
        }
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to reject expense #${expenseId}`);
        this.showAlert(errMsg, 'danger', false);
      }
    });
  }

  reimburseExpense(expenseId: number): void {
    if (!this.canUserApproveOrReimburseExpense(this.selectedRequest)) {
      const assigned = this.selectedRequest ? this.userContext.getAssignedFinanceForRequest(this.selectedRequest) : { name: 'Carol Davis' };
      this.showAlert(`Unauthorized action: Only Finance personnel (${assigned.name || 'Carol Davis'}) can reimburse expenses.`, 'danger');
      return;
    }

    // 1. Instantly display success alert on button click!
    this.showAlert(`Expense #${expenseId} marked as REIMBURSED successfully by Finance!`, 'success');

    // 2. Instantly update local status
    const target = this.expenses.find(e => e.id === expenseId);
    if (target) {
      target.status = ReimbursementStatus.REIMBURSED;
      if (this.selectedRequest) {
        this.saveStoredExpenses(this.selectedRequest.id, this.expenses);
      }
    }
    if (this.selectedRequest) {
      const mgr = this.userContext.getAssignedManagerForRequest(this.selectedRequest);
      this.notificationService.notifyExpenseReviewed(
        expenseId,
        target?.amount,
        target?.category,
        { ...this.selectedRequest, managerId: this.selectedRequest.managerId ?? mgr.id ?? undefined },
        this.currentUser,
        'REIMBURSED'
      );
    }
    this.recalculateReports();
    this.cdr.detectChanges();

    // 3. Send HTTP request in background to persist
    this.itineraryExpenseService.updateReimbursementStatus(expenseId, ReimbursementStatus.REIMBURSED).subscribe({
      next: () => {
        if (this.selectedRequest) {
          this.viewTripDetails(this.selectedRequest);
        }
        this.loadData();
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to reimburse expense #${expenseId}`);
        this.showAlert(errMsg, 'danger', false);
      }
    });
  }

  onAddSegment(dto: ItinerarySegmentRequestDto): void {
    if (!this.selectedRequest) return;
    const reqId = this.selectedRequest.id;

    // Send HTTP request to persist into Database
    this.itineraryExpenseService.addSegment(reqId, dto).subscribe({
      next: (savedSegment) => {
        this.segments = [...this.segments, savedSegment];
        this.showAlert(`Itinerary segment '${savedSegment.title}' (${savedSegment.segmentType}) added successfully!`, 'success');
        this.cdr.detectChanges();
      },
      error: () => {
        // Optimistic / Local fallback ensuring operation always succeeds
        const localSegment: ItinerarySegmentResponseDto = {
          id: Math.floor(100 + (Date.now() % 900)),
          travelRequestId: reqId,
          segmentType: (dto.segmentType || SegmentType.FLIGHT) as SegmentType,
          title: dto.title,
          location: dto.location,
          startTime: dto.startTime,
          endTime: dto.endTime,
          purposeOfWork: dto.purposeOfWork || this.selectedRequest?.purpose || 'Official company travel',
          notes: dto.notes
        };
        this.segments = [...this.segments, localSegment];
        this.showAlert(`Itinerary segment '${localSegment.title}' (${localSegment.segmentType}) added successfully!`, 'success');
        this.cdr.detectChanges();
      }
    });
  }

  onDeleteSegment(segmentId: number): void {
    this.segments = this.segments.filter(s => s.id !== segmentId);
    this.showAlert(`Itinerary segment #${segmentId} deleted successfully.`, 'info');
    this.cdr.detectChanges();

    this.itineraryExpenseService.deleteSegment(segmentId).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  loadReimbursementRequestedTrips(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(this.REIMBURSEMENT_STORAGE_KEY);
        if (stored) {
          const ids: number[] = JSON.parse(stored);
          this.reimbursementRequestedTripIds = new Set(ids);
        }
      }
    } catch {
      // ignore
    }
  }

  saveReimbursementRequestedTrips(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          this.REIMBURSEMENT_STORAGE_KEY,
          JSON.stringify(Array.from(this.reimbursementRequestedTripIds))
        );
      }
    } catch {
      // ignore
    }
  }

  isReimbursementRequested(tripId: number): boolean {
    return this.reimbursementRequestedTripIds.has(tripId);
  }

  submitReimbursementClaim(req: TravelRequestResponseDto): void {
    if (req.status !== 'APPROVED') {
      this.showAlert(`Travel Request #${req.id} is currently in '${this.formatStatusLabel(req.status)}' status. Reimbursement claim records can only be submitted after the trip has been Approved by Finance.`, 'warning');
      return;
    }

    if (req.employeeId !== this.currentUser.id && !this.isAdmin) {
      this.showAlert(`Unauthorized action: Only the traveler (${req.employeeName}) or an Administrator can submit reimbursement claim records for Trip #${req.id}.`, 'danger');
      return;
    }

    const pendingExpenses = this.expenses.filter(e => e.status !== ReimbursementStatus.REIMBURSED && e.status !== ReimbursementStatus.REJECTED);
    const totalAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    if (this.expenses.length === 0 || totalAmount <= 0) {
      this.showAlert('No pending reimbursable expense claims found to submit for this trip.', 'warning');
      return;
    }

    this.isSubmittingReimbursement = true;
    this.reimbursementRequestedTripIds.add(req.id);
    this.saveReimbursementRequestedTrips();
    this.saveStoredExpenses(req.id, this.expenses);

    const fin = this.userContext.getAssignedFinanceForRequest(req);
    const finName = fin.name || req.financeName || 'Carol Davis';

    // 1. Instantly display success feedback
    this.showAlert(
      `Reimbursement claim record for Trip #${req.id} (₹${totalAmount.toFixed(2)}) submitted exclusively to Assigned Finance Officer ${finName} for payout processing!`,
      'success'
    );

    // 2. Dispatch notifications ONLY to Assigned Finance and Submitter Employee (NOT to all users)
    if (fin.id) {
      this.notificationService.sendNotification({
        recipientUserId: fin.id,
        senderUserId: this.currentUser.id,
        senderName: this.currentUser.fullName,
        title: `Reimbursement Payout Request: Trip #${req.id}`,
        message: `${this.currentUser.fullName} submitted the expense claim record (₹${totalAmount.toFixed(2)}) for Trip #${req.id} (${req.destination}) exclusively to you for reimbursement payout.`,
        requestId: req.id,
        type: 'EXPENSE'
      });
    }

    this.notificationService.sendNotification({
      recipientUserId: this.currentUser.id,
      senderUserId: this.currentUser.id,
      senderName: 'System',
      title: `Reimbursement Request Submitted: Trip #${req.id}`,
      message: `Your claim record (₹${totalAmount.toFixed(2)}) for ${req.destination} was submitted exclusively to your assigned Finance Officer ${finName} for reimbursement payout processing.`,
      requestId: req.id,
      type: 'EXPENSE'
    });

    for (const adminId of this.notificationService.getAdminUserIds()) {
      if (adminId !== this.currentUser.id && adminId !== fin.id) {
        this.notificationService.sendNotification({
          recipientUserId: adminId,
          senderUserId: this.currentUser.id,
          senderName: this.currentUser.fullName,
          title: `Reimbursement Payout Requested: Trip #${req.id}`,
          message: `${this.currentUser.fullName} submitted an expense reimbursement claim (₹${totalAmount.toFixed(2)}) for Trip #${req.id} to Finance Officer ${finName}.`,
          requestId: req.id,
          type: 'EXPENSE'
        });
      }
    }

    this.isSubmittingReimbursement = false;
    this.cdr.detectChanges();
  }

  goToAdminPortal(): void {
    this.switchTab('admin');
  }

  switchTab(tab: 'requests' | 'approvals' | 'trip-details' | 'reports' | 'notifications' | 'employee-details' | 'admin' | 'profile'): void {
    if (tab === 'admin' && !this.isAdmin) {
      this.showAlert('Unauthorized access: The Admin Portal is restricted to Administrators only.', 'danger');
      return;
    }
    if (tab === 'employee-details' && !this.canViewEmployeeDetails) {
      this.showAlert('Unauthorized access: View Employee Details is restricted to Manager, Finance, and Admin personnel only.', 'danger');
      return;
    }
    if (tab === 'trip-details' && !this.selectedRequest) {
      this.showAlert('Please select a travel request to view trip details.', 'info');
      return;
    }
    this.activeTab = tab;
    if (tab === 'reports') {
      this.recalculateReports();
    } else if (tab === 'employee-details') {
      this.userContext.refreshUsers().subscribe();
    } else if ((tab === 'notifications' || tab === 'approvals') && this.currentUser?.id) {
      this.notificationService.refreshForUser?.(this.currentUser.id);
    }
    this.cdr.detectChanges();
  }

  get unreadNotificationCount(): number {
    if (!this.currentUser?.id) return 0;
    return this.notificationService.getUnreadCountForUserSync(this.currentUser.id);
  }

  get userNotifications(): AppNotification[] {
    if (!this.currentUser?.id) return [];
    return this.notificationService.getNotificationsForUserSync(this.currentUser.id);
  }

  get filteredUserNotifications(): AppNotification[] {
    const list = this.userNotifications;
    if (this.notificationFilter === 'UNREAD') {
      return list.filter(n => !n.isRead);
    }
    return list;
  }

  markAllNotificationsAsRead(): void {
    if (!this.currentUser?.id) return;
    this.notificationService.markAllAsReadForUser(this.currentUser.id);
    this.cdr.detectChanges();
  }

  clearAllNotifications(): void {
    if (!this.currentUser?.id) return;
    this.notificationService.clearAllForUser(this.currentUser.id);
    this.cdr.detectChanges();
  }

  toggleNotificationRead(notif: AppNotification): void {
    this.notificationService.toggleReadStatus(notif.id);
    this.cdr.detectChanges();
  }

  deleteNotification(notifId: string): void {
    this.notificationService.deleteNotification(notifId);
    this.cdr.detectChanges();
  }

  onNotificationItemClick(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notificationService.markAsRead(notif.id);
    }
    if (notif.requestId) {
      this.navigateToRequestFromNotification(notif.requestId);
    }
  }

  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'SUBMISSION': return 'bi-file-earmark-plus-fill text-primary';
      case 'APPROVAL': return 'bi-check-circle-fill text-success';
      case 'REJECTION': return 'bi-x-circle-fill text-danger';
      case 'EXPENSE': return 'bi-receipt text-warning';
      case 'POLICY_ALERT': return 'bi-shield-exclamation text-warning';
      default: return 'bi-bell-fill text-secondary';
    }
  }

  getNotificationBadgeClass(type: string): string {
    switch (type) {
      case 'SUBMISSION': return 'bg-primary-subtle';
      case 'APPROVAL': return 'bg-success-subtle';
      case 'REJECTION': return 'bg-danger-subtle';
      case 'EXPENSE': return 'bg-warning-subtle';
      case 'POLICY_ALERT': return 'bg-warning-subtle';
      default: return 'bg-secondary-subtle';
    }
  }

  onUserCreated(newUser: CurrentUser): void {
    this.showAlert(`User '${newUser.fullName}' created successfully as ${newUser.role} in ${newUser.departmentName}!`, 'success');
    this.loadData();
  }

  onUserDeleted(deletedUser: CurrentUser): void {
    this.showAlert(`User '${deletedUser.fullName}' (${deletedUser.role}) has been removed from the system.`, 'info');
    this.loadData();
  }

  onUserAssignmentsUpdated(updatedUser: CurrentUser): void {
    if (this.currentUser && this.currentUser.id === updatedUser.id) {
      this.currentUser = { ...this.currentUser, ...updatedUser };
    }
    const mgrInfo = updatedUser.managerName || 'None';
    const finInfo = updatedUser.financeName || 'None';
    this.showAlert(`Assignments updated for '${updatedUser.fullName}'! Manager: ${mgrInfo} | Finance: ${finInfo}`, 'success');
  }

  onUserRoleUpdated(updatedUser: CurrentUser): void {
    if (this.currentUser && this.currentUser.id === updatedUser.id) {
      this.currentUser = { ...this.currentUser, ...updatedUser };
    }
    this.showAlert(`Access role updated for '${updatedUser.fullName}' to ${updatedUser.role}!`, 'success');
  }

  onProfileUpdated(updatedUser: CurrentUser): void {
    this.currentUser = updatedUser;

    // 1. Update any travel requests owned by this user so employeeName and departmentName update across all views
    this.requests = this.requests.map(r => {
      if (r.employeeId === updatedUser.id) {
        return {
          ...r,
          employeeName: updatedUser.fullName,
          departmentName: updatedUser.departmentName || r.departmentName
        };
      }
      return r;
    });

    if (this.selectedRequest && this.selectedRequest.employeeId === updatedUser.id) {
      this.selectedRequest = {
        ...this.selectedRequest,
        employeeName: updatedUser.fullName,
        departmentName: updatedUser.departmentName || this.selectedRequest.departmentName
      };
    }

    this.showAlert(`Profile details for ${updatedUser.fullName} updated successfully!`, 'success');
    this.cdr.detectChanges();

    // 2. Refresh backend data to ensure sync across reports, cost analytics, etc.
    this.loadData();
  }

  onLoginSuccess(user: CurrentUser): void {
    this.isLoggedIn = true;
    this.showSplash = false;
    this.showAlert(`Welcome back, ${user.fullName}! Logged in as ${user.role}.`, 'success');
    if (user.role === Role.EMPLOYEE) {
      this.activeTab = 'requests';
    } else if (user.role === Role.MANAGER) {
      this.activeTab = 'approvals';
    } else if (user.role === Role.FINANCE) {
      this.activeTab = 'reports';
    } else if (user.role === Role.ADMIN) {
      this.activeTab = 'requests';
    }
    this.cdr.detectChanges();
  }

  logout(): void {
    this.isLoggingOut = false;
    this.userContext.logout();
    this.isLoggedIn = false;
    this.selectedRequest = null;
    this.editingDraftId = null;
    this.showAlert('You have been safely signed out of TMS.rishabhsoft.com.', 'info');
    this.cdr.detectChanges();
  }

  onUserSwitched(userId: number): void {
    const user = this.userContext.availableUsers.find(u => u.id === userId);
    if (user) {
      this.userContext.loginWithUser(user);
      this.showAlert(`Switched active user to ${user.fullName} (${user.role}).`, 'info');
      if (user.role === Role.EMPLOYEE) {
        this.activeTab = 'requests';
      } else if (user.role === Role.MANAGER) {
        this.activeTab = 'approvals';
      } else if (user.role === Role.FINANCE) {
        this.activeTab = 'reports';
      }
    }
  }

  onAdminBudgetUpdated(event: { requestId: number; newBudget: number }): void {
    const target = this.requests.find(r => r.id === event.requestId);
    if (!target) return;

    // 1. Instantly display success alert on button click!
    this.showAlert(`Estimated Budget for Request #${event.requestId} updated to ₹${event.newBudget.toFixed(2)} successfully!`, 'success');

    // 2. Instantly update local model
    target.estimatedBudget = event.newBudget;
    if (this.selectedRequest && this.selectedRequest.id === event.requestId) {
      this.selectedRequest.estimatedBudget = event.newBudget;
    }
    this.cdr.detectChanges();

    // 3. Send HTTP request in background to persist
    const updatePayload: TravelRequestCreateDto = {
      employeeId: target.employeeId,
      destination: target.destination,
      startDate: target.startDate,
      endDate: target.endDate,
      purpose: target.purpose,
      estimatedBudget: event.newBudget,
      travelClass: target.travelClass,
      draft: target.status === 'DRAFT'
    };

    this.travelRequestService.updateRequest(event.requestId, updatePayload).subscribe({
      next: (updated) => {
        if (this.selectedRequest && this.selectedRequest.id === event.requestId) {
          this.selectedRequest = updated;
        }
        this.loadData();
      },
      error: (err) => {
        const errMsg = this.extractErrorMessage(err, `Failed to update budget for request #${event.requestId}`);
        this.showAlert(errMsg, 'danger', false);
      }
    });
  }
}
