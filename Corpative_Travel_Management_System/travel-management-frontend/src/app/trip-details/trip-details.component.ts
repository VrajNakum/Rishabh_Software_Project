import { Component, Input, Output, EventEmitter, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ExpenseCategory, RequestStatus, Role, SegmentType } from '../models/enums.model';
import { TravelRequestResponseDto, ApprovalAuditLogDto } from '../models/travel-request.model';
import { ExpenseCreateDto, ExpenseResponseDto, ItinerarySegmentResponseDto, ItinerarySegmentRequestDto } from '../models/itinerary-expense.model';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { getStatusIcon, formatStatusLabel } from '../shared/status-utils';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './trip-details.component.html',
  styleUrl: './trip-details.component.css'
})
export class TripDetailsComponent {
  @Input() selectedRequest: TravelRequestResponseDto | null = null;
  @Input() currentUser: CurrentUser | null = null;
  @Input() auditLogs: ApprovalAuditLogDto[] = [];
  @Input() expenses: ExpenseResponseDto[] = [];
  @Input() segments: ItinerarySegmentResponseDto[] = [];

  @Input() isAddingExpense = false;
  @Input() showAddExpenseForm = false;
  @Input() expenseClaim: ExpenseCreateDto = {
    category: ExpenseCategory.FOOD,
    amount: 50,
    receiptFileUrl: '',
    receiptFileName: '',
    paymentReason: '',
    remarks: ''
  };

  @Input() approvingExpenseId: number | null = null;
  @Input() rejectingExpenseId: number | null = null;
  @Input() reimbursingExpenseId: number | null = null;
  @Input() isDeletingRequestId: number | null = null;
  @Input() isSubmittingReimbursement = false;
  @Input() reimbursementRequested = false;

  @Output() toggleAddExpense = new EventEmitter<void>();
  @Output() addExpense = new EventEmitter<void>();
  @Output() approveExpense = new EventEmitter<number>();
  @Output() rejectExpense = new EventEmitter<number>();
  @Output() reimburseExpense = new EventEmitter<number>();
  @Output() deleteRequest = new EventEmitter<TravelRequestResponseDto>();
  @Output() submitReimbursementClaim = new EventEmitter<TravelRequestResponseDto>();
  @Output() addSegment = new EventEmitter<ItinerarySegmentRequestDto>();
  @Output() deleteSegment = new EventEmitter<number>();

  // Itinerary Segments Form State
  showAddSegmentForm = false;
  newSegment: ItinerarySegmentRequestDto = {
    segmentType: '',
    title: '',
    location: '',
    startTime: '',
    endTime: '',
    purposeOfWork: '',
    notes: '',
    proofFileUrl: '',
    proofFileName: ''
  };
  SegmentType = SegmentType;
  segmentTypes = Object.values(SegmentType);

  // Segment PDF Upload & Preview State
  selectedSegmentPdfFile: File | null = null;
  selectedSegmentPdfName: string = '';
  selectedSegmentPdfSize: string = '';
  segmentPdfUploadError: string | null = null;
  previewingSegment: ItinerarySegmentResponseDto | null = null;
  safeSegmentPdfUrl: SafeResourceUrl | null = null;

  // PDF Upload & Preview State
  selectedPdfFile: File | null = null;
  selectedPdfName: string = '';
  selectedPdfSize: string = '';
  pdfUploadError: string | null = null;

  previewingExpense: ExpenseResponseDto | null = null;
  safePdfUrl: SafeResourceUrl | null = null;

  expenseCategories = Object.values(ExpenseCategory);

  getStatusIcon = getStatusIcon;
  formatStatusLabel = formatStatusLabel;

  // Pagination - Expenses
  expenseCurrentPage = 1;
  expensePageSize = 10;

  get paginatedExpenses(): ExpenseResponseDto[] {
    const start = (this.expenseCurrentPage - 1) * this.expensePageSize;
    return this.expenses.slice(start, start + this.expensePageSize);
  }

  constructor(
    private sanitizer: DomSanitizer,
    @Optional() public userContext?: UserContextService
  ) {}

  get isAdmin(): boolean {
    return this.currentUser?.role === Role.ADMIN || (this.currentUser?.role as string) === 'ADMIN';
  }

  get isFinance(): boolean {
    return this.currentUser?.role === Role.FINANCE || (this.currentUser?.role as string) === 'FINANCE';
  }

  get isEmployee(): boolean {
    return this.currentUser?.role === Role.EMPLOYEE || (this.currentUser?.role as string) === 'EMPLOYEE';
  }

  get isTraveler(): boolean {
    return !!this.currentUser && !!this.selectedRequest && this.currentUser.id === this.selectedRequest.employeeId;
  }

  get isManagerApproved(): boolean {
    if (!this.selectedRequest) return false;
    const s = this.selectedRequest.status as string;
    return s === RequestStatus.PENDING_FINANCE || s === RequestStatus.APPROVED;
  }

  get isFinanceApproved(): boolean {
    if (!this.selectedRequest) return false;
    const s = this.selectedRequest.status as string;
    return s === RequestStatus.APPROVED;
  }

