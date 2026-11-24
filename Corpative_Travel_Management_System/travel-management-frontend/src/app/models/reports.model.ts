import { TravelRequestResponseDto } from './travel-request.model';

export interface CostSummaryReportDto {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalEstimatedBudget: number;
  totalActualReimbursedSpend: number;
}

export interface DepartmentSpendDto {
  departmentName: string;
  totalTrips: number;
  totalReimbursedSpend: number;
}

export interface EmployeeTravelHistoryDto {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  totalTrips: number;
  totalReimbursedAmount: number;
  travelHistory: TravelRequestResponseDto[];
}