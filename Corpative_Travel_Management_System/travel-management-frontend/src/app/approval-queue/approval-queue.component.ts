import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../models/enums.model';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { getStatusIcon, formatStatusLabel, getDepartmentTextClass } from '../shared/status-utils';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './approval-queue.component.html',
  styleUrl: './approval-queue.component.css'
})
export class ApprovalQueueComponent {
  @Input() requests: TravelRequestResponseDto[] = [];
  @Input() currentUser: CurrentUser | null = null;
  @Input() processingApprovalId: { [requestId: number]: 'APPROVE' | 'REJECT' } = {};
  @Input() isDeletingRequestId: number | null = null;

  @Input() rejectingRequest: TravelRequestResponseDto | null = null;
  @Input() rejectionComment: string = '';
  @Input() reimbursementRequestedTripIds: Set<number> = new Set();

  @Output() approve = new EventEmitter<number>();
  @Output() openRejectModal = new EventEmitter<TravelRequestResponseDto>();
  @Output() confirmReject = new EventEmitter<void>();
  @Output() cancelReject = new EventEmitter<void>();
  @Output() rejectionCommentChange = new EventEmitter<string>();
  @Output() deleteRequest = new EventEmitter<TravelRequestResponseDto>();
  @Output() viewTripDetails = new EventEmitter<TravelRequestResponseDto>();

  getStatusIcon = getStatusIcon;
  formatStatusLabel = formatStatusLabel;
  getDepartmentTextClass = getDepartmentTextClass;

  // Pagination - Approval Queue
  currentPage = 1;
  pageSize = 10;

  // Scope filter: 'ASSIGNED' (default for reviewers), 'MY_REQUESTS', 'ALL'
  queueScope: 'ASSIGNED' | 'MY_REQUESTS' | 'ALL' = 'ASSIGNED';

  constructor(public userContext: UserContextService) {}

  get filteredRequests(): TravelRequestResponseDto[] {
    if (!this.currentUser) return [];

    // Employees in User Portal strictly see ONLY requests created by themselves
    if (this.isEmployee) {
      return this.requests.filter(req => req.employeeId === this.currentUser?.id);
    }

    // Admin sees all corporate travel requests, or when reviewer selects ALL scope
    if (this.isAdmin || this.queueScope === 'ALL') {
      return this.requests;
    }

    if (this.queueScope === 'MY_REQUESTS') {
      return this.requests.filter(req => req.employeeId === this.currentUser?.id);
    }

    // Assigned Manager sees ONLY requests submitted by their assigned reportees
    if (this.currentUser.role === Role.MANAGER || (this.currentUser.role as string) === 'MANAGER') {
      return this.requests.filter(req => {
        const mgr = this.userContext.getAssignedManagerForRequest(req);
        return mgr.id === this.currentUser?.id;
      });
    }

    // Assigned Finance sees ONLY requests routed to this Finance officer
    if (this.currentUser.role === Role.FINANCE || (this.currentUser.role as string) === 'FINANCE') {
      return this.requests.filter(req => {
        const fin = this.userContext.getAssignedFinanceForRequest(req);
        return fin.id === this.currentUser?.id;
      });
    }

    return this.requests.filter(req => req.employeeId === this.currentUser?.id);
  }

  get paginatedRequests(): TravelRequestResponseDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get totalItems(): number {
    return this.filteredRequests.length;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === Role.ADMIN || (this.currentUser?.role as string) === 'ADMIN';
  }

  get isEmployee(): boolean {
    return this.currentUser?.role === Role.EMPLOYEE || (this.currentUser?.role as string) === 'EMPLOYEE';
  }

  getAssignedManagerName(req: TravelRequestResponseDto): string {
    const mgr = this.userContext.getAssignedManagerForRequest(req);
    return mgr.name || 'Unassigned';
  }

  getAssignedFinanceName(req: TravelRequestResponseDto): string {
    const fin = this.userContext.getAssignedFinanceForRequest(req);
    return fin.name || 'Carol Davis';
  }

  canApprove(req: TravelRequestResponseDto): boolean {
    return this.userContext.canUserApproveRequest(req, this.currentUser);
  }

  onApprove(requestId: number): void {
    this.approve.emit(requestId);
  }

  onViewTripDetails(req: TravelRequestResponseDto): void {
    this.viewTripDetails.emit(req);
  }

  isReimbursementRequested(tripId: number): boolean {
    return this.reimbursementRequestedTripIds?.has(tripId) ?? false;
  }

  onOpenReject(req: TravelRequestResponseDto): void {
    this.openRejectModal.emit(req);
  }

  onCancelRejection(): void {
    this.cancelReject.emit();
  }

  onCommentChange(val: string): void {
    this.rejectionComment = val;
    this.rejectionCommentChange.emit(val);
  }

  onConfirmReject(): void {
    this.confirmReject.emit();
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
