import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Role } from '../models/enums.model';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { getDepartmentTextClass } from '../shared/status-utils';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './employee-details.component.html',
  styleUrl: './employee-details.component.css'
})
export class EmployeeDetailsComponent implements OnInit, OnDestroy {
  @Input() currentUser: CurrentUser | null = null;

  users: CurrentUser[] = [];
  searchTerm = '';
  scopeFilter: 'ALL' | 'EMPLOYEES' | 'MANAGERS' | 'FINANCE' | 'MY_TEAM' = 'ALL';
  selectedEmployee: CurrentUser | null = null;
  isRefreshing = false;

  currentPage = 1;
  pageSize = 10;

  Role = Role;
  getDepartmentTextClass = getDepartmentTextClass;

  private usersSub: Subscription | null = null;

  constructor(public userContext: UserContextService) {}

  ngOnInit(): void {
    this.users = this.userContext.availableUsers || [];
    this.usersSub = this.userContext.users$.subscribe(list => {
      this.users = list || [];
    });
  }

  ngOnDestroy(): void {
    this.usersSub?.unsubscribe();
  }

  get canAccess(): boolean {
    if (!this.currentUser) return false;
    const role = String(this.currentUser.role || '').toUpperCase();
    return role === Role.FINANCE || role === Role.ADMIN;
  }

  get isFinance(): boolean {
    if (!this.currentUser) return false;
    const role = String(this.currentUser.role || '').toUpperCase();
    return role === Role.FINANCE;
  }

  get scopedUsers(): CurrentUser[] {
    if (!this.canAccess) return [];

    let baseList = this.users;
    if (this.scopeFilter === 'EMPLOYEES') {
      baseList = baseList.filter(u => String(u.role) === Role.EMPLOYEE);
    } else if (this.scopeFilter === 'MANAGERS') {
      baseList = baseList.filter(u => String(u.role) === Role.MANAGER);
    } else if (this.scopeFilter === 'FINANCE') {
      baseList = baseList.filter(u => String(u.role) === Role.FINANCE);
    } else if (this.scopeFilter === 'MY_TEAM' && this.currentUser) {
      const uid = this.currentUser.id;
      baseList = baseList.filter(u => u.managerId === uid || u.financeId === uid);
    }

    const q = this.searchTerm.trim().toLowerCase();
    if (!q) {
      return baseList;
    }

    return baseList.filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.departmentName || '').toLowerCase().includes(q) ||
      (u.bankName || '').toLowerCase().includes(q) ||
      (u.bankBranch || '').toLowerCase().includes(q) ||
      (u.ifscCode || '').toLowerCase().includes(q) ||
      (u.accountNumber || '').toLowerCase().includes(q)
    );
  }

  get paginatedUsers(): CurrentUser[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.scopedUsers.slice(start, start + this.pageSize);
  }

  get totalEmployeesCount(): number {
    return this.users.filter(u => String(u.role) === Role.EMPLOYEE).length;
  }

  get totalManagersCount(): number {
    return this.users.filter(u => String(u.role) === Role.MANAGER).length;
  }

  get totalFinanceCount(): number {
    return this.users.filter(u => String(u.role) === Role.FINANCE).length;
  }

  get bankConfiguredCount(): number {
    return this.scopedUsers.filter(u => this.hasBankDetails(u)).length;
  }

  hasBankDetails(user: CurrentUser | null | undefined): boolean {
    if (!user) return false;
    return Boolean(
      user.bankName?.trim() &&
      user.bankBranch?.trim() &&
      user.ifscCode?.trim() &&
      user.accountNumber?.trim()
    );
  }

  hasPartialBankDetails(user: CurrentUser | null | undefined): boolean {
    if (!user || this.hasBankDetails(user)) return false;
    return Boolean(
      user.bankName?.trim() ||
      user.bankBranch?.trim() ||
      user.ifscCode?.trim() ||
      user.ifscName?.trim() ||
      user.accountNumber?.trim()
    );
  }

  getRoleLabel(role: Role | string): string {
    switch (role) {
      case Role.ADMIN:
        return 'Administrator';
      case Role.FINANCE:
        return 'Finance Officer';
      case Role.MANAGER:
        return 'Manager';
      default:
        return 'Employee';
    }
  }

  getRoleTextClass(role: Role | string): string {
    switch (role) {
      case Role.ADMIN:
        return 'text-warning-emphasis';
      case Role.FINANCE:
        return 'text-success';
      case Role.MANAGER:
        return 'text-info-emphasis';
      default:
        return 'text-primary';
    }
  }

  setScopeFilter(scope: 'EMPLOYEES' | 'MANAGERS' | 'FINANCE' | 'MY_TEAM' | 'ALL'): void {
    this.scopeFilter = scope;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  refreshDirectory(): void {
    this.isRefreshing = true;
    this.userContext.refreshUsers().subscribe({
      next: () => {
        this.isRefreshing = false;
      },
      error: () => {
        this.isRefreshing = false;
      }
    });
  }

  openEmployeeModal(emp: CurrentUser): void {
    this.selectedEmployee = emp;
  }

  closeEmployeeModal(): void {
    this.selectedEmployee = null;
  }
}
