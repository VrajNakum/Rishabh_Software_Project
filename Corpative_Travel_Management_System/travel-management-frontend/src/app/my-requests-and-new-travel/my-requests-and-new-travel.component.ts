import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravelClass, Role } from '../models/enums.model';
import { PredefinedTravelPolicyDto, TravelRequestCreateDto, TravelRequestResponseDto } from '../models/travel-request.model';
import { CurrentUser } from '../services/user-context.service';
import { getStatusIcon, formatStatusLabel, evaluateTravelPolicy, PolicyEvaluationResult, DEFAULT_PREDEFINED_POLICIES } from '../shared/status-utils';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-my-requests-and-new-travel',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './my-requests-and-new-travel.component.html',
  styleUrl: './my-requests-and-new-travel.component.css'
})
export class MyRequestsAndNewTravelComponent {
  @Input() requests: TravelRequestResponseDto[] = [];
  @Input() policies: PredefinedTravelPolicyDto[] = DEFAULT_PREDEFINED_POLICIES;
  @Input() statusFilter: 'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED' = 'ALL';
  @Input() currentUser: CurrentUser | null = null;
  @Input() editingDraftId: number | null = null;
  @Input() isSubmittingRequest: 'submit' | 'draft' | null = null;
  @Input() isDeletingRequestId: number | null = null;
  @Input() newRequest: TravelRequestCreateDto = {
    employeeId: 2,
    destination: '',
    startDate: '',
    endDate: '',
    purpose: '',
    estimatedBudget: 500,
    travelClass: TravelClass.ECONOMY,
    draft: false
  };

  @Output() submitRequest = new EventEmitter<boolean>();
  @Output() cancelEditDraft = new EventEmitter<void>();
  @Output() loadDraft = new EventEmitter<TravelRequestResponseDto>();
  @Output() viewTripDetails = new EventEmitter<TravelRequestResponseDto>();
  @Output() deleteRequest = new EventEmitter<TravelRequestResponseDto>();
  @Output() statusFilterChange = new EventEmitter<'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED'>();

  travelClasses = Object.values(TravelClass);

  getStatusIcon = getStatusIcon;
  formatStatusLabel = formatStatusLabel;

  private formatLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDaysToIsoDate(isoDate: string, days: number): string {
    const parts = isoDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return isoDate;
    }
    const [year, month, day] = parts;
    return this.formatLocalIsoDate(new Date(year, month - 1, day + days));
  }

  get todayIsoDate(): string {
    return this.formatLocalIsoDate(new Date());
  }

  get minStartDate(): string {
    return this.addDaysToIsoDate(this.todayIsoDate, 1);
  }

  get minEndDate(): string {
    if (this.newRequest?.startDate && this.newRequest.startDate >= this.minStartDate) {
      return this.addDaysToIsoDate(this.newRequest.startDate, 1);
    }
    return this.addDaysToIsoDate(this.minStartDate, 1);
  }

  get isStartDateInvalid(): boolean {
    return !!this.newRequest?.startDate && this.newRequest.startDate <= this.todayIsoDate;
  }

  get isEndDateInvalid(): boolean {
    if (!this.newRequest?.endDate) {
      return false;
    }
    if (this.newRequest.startDate) {
      return this.newRequest.endDate <= this.newRequest.startDate;
    }
    return this.newRequest.endDate <= this.minStartDate;
  }

  onStartDateChange(value: string): void {
    this.newRequest.startDate = value;
    if (this.newRequest.endDate && value && this.newRequest.endDate <= value) {
      this.newRequest.endDate = '';
    }
  }

  get livePolicyEvaluation(): PolicyEvaluationResult {
    return evaluateTravelPolicy(
      this.newRequest?.travelClass,
      this.newRequest?.estimatedBudget,
      this.policies
    );
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === Role.ADMIN || (this.currentUser?.role as string) === 'ADMIN';
  }

  // Strictly filter records for the current logged-in employee so each user has their own independent travel records
  get myRequests(): TravelRequestResponseDto[] {
    if (!this.currentUser) {
      return [];
    }
    return this.requests.filter(r => 
      r.employeeId === this.currentUser!.id || 
      (r.employeeName && this.currentUser?.fullName && r.employeeName.trim().toLowerCase() === this.currentUser.fullName.trim().toLowerCase())
    );
  }

  get filteredRequests(): TravelRequestResponseDto[] {
    const list = this.myRequests;
    if (this.statusFilter === 'ALL') {
      return list;
    }
    if (this.statusFilter === 'APPROVED') {
      return list.filter(r => r.status === 'APPROVED');
    }
    if (this.statusFilter === 'PENDING') {
      return list.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE');
    }
    if (this.statusFilter === 'DRAFT') {
      return list.filter(r => r.status === 'DRAFT');
    }
    if (this.statusFilter === 'REJECTED') {
      return list.filter(r => r.status === 'REJECTED');
    }
    return list;
  }

  get countApproved(): number {
    return this.myRequests.filter(r => r.status === 'APPROVED').length;
  }

  get countPending(): number {
    return this.myRequests.filter(r => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE').length;
  }

  get countDraft(): number {
    return this.myRequests.filter(r => r.status === 'DRAFT').length;
  }

  get countRejected(): number {
    return this.myRequests.filter(r => r.status === 'REJECTED').length;
  }

  // Pagination - Travel Requests
  currentPage = 1;
  pageSize = 10;

  get paginatedRequests(): TravelRequestResponseDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  setStatusFilter(filter: 'ALL' | 'APPROVED' | 'PENDING' | 'DRAFT' | 'REJECTED'): void {
    this.currentPage = 1;
    this.statusFilterChange.emit(filter);
  }

  onFormSubmit(draftMode: boolean): void {
    this.submitRequest.emit(draftMode);
  }

  onCancelEdit(): void {
    this.cancelEditDraft.emit();
  }

  onLoadDraft(req: TravelRequestResponseDto): void {
    this.loadDraft.emit(req);
  }

  onViewTripDetails(req: TravelRequestResponseDto): void {
    this.viewTripDetails.emit(req);
  }

  onDeleteRequest(req: TravelRequestResponseDto): void {
    this.deleteRequest.emit(req);
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
}