  get assignedFinance(): { id: number | null; name: string | null } {
    if (!this.selectedRequest) return { id: null, name: null };
    if (this.userContext) {
      return this.userContext.getAssignedFinanceForRequest(this.selectedRequest);
    }
    return {
      id: this.selectedRequest.financeId ?? null,
      name: this.selectedRequest.financeName ?? null
    };
  }

  get isAssignedFinance(): boolean {
    if (!this.currentUser || !this.selectedRequest) return false;
    if (this.isAdmin) return true;
    if (this.currentUser.role === Role.FINANCE || (this.currentUser.role as string) === 'FINANCE') {
      const assigned = this.assignedFinance;
      return assigned.id === this.currentUser.id;
    }
    return false;
  }

  get totalExpensesAmount(): number {
    return this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  get totalReimbursedAmount(): number {
    return this.expenses
      .filter(e => e.status === 'REIMBURSED')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  get pendingReimbursementAmount(): number {
    return this.expenses
      .filter(e => e.status !== 'REIMBURSED' && e.status !== 'REJECTED')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  get allExpensesReimbursed(): boolean {
    return this.expenses.length > 0 && this.expenses.every(e => e.status === 'REIMBURSED');
  }

  get displayReimbursementAmount(): number {
    if (this.pendingReimbursementAmount > 0) {
      return this.pendingReimbursementAmount;
    }
    if (this.totalExpensesAmount > 0) {
      return this.totalExpensesAmount;
    }
    return 0;
  }

  get canSubmitReimbursement(): boolean {
    if (!this.selectedRequest || this.selectedRequest.status !== 'APPROVED') return false;
    if (this.expenses.length === 0 || this.allExpensesReimbursed) return false;
    return this.isTraveler || this.isAdmin;
  }

  getAssignedFinanceName(): string {
    return this.assignedFinance.name || this.selectedRequest?.financeName || 'Carol Davis';
  }

  onSubmitReimbursementClaim(): void {
    if (this.selectedRequest && this.canSubmitReimbursement) {
      this.submitReimbursementClaim.emit(this.selectedRequest);
    }
  }

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

  canDeleteRequest(status: string | null | undefined): boolean {
    return this.isAdmin;
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.pdfUploadError = 'Please upload a PDF document for bill or payment transaction proof.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.pdfUploadError = 'PDF file size exceeds 10MB limit. Please upload a smaller document.';
      return;
    }

    this.pdfUploadError = null;
    this.selectedPdfFile = file;
    this.selectedPdfName = file.name;
    this.selectedPdfSize = (file.size / 1024).toFixed(1) + ' KB';

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.expenseClaim.receiptFileUrl = result;
      this.expenseClaim.receiptFileName = file.name;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedPdf(): void {
    this.selectedPdfFile = null;
    this.selectedPdfName = '';
    this.selectedPdfSize = '';
    this.pdfUploadError = null;
    this.expenseClaim.receiptFileUrl = '';
    this.expenseClaim.receiptFileName = '';
  }

  openPdfPreview(exp: ExpenseResponseDto): void {
    this.previewingExpense = exp;
    if (exp.receiptFileUrl && exp.receiptFileUrl.startsWith('data:')) {
      this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(exp.receiptFileUrl);
    } else {
      this.safePdfUrl = null;
    }
  }

  closePdfPreview(): void {
    this.previewingExpense = null;
    this.safePdfUrl = null;
  }

  downloadOrOpenPdf(exp: ExpenseResponseDto): void {
    if (!exp.receiptFileUrl) return;
    if (typeof window !== 'undefined') {
      if (exp.receiptFileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = exp.receiptFileUrl;
        link.download = exp.receiptFileName || `bill_proof_expense_${exp.id}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(exp.receiptFileUrl, '_blank');
      }
    }
  }

  onToggleAddExpenseForm(): void {
    if (!this.isFinanceApproved && !this.showAddExpenseForm) {
      alert('Expense claims can only be submitted after this travel request is approved by Finance.');
      return;
    }
    this.removeSelectedPdf();
    this.toggleAddExpense.emit();
  }

  onSubmitExpense(): void {
    if (!this.isFinanceApproved) {
      alert('Expense claims can only be submitted after this travel request is approved by Finance.');
      return;
    }
    if (!this.expenseClaim.paymentReason?.trim()) {
      this.expenseClaim.paymentReason = this.selectedRequest?.purpose
        ? `${this.expenseClaim.category} payment for: ${this.selectedRequest.purpose}`
        : `${this.expenseClaim.category} payment for official company trip work`;
    }
    this.expenseClaim.purposeOfWork = this.expenseClaim.paymentReason;
    if (!this.expenseClaim.receiptFileName && !this.expenseClaim.receiptFileUrl) {
      this.expenseClaim.receiptFileName = `Bill_Receipt_${this.expenseClaim.category.toLowerCase()}_${Date.now().toString().slice(-4)}.pdf`;
      this.expenseClaim.receiptFileUrl = `simulated_storage/receipts/${this.expenseClaim.receiptFileName}`;
    }
    this.addExpense.emit();
  }

  onApproveExpense(expenseId: number): void {
    if (!this.isAssignedFinance) return;
    this.approveExpense.emit(expenseId);
  }

  onRejectExpense(expenseId: number): void {
    if (!this.isAssignedFinance) return;
    this.rejectExpense.emit(expenseId);
  }

  onReimburseExpense(expenseId: number): void {
    if (!this.isAssignedFinance) return;
    this.reimburseExpense.emit(expenseId);
  }

  // Segment PDF Proof handlers
  onSegmentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.segmentPdfUploadError = 'Please upload a PDF document for booking ticket or reservation proof.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.segmentPdfUploadError = 'PDF file size exceeds 10MB limit. Please upload a smaller document.';
      return;
    }

    this.segmentPdfUploadError = null;
    this.selectedSegmentPdfFile = file;
    this.selectedSegmentPdfName = file.name;
    this.selectedSegmentPdfSize = (file.size / 1024).toFixed(1) + ' KB';

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.newSegment.proofFileUrl = result;
      this.newSegment.proofFileName = file.name;
    };
    reader.readAsDataURL(file);
  }

  removeSelectedSegmentPdf(): void {
    this.selectedSegmentPdfFile = null;
    this.selectedSegmentPdfName = '';
    this.selectedSegmentPdfSize = '';
    this.segmentPdfUploadError = null;
    this.newSegment.proofFileUrl = '';
    this.newSegment.proofFileName = '';
  }

  openSegmentPdfPreview(seg: ItinerarySegmentResponseDto): void {
    this.previewingSegment = seg;
    if (seg.proofFileUrl && seg.proofFileUrl.startsWith('data:')) {
      this.safeSegmentPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(seg.proofFileUrl);
    } else {
      this.safeSegmentPdfUrl = null;
    }
  }

  closeSegmentPdfPreview(): void {
    this.previewingSegment = null;
    this.safeSegmentPdfUrl = null;
  }

  downloadOrOpenSegmentPdf(seg: ItinerarySegmentResponseDto): void {
    if (!seg.proofFileUrl) return;
    if (typeof window !== 'undefined') {
      if (seg.proofFileUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = seg.proofFileUrl;
        link.download = seg.proofFileName || `itinerary_proof_${seg.id}.pdf`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(seg.proofFileUrl, '_blank');
      }
    }
  }

  // Itinerary Segments Action Handlers
  onToggleAddSegmentForm(): void {
    if (!this.isManagerApproved && !this.showAddSegmentForm) {
      alert('Itinerary segments can only be added after this travel request is approved by your Manager.');
      return;
    }
    this.showAddSegmentForm = !this.showAddSegmentForm;
    this.removeSelectedSegmentPdf();
    if (this.showAddSegmentForm) {
      this.newSegment = {
        segmentType: '',
        title: '',
        location: '',
        startTime: '',
        endTime: '',
        purposeOfWork: '',
        notes: '',
        proofFileUrl: '',
        proofFileName: ''
      };
    }
  }

  onSubmitSegment(): void {
    if (!this.isManagerApproved) {
      alert('Itinerary segments can only be added after this travel request is approved by your Manager.');
      return;
    }
    if (!this.newSegment.segmentType) {
      alert('Please select a segment type (Flight, Hotel, Food, Cab, Train, Bus).');
      return;
    }
    if (!this.newSegment.title?.trim() || !this.newSegment.location?.trim()) {
      alert('Please provide title and location for the itinerary segment.');
      return;
    }
    if (!this.newSegment.startTime || !this.newSegment.endTime) {
      alert('Please provide both start time and end time.');
      return;
    }
    if (!this.newSegment.purposeOfWork?.trim()) {
      this.newSegment.purposeOfWork = this.selectedRequest?.purpose || `Official business at ${this.newSegment.location}`;
    }
    if (!this.newSegment.proofFileName && !this.newSegment.proofFileUrl && this.selectedSegmentPdfName) {
      this.newSegment.proofFileName = this.selectedSegmentPdfName;
      this.newSegment.proofFileUrl = `simulated_storage/itineraries/${this.selectedSegmentPdfName}`;
    }
    this.addSegment.emit({ ...this.newSegment });
    this.showAddSegmentForm = false;
    this.removeSelectedSegmentPdf();
  }

  onDeleteSegment(id: number): void {
    this.deleteSegment.emit(id);
  }

  getSegmentIcon(type: SegmentType | string): string {
    switch (type) {
      case SegmentType.FLIGHT: return 'bi-airplane-fill text-primary';
      case SegmentType.HOTEL: return 'bi-building text-warning';
      case SegmentType.TRAIN: return 'bi-train-front-fill text-info';
      case SegmentType.CAB: return 'bi-taxi-front-fill text-success';
      case SegmentType.BUS: return 'bi-bus-front-fill text-secondary';
      case SegmentType.FOOD: return 'bi-cup-hot-fill text-danger';
      default: return 'bi-geo-alt-fill text-primary';
    }
  }

  onDeleteRequest(req: TravelRequestResponseDto): void {
    this.deleteRequest.emit(req);
  }
}
