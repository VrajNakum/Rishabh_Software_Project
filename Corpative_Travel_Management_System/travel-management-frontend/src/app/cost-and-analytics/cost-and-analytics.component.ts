import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CostSummaryReportDto, DepartmentSpendDto } from '../models/reports.model';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-cost-and-analytics',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './cost-and-analytics.component.html',
  styleUrl: './cost-and-analytics.component.css'
})
export class CostAndAnalyticsComponent {
  @Input() costSummary: CostSummaryReportDto | null = null;
  @Input() departmentSpends: DepartmentSpendDto[] = [];
  @Input() countPending: number = 0;
  @Input() countDraft: number = 0;

  get effectiveCostSummary(): CostSummaryReportDto {
    return this.costSummary || {
      totalRequests: 0,
      approvedRequests: 0,
      pendingRequests: 0,
      rejectedRequests: 0,
      totalEstimatedBudget: 0,
      totalActualReimbursedSpend: 0
    };
  }

  // Pagination - Department Spends
  currentPage = 1;
  pageSize = 10;

  get paginatedDepartmentSpends(): DepartmentSpendDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return (this.departmentSpends || []).slice(start, start + this.pageSize);
  }
}
