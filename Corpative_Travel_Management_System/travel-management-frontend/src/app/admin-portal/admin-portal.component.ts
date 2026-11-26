import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Role } from '../models/enums.model';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { UserCreatePayload } from '../services/user.service';
import { TravelRequestResponseDto } from '../models/travel-request.model';
import { formatStatusLabel, getStatusIcon, getDepartmentTextClass, getRoleTextClass } from '../shared/status-utils';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-admin-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './admin-portal.component.html',
  styleUrl: './admin-portal.component.css'
})
export class AdminPortalComponent implements OnInit {
  @Input() currentUser!: CurrentUser;
  @Input() requests: TravelRequestResponseDto[] = [];
  @Output() userCreated = new EventEmitter<CurrentUser>();
  @Output() userDeleted = new EventEmitter<CurrentUser>();
  @Output() userAssignmentsUpdated = new EventEmitter<CurrentUser>();
  @Output() userRoleUpdated = new EventEmitter<CurrentUser>();
  @Output() userSwitched = new EventEmitter<number>();
  @Output() budgetUpdated = new EventEmitter<{ requestId: number; newBudget: number }>();
  @Output() deleteRequest = new EventEmitter<TravelRequestResponseDto>();
  @Output() viewTripDetails = new EventEmitter<TravelRequestResponseDto>();

  // Role enums for template binding
  Role = Role;
  selectableRoles: { role: Role; label: string; description: string; icon: string }[] = [
    {
      role: Role.EMPLOYEE,
      label: 'Employee',
      description: 'Submit & track travel requests, file itinerary expenses and reimbursement claims.',
      icon: 'bi-person-badge'
    },
    {
      role: Role.MANAGER,
      label: 'Manager',
      description: 'Review, approve, or reject employee travel requests and manage team itineraries.',
      icon: 'bi-person-check-fill'
    },
    {
      role: Role.FINANCE,
      label: 'Finance Officer',
      description: 'Audit budget compliance, review financial policies, and disburse travel expense claims.',
      icon: 'bi-cash-coin'
    }
  ];

  editableRoles: { role: Role; label: string; description: string; icon: string }[] = [
    ...this.selectableRoles,
    {
      role: Role.ADMIN,
      label: 'Administrator',
      description: 'Full system administration: manage users, access roles, assignments, and travel request budgets.',
      icon: 'bi-shield-lock-fill'
    }
  ];

  commonDepartments: string[] = [
    'Engineering',
    'Finance',
    'Sales',
    'Human Resources',
    'Marketing',
    'Operations'
  ];

  // User Filter & Search State
  selectedRoleFilter: 'ALL' | Role = 'ALL';
  searchQuery = '';

  // Add User Modal State
  showAddUserModal = false;
  isSavingUser = false;
  formError: string | null = null;

