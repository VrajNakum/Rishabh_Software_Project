// Matches request and response payloads

import { RequestStatus, TravelClass } from './enums.model';

export interface TravelRequestCreateDto {
  employeeId: number;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  estimatedBudget: number;
  travelClass: TravelClass;
  draft: boolean;
}

export interface TravelRequestResponseDto {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentName: string;
  destination: string;
  startDate: string;
  endDate: string;
  purpose: string;
  estimatedBudget: number;
  travelClass: TravelClass;
  status: RequestStatus;
  managerId?: number | null;
  managerName?: string | null;
  financeId?: number | null;
  financeName?: string | null;
  policyViolated: boolean;
  policyViolationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalActionDto {
  reviewerUserId: number;
  action: 'APPROVE' | 'REJECT';
  comments?: string;
}

export interface ApprovalAuditLogDto {
  id: number;
  travelRequestId: number;
  actionByUserId: number;
  actionByUserName: string;
  previousStatus: RequestStatus;
  newStatus: RequestStatus;
  comments: string;
  actionTimestamp: string;
}

export interface PredefinedTravelPolicyDto {
  departmentName: string;
  maxBudgetLimit: number;
  allowedTravelClass: TravelClass;
}