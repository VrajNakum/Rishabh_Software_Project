import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { Role } from '../models/enums.model';
import { getDepartmentTextClass, getRoleTextClass } from '../shared/status-utils';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit, OnChanges {
  @Input() currentUser: CurrentUser | null = null;
  @Output() profileUpdated = new EventEmitter<CurrentUser>();

  Role = Role;
  getDepartmentTextClass = getDepartmentTextClass;
  getRoleTextClass = getRoleTextClass;

  // Form Model
  editFullName = '';
  editEmail = '';
  editPassword = '';
  editDepartment = 'Engineering';
  editManagerId: number | null = null;
  editFinanceId: number | null = null;

  // Bank Details Form Model
  editBankName = '';
  editBankBranch = '';
  editIfscCode = '';
  editIfscName = '';
  editAccountNumber = '';
  editBankProofFileName = '';
  editBankProofFileUrl = '';
  bankProofFileSize = '';
  bankProofUploadError: string | null = null;

  showPassword = false;
  isEditing = false;
  isSaving = false;
  formError: string | null = null;
  formSuccess: string | null = null;

  commonDepartments: string[] = [
    'Engineering',
    'Finance',
    'Human Resources',
    'Sales',
    'Marketing',
    'Operations',
    'Legal',
    'Executive'
  ];

  constructor(public userContext: UserContextService) {}

  ngOnInit(): void {
    this.resetForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUser'] && this.currentUser) {
      this.resetForm();
    }
  }

  get users(): CurrentUser[] {
    return this.userContext.availableUsers;
  }

  get managers(): CurrentUser[] {
    const list = this.userContext.managers;
    if (!this.currentUser) return list;
    return list.filter(m => m.id !== this.currentUser?.id);
  }

  get financeOfficers(): CurrentUser[] {
    const list = this.userContext.availableUsers.filter(u => u.role === Role.FINANCE);
    if (!this.currentUser) return list;
    return list.filter(f => f.id !== this.currentUser?.id);
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      setTimeout(() => {
        const firstInput = document.querySelector('input[name="fullName"]') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }

  cancelEdit(): void {
    this.resetForm();
    this.isEditing = false;
  }

  resetForm(): void {
    if (!this.currentUser) return;
    this.editFullName = this.currentUser.fullName || '';
    this.editEmail = this.currentUser.email || '';
    this.editPassword = this.currentUser.password || '';
    this.editDepartment = this.currentUser.departmentName || 'Engineering';
    this.editManagerId = this.currentUser.managerId ?? null;
    this.editFinanceId = this.currentUser.financeId ?? null;

    // Bank Details
    this.editBankName = this.currentUser.bankName || '';
    this.editBankBranch = this.currentUser.bankBranch || '';
    this.editIfscCode = this.currentUser.ifscCode || '';
    this.editIfscName = this.currentUser.ifscName || '';
    this.editAccountNumber = this.currentUser.accountNumber || '';
    this.editBankProofFileName = this.currentUser.bankProofFileName || '';
    this.editBankProofFileUrl = this.currentUser.bankProofFileUrl || '';
    this.bankProofFileSize = '';
    this.bankProofUploadError = null;

    this.showPassword = false;
    this.formError = null;
    this.formSuccess = null;
  }

  onBankFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.bankProofUploadError = null;

    if (file.size > 10 * 1024 * 1024) {
      this.bankProofUploadError = 'File size exceeds maximum allowed limit of 10MB.';
      return;
    }

    const sizeKB = (file.size / 1024).toFixed(1);
    this.bankProofFileSize = `${sizeKB} KB`;
    this.editBankProofFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.editBankProofFileUrl = reader.result as string;
    };
    reader.onerror = () => {
      this.bankProofUploadError = 'Failed to read document file. Please try again.';
    };
    reader.readAsDataURL(file);
  }

  removeBankFile(): void {
    this.editBankProofFileName = '';
    this.editBankProofFileUrl = '';
    this.bankProofFileSize = '';
    this.bankProofUploadError = null;
  }

  saveProfile(): void {
    if (!this.currentUser) return;
    this.formError = null;
    this.formSuccess = null;

    const name = this.editFullName.trim();
    const email = this.editEmail.trim().toLowerCase();
    const password = this.editPassword.trim();
    const dept = this.editDepartment.trim();

    if (!name) {
      this.formError = 'Please enter your full name.';
      return;
    }

    if (!email) {
      this.formError = 'Please enter a valid corporate email address.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.formError = 'Please provide a valid corporate email format (e.g. name@company.com).';
      return;
    }

    // Check if another user has this email
    const duplicate = this.users.find(u => u.id !== this.currentUser?.id && u.email.toLowerCase() === email);
    if (duplicate) {
      this.formError = `The email '${email}' is already registered to another corporate account.`;
      return;
    }

    if (!password) {
      this.formError = 'Password cannot be blank.';
      return;
    }

    if (password.length < 4) {
      this.formError = 'Password must be at least 4 characters long.';
      return;
    }

    this.isSaving = false;

    const optimisticUpdated: CurrentUser = {
      ...this.currentUser,
      fullName: name,
      email: email,
      password: password,
      departmentName: dept,
      bankName: this.editBankName.trim(),
      bankBranch: this.editBankBranch.trim(),
      ifscCode: this.editIfscCode.trim().toUpperCase(),
      ifscName: this.editIfscName.trim(),
      accountNumber: this.editAccountNumber.trim(),
      bankProofFileName: this.editBankProofFileName,
      bankProofFileUrl: this.editBankProofFileUrl
    };

    // 1. Instantly display success feedback on button click!
    this.formSuccess = 'Profile details updated successfully!';
    this.isEditing = false;
    this.profileUpdated.emit(optimisticUpdated);

    const profileData: Partial<CurrentUser> = {
      fullName: name,
      email: email,
      password: password,
      departmentName: dept,
      bankName: this.editBankName.trim(),
      bankBranch: this.editBankBranch.trim(),
      ifscCode: this.editIfscCode.trim().toUpperCase(),
      ifscName: this.editIfscName.trim(),
      accountNumber: this.editAccountNumber.trim(),
      bankProofFileName: this.editBankProofFileName,
      bankProofFileUrl: this.editBankProofFileUrl
    };

    // 2. Persist to database in background
    this.userContext.updateUserProfile(this.currentUser.id, profileData).subscribe({
      next: (updated) => {
        this.profileUpdated.emit(updated);
      },
      error: (err) => {
        this.formError = err?.message || 'Failed to update profile in database.';
      }
    });
  }

  getRoleBadgeClass(role?: Role): string {
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
        return 'bg-light text-dark border';
    }
  }
}