  newUser: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
    departmentName: string;
    managerId: number | null;
    financeId: number | null;
  } = {
    fullName: '',
    email: '',
    password: '',
    role: Role.EMPLOYEE,
    departmentName: 'Engineering',
    managerId: null,
    financeId: null
  };

  // Budget Update Modal State
  editingBudgetRequest: TravelRequestResponseDto | null = null;
  updatedBudgetValue = 0;
  isUpdatingBudget = false;

  // Remove User Confirmation State
  userToDelete: CurrentUser | null = null;
  isDeletingUser = false;
  deletingUserId: number | null = null;

  // Reassign Manager & Finance Modal State
  showReassignModal = false;
  reassigningUser: CurrentUser | null = null;
  reassignType: 'MANAGER' | 'FINANCE' = 'MANAGER';
  selectedManagerId: number | null = null;
  selectedFinanceId: number | null = null;
  isSavingAssignments = false;
  reassignError: string | null = null;

  // Edit User Access Role Modal State
  showEditRoleModal = false;
  editingRoleUser: CurrentUser | null = null;
  selectedUserRole: Role = Role.EMPLOYEE;
  isSavingUserRole = false;
  roleEditError: string | null = null;

  getStatusIcon = getStatusIcon;
  formatStatusLabel = formatStatusLabel;
  getDepartmentTextClass = getDepartmentTextClass;
  getRoleTextClass = getRoleTextClass;

  constructor(public userContext: UserContextService) {}

  ngOnInit(): void {
    this.userContext.refreshUsers?.().subscribe();

    // If no manager selected initially, pick the first available manager if any
    const firstManager = this.userContext.managers[0];
    if (firstManager) {
      this.newUser.managerId = firstManager.id;
    }
    const firstFinance = this.financeOfficers[0];
    if (firstFinance) {
      this.newUser.financeId = firstFinance.id;
    }
  }

  get users(): CurrentUser[] {
    return this.userContext.availableUsers;
  }

  get managers(): CurrentUser[] {
    return this.userContext.managers;
  }

  get financeOfficers(): CurrentUser[] {
    return this.userContext.availableUsers.filter(u => u.role === Role.FINANCE);
  }

  get eligibleManagers(): CurrentUser[] {
    if (!this.reassigningUser) return this.managers;
    return this.managers.filter(m => m.id !== this.reassigningUser?.id);
  }

  getEligibleManagersFor(user: CurrentUser): CurrentUser[] {
    return this.managers.filter(m => m.id !== user.id);
  }

  get eligibleFinanceOfficers(): CurrentUser[] {
    if (!this.reassigningUser) return this.financeOfficers;
    return this.financeOfficers.filter(f => f.id !== this.reassigningUser?.id);
  }

  getEligibleFinanceOfficersFor(user: CurrentUser): CurrentUser[] {
    return this.financeOfficers.filter(f => f.id !== user.id);
  }

  get filteredUsers(): CurrentUser[] {
    return this.users.filter(u => {
      const matchesRole = this.selectedRoleFilter === 'ALL' || u.role === this.selectedRoleFilter;
      const q = this.searchQuery.trim().toLowerCase();
      const matchesSearch = !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.departmentName && u.departmentName.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }

  // Pagination - Users Directory
  userCurrentPage = 1;
  userPageSize = 10;

  get paginatedUsers(): CurrentUser[] {
    const start = (this.userCurrentPage - 1) * this.userPageSize;
    return this.filteredUsers.slice(start, start + this.userPageSize);
  }

  // Pagination - Requests Oversight
  requestCurrentPage = 1;
  requestPageSize = 10;

  get paginatedRequests(): TravelRequestResponseDto[] {
    const start = (this.requestCurrentPage - 1) * this.requestPageSize;
    return this.requests.slice(start, start + this.requestPageSize);
  }

  get countEmployees(): number {
    return this.users.filter(u => u.role === Role.EMPLOYEE).length;
  }

  get countManagers(): number {
    return this.users.filter(u => u.role === Role.MANAGER).length;
  }

  get countFinance(): number {
    return this.users.filter(u => u.role === Role.FINANCE).length;
  }

  get countAdmins(): number {
    return this.users.filter(u => u.role === Role.ADMIN).length;
  }

  get defaultManagerName(): string {
    const mgr = this.managers[0] || this.users.find(u => u.role === Role.MANAGER);
    return mgr ? mgr.fullName : 'Bob Miller';
  }

  get defaultFinanceName(): string {
    const fin = this.financeOfficers[0] || this.users.find(u => u.role === Role.FINANCE);
    return fin ? fin.fullName : 'Carol Davis';
  }

  openAddUserModal(defaultRole?: Role): void {
    this.formError = null;
    const managersList = this.managers;
    const financeList = this.financeOfficers;
    const defaultManagerId = managersList.length > 0 ? managersList[0].id : null;
    const defaultFinanceId = financeList.length > 0 ? financeList[0].id : null;

    this.newUser = {
      fullName: '',
      email: '',
      password: '',
      role: defaultRole || Role.EMPLOYEE,
      departmentName: defaultRole === Role.FINANCE ? 'Finance' : 'Engineering',
      managerId: defaultManagerId,
      financeId: defaultFinanceId
    };
    this.showAddUserModal = true;
  }

  closeAddUserModal(): void {
    if (this.isSavingUser) return;
    this.showAddUserModal = false;
    this.formError = null;
  }

  onRoleChange(newRole: Role): void {
    this.newUser.role = newRole;
    if (newRole === Role.FINANCE && this.newUser.departmentName === 'Engineering') {
      this.newUser.departmentName = 'Finance';
    }
    if (!this.newUser.financeId) {
      this.newUser.financeId = this.financeOfficers.length > 0 ? this.financeOfficers[0].id : null;
    }
    if (!this.newUser.managerId) {
      this.newUser.managerId = this.managers.length > 0 ? this.managers[0].id : null;
    }
  }

  submitAddUser(): void {
    if (this.isSavingUser) return;
    this.formError = null;

    const name = this.newUser.fullName.trim();
    const email = this.newUser.email.trim().toLowerCase();
    const password = this.newUser.password ? this.newUser.password.trim() : '';
    const dept = this.newUser.departmentName.trim();

    if (!name) {
      this.formError = 'Please enter the user’s full name.';
      return;
    }

    if (!email) {
      this.formError = 'Please enter a valid email address.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.formError = 'Please provide a valid email format (e.g., user@company.com).';
      return;
    }

    const emailExists = this.users.some(u => u.email.toLowerCase() === email);
    if (emailExists) {
      this.formError = `A user with email '${email}' already exists.`;
      return;
    }

    if (!password) {
      this.formError = 'Please enter an account password for login access.';
      return;
    }

    if (password.length < 4) {
      this.formError = 'Password must be at least 4 characters long.';
      return;
    }

    if (!dept) {
      this.formError = 'Please specify or select a department.';
      return;
    }

    this.isSavingUser = true;

    const defaultManagerId = this.managers.length > 0 ? this.managers[0].id : null;
    const defaultFinanceId = this.financeOfficers.length > 0 ? this.financeOfficers[0].id : null;

    // Default to first available manager and finance officer if no selection was chosen
    const assignedManagerId = this.newUser.managerId ?? defaultManagerId;
    const assignedFinanceId = this.newUser.financeId ?? defaultFinanceId;

    const payload: UserCreatePayload = {
      fullName: name,
      email: email,
      password: password,
      role: this.newUser.role,
      departmentName: dept,
      managerId: assignedManagerId,
      financeId: assignedFinanceId
    };

    this.userContext.createUser(payload).subscribe({
      next: (created) => {
        this.isSavingUser = false;
        this.showAddUserModal = false;
        this.userCreated.emit(created);
      },
      error: (err) => {
        this.isSavingUser = false;
        this.formError = err?.error?.message || err?.message || 'Failed to save user to database. Please try again.';
      }
    });
  }

  switchingUserId: number | null = null;

  onSwitchUser(userId: number): void {
    this.switchingUserId = userId;
    this.userContext.setCurrentUser(userId);
    this.userSwitched.emit(userId);
    this.switchingUserId = null;
  }

  // Budget Update Support
  openEditBudgetModal(req: TravelRequestResponseDto): void {
    this.editingBudgetRequest = req;
    this.updatedBudgetValue = req.estimatedBudget;
  }

  closeEditBudgetModal(): void {
    this.editingBudgetRequest = null;
    this.isUpdatingBudget = false;
  }

  confirmUpdateBudget(): void {
    if (!this.editingBudgetRequest) return;
    if (this.updatedBudgetValue <= 0) {
      alert('Estimated budget must be greater than 0.');
      return;
    }
    this.isUpdatingBudget = true;
    const requestId = this.editingBudgetRequest.id;
    const newBudget = this.updatedBudgetValue;
    this.budgetUpdated.emit({ requestId, newBudget });
    this.isUpdatingBudget = false;
    this.closeEditBudgetModal();
  }

  promptDeleteUser(user: CurrentUser): void {
    if (user.id === this.currentUser.id) return;
    this.userToDelete = user;
  }

  cancelDeleteUser(): void {
    if (this.isDeletingUser) return;
    this.userToDelete = null;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;
    const target = this.userToDelete;
    this.isDeletingUser = false;
    this.deletingUserId = null;
    this.userToDelete = null;
    this.userDeleted.emit(target);

    this.userContext.removeUser(target.id).subscribe({
      next: () => {},
      error: () => {
        this.userContext.removeUserLocally(target.id);
      }
    });
  }

  openReassignModal(user: CurrentUser, focusType: 'MANAGER' | 'FINANCE' = 'MANAGER'): void {
    this.reassigningUser = user;
    this.reassignType = focusType;
    this.selectedManagerId = user.managerId !== null && user.managerId !== undefined ? Number(user.managerId) : null;
    this.selectedFinanceId = user.financeId !== null && user.financeId !== undefined ? Number(user.financeId) : null;
    this.reassignError = null;
    this.showReassignModal = true;
  }

  setReassignType(type: 'MANAGER' | 'FINANCE'): void {
    this.reassignType = type;
    this.reassignError = null;
  }

  closeReassignModal(): void {
    if (this.isSavingAssignments) return;
    this.showReassignModal = false;
    this.reassigningUser = null;
    this.reassignError = null;
  }

  getUserManagerName(u: CurrentUser): string {
    if (u.managerName) return u.managerName;
    if (u.managerId !== null && u.managerId !== undefined) {
      const mgr = this.managers.find(m => Number(m.id) === Number(u.managerId));
      if (mgr) return mgr.fullName;
    }
    return u.role === Role.EMPLOYEE ? this.defaultManagerName : 'None';
  }

  getUserFinanceName(u: CurrentUser): string {
    if (u.financeName) return u.financeName;
    if (u.financeId !== null && u.financeId !== undefined) {
      const fin = this.financeOfficers.find(f => Number(f.id) === Number(u.financeId));
      if (fin) return fin.fullName;
    }
    return u.role === Role.FINANCE ? 'Self (Finance Officer)' : this.defaultFinanceName;
  }

  saveUserAssignments(): void {
    if (!this.reassigningUser) return;
    this.reassignError = null;

    const targetUser = this.reassigningUser;
    const targetUserId = targetUser.id;
    const normMgrId = (this.selectedManagerId !== null && this.selectedManagerId !== undefined && String(this.selectedManagerId) !== 'null')
      ? Number(this.selectedManagerId)
      : null;
    const normFinId = (this.selectedFinanceId !== null && this.selectedFinanceId !== undefined && String(this.selectedFinanceId) !== 'null')
      ? Number(this.selectedFinanceId)
      : null;

    const mgr = this.managers.find(m => Number(m.id) === Number(normMgrId));
    const fin = this.financeOfficers.find(f => Number(f.id) === Number(normFinId));

    // Update targetUser directly IN-PLACE so the table row updates INSTANTLY!
    targetUser.managerId = normMgrId;
    targetUser.managerName = mgr ? mgr.fullName : (normMgrId ? `Manager #${normMgrId}` : null);
    targetUser.financeId = normFinId;
    targetUser.financeName = fin ? fin.fullName : (targetUser.role === Role.FINANCE ? 'Self (Finance Officer)' : (normFinId ? `Finance #${normFinId}` : null));

    const optimisticUpdated: CurrentUser = { ...targetUser };

    // 1. Instantly close modal & emit update event on button click!
    this.isSavingAssignments = false;
    this.showReassignModal = false;
    this.reassigningUser = null;
    this.userAssignmentsUpdated.emit(optimisticUpdated);

    // 2. Sync in background
    this.userContext.updateUserAssignments(targetUserId, normMgrId, normFinId).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to update assignments in backend:', err);
      }
    });
  }

  openEditRoleModal(user: CurrentUser): void {
    if (this.currentUser && user.id === this.currentUser.id) return;
    this.editingRoleUser = user;
    this.selectedUserRole = user.role;
    this.roleEditError = null;
    this.showEditRoleModal = true;
  }

  closeEditRoleModal(): void {
    if (this.isSavingUserRole) return;
    this.showEditRoleModal = false;
    this.editingRoleUser = null;
    this.roleEditError = null;
  }

  getRoleOptionInfo(role: Role): { role: Role; label: string; description: string; icon: string } {
    return this.editableRoles.find(r => r.role === role) || this.editableRoles[0];
  }

  saveUserRole(): void {
    if (!this.editingRoleUser) return;
    if (this.currentUser && this.editingRoleUser.id === this.currentUser.id) {
      this.roleEditError = 'Cannot change the role of the currently active Admin session.';
      return;
    }

    this.roleEditError = null;
    const targetUser = this.editingRoleUser;
    const targetUserId = targetUser.id;
    const newRole = this.selectedUserRole;

    // Update targetUser in-place so the table row and role counts update immediately
    targetUser.role = newRole;
    if (newRole !== Role.FINANCE && targetUser.financeId === targetUser.id) {
      targetUser.financeId = null;
      targetUser.financeName = null;
    }
    if (newRole !== Role.MANAGER && targetUser.managerId === targetUser.id) {
      targetUser.managerId = null;
      targetUser.managerName = null;
    }
    if (newRole === Role.FINANCE && !targetUser.financeId) {
      targetUser.financeName = 'Self (Finance Officer)';
    } else if (newRole !== Role.FINANCE && targetUser.financeName === 'Self (Finance Officer)' && !targetUser.financeId) {
      targetUser.financeName = null;
    }

    const optimisticUpdated: CurrentUser = { ...targetUser };

    this.isSavingUserRole = false;
    this.showEditRoleModal = false;
    this.editingRoleUser = null;
    this.userRoleUpdated.emit(optimisticUpdated);

    this.userContext.updateUserRole(targetUserId, newRole).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to update user role in backend:', err);
      }
    });
  }

  onQuickReassignManager(user: CurrentUser, newManagerId: number | null): void {
    const mgr = this.managers.find(m => m.id === newManagerId);
    const updatedUser: CurrentUser = {
      ...user,
      managerId: newManagerId,
      managerName: mgr ? mgr.fullName : (user.role === Role.EMPLOYEE ? this.defaultManagerName : 'None')
    };

    user.managerId = updatedUser.managerId;
    user.managerName = updatedUser.managerName;

    // Immediately emit update event so UI updates instantly without any loading
    this.userAssignmentsUpdated.emit(updatedUser);

    // Sync to backend in background
    this.userContext.updateUserAssignments(user.id, newManagerId, user.financeId ?? null).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to update manager assignment in backend:', err);
      }
    });
  }

  onQuickReassignFinance(user: CurrentUser, newFinanceId: number | null): void {
    const fin = this.financeOfficers.find(f => f.id === newFinanceId);
    const updatedUser: CurrentUser = {
      ...user,
      financeId: newFinanceId,
      financeName: fin ? fin.fullName : (user.role === Role.FINANCE ? 'Self (Finance Officer)' : this.defaultFinanceName)
    };

    user.financeId = updatedUser.financeId;
    user.financeName = updatedUser.financeName;

    // Immediately emit update event so UI updates instantly without any loading
    this.userAssignmentsUpdated.emit(updatedUser);

    // Sync to backend in background
    this.userContext.updateUserAssignments(user.id, user.managerId ?? null, newFinanceId).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Failed to update finance assignment in backend:', err);
      }
    });
  }

  getRoleBadgeClass(role: Role): string {
    switch (role) {
      case Role.EMPLOYEE:
        return 'bg-primary-subtle text-primary border border-primary-subtle';
      case Role.MANAGER:
        return 'bg-info-subtle text-info-emphasis border border-info-subtle';
      case Role.FINANCE:
        return 'bg-success-subtle text-success border border-success-subtle';
      case Role.ADMIN:
        return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
      default:
        return 'bg-light text-dark';
    }
  }

  onDeleteRequest(req: TravelRequestResponseDto): void {
    this.deleteRequest.emit(req);
  }

  onViewTripDetails(req: TravelRequestResponseDto): void {
    this.viewTripDetails.emit(req);
  }
}
