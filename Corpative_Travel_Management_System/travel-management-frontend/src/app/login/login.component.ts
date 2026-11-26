import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserContextService, CurrentUser } from '../services/user-context.service';
import { Role } from '../models/enums.model';
import { getRoleTextClass } from '../shared/status-utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  @Output() loginSuccess = new EventEmitter<CurrentUser>();

  emailOrUsername = '';
  password = '';
  rememberMe = true;
  errorMessage: string | null = null;
  isSubmitting = false;
  activeQuickLoginId: number | null = null;

  // Forgot Password / Join via Email ID State
  isForgotPasswordMode = false;
  forgotPasswordEmail = '';
  verifiedUser: CurrentUser | null = null;
  newPassword = '';
  isVerifyingEmail = false;
  isJoiningViaEmail = false;
  isResettingPassword = false;
  forgotPasswordSuccessMessage: string | null = null;
  forgotPasswordErrorMessage: string | null = null;

  demoUsers: CurrentUser[] = [];
  getRoleTextClass = getRoleTextClass;

  constructor(public userContext: UserContextService) {}

  ngOnInit(): void {
    this.demoUsers = this.userContext.availableUsers.slice(0, 4);
    this.userContext.users$.subscribe(users => {
      if (users && users.length > 0) {
        this.demoUsers = users.slice(0, 4);
      }
    });
  }

  onLogin(): void {
    if (!this.emailOrUsername.trim()) {
      this.errorMessage = 'Please enter your corporate email address or username.';
      return;
    }

    if (!this.password || !this.password.trim()) {
      this.errorMessage = 'Please enter your corporate password to sign in.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const res = this.userContext.login(this.emailOrUsername, this.password);
    this.isSubmitting = false;

    if (res.success && res.user) {
      this.loginSuccess.emit(res.user);
    } else {
      this.errorMessage = res.message || 'Invalid credentials. Please verify your email or password.';
    }
  }

  onQuickLogin(user: CurrentUser): void {
    if (this.isSubmitting || this.activeQuickLoginId !== null) return;
    this.activeQuickLoginId = user.id;
    this.emailOrUsername = user.email;
    this.password = user.password || '';
    this.errorMessage = null;

    this.userContext.loginWithUser(user);
    this.activeQuickLoginId = null;
    this.loginSuccess.emit(user);
  }

  openForgotPassword(): void {
    this.isForgotPasswordMode = true;
    this.errorMessage = null;
    this.forgotPasswordErrorMessage = null;
    this.forgotPasswordSuccessMessage = null;
    this.verifiedUser = null;
    this.newPassword = '';
    if (this.emailOrUsername && this.emailOrUsername.includes('@')) {
      this.forgotPasswordEmail = this.emailOrUsername.trim();
    }
  }

  backToLogin(): void {
    this.isForgotPasswordMode = false;
    this.forgotPasswordErrorMessage = null;
    this.forgotPasswordSuccessMessage = null;
    this.verifiedUser = null;
    this.newPassword = '';
  }

  onVerifyEmail(): void {
    const email = this.forgotPasswordEmail.trim();
    if (!email) {
      this.forgotPasswordErrorMessage = 'Please enter your corporate email address.';
      return;
    }

    this.isVerifyingEmail = true;
    this.forgotPasswordErrorMessage = null;
    this.forgotPasswordSuccessMessage = null;

    const user = this.userContext.findUserByEmail(email);
    this.isVerifyingEmail = false;
    if (!user) {
      this.forgotPasswordErrorMessage = `No corporate account found matching '${email}'. Please verify your email or contact your administrator.`;
      this.verifiedUser = null;
    } else {
      this.verifiedUser = user;
      this.forgotPasswordSuccessMessage = `Account verified for ${user.fullName} (${user.role}). You can join the system immediately or set a new password.`;
    }
  }

  onJoinViaEmail(): void {
    if (!this.verifiedUser || this.isJoiningViaEmail) return;
    this.isJoiningViaEmail = true;
    this.forgotPasswordErrorMessage = null;

    const res = this.userContext.loginWithEmailOnly(this.verifiedUser!.email);
    this.isJoiningViaEmail = false;
    if (res.success && res.user) {
      this.loginSuccess.emit(res.user);
    } else {
      this.forgotPasswordErrorMessage = res.message || 'Unable to sign in with email.';
    }
  }

  onResetPasswordAndJoin(): void {
    if (!this.verifiedUser || this.isResettingPassword) return;
    const pwd = this.newPassword.trim();
    if (!pwd) {
      this.forgotPasswordErrorMessage = 'Please enter a new password.';
      return;
    }
    if (pwd.length < 4) {
      this.forgotPasswordErrorMessage = 'Password must be at least 4 characters long.';
      return;
    }

    this.isResettingPassword = true;
    this.forgotPasswordErrorMessage = null;

    const res = this.userContext.resetPassword(this.verifiedUser!.email, pwd);
    this.isResettingPassword = false;
    if (res.success && res.user) {
      this.loginSuccess.emit(res.user);
    } else {
      this.forgotPasswordErrorMessage = res.message || 'Failed to update password.';
    }
  }

  getRoleIcon(role: Role): string {
    switch (role) {
      case Role.EMPLOYEE:
        return 'bi-person-badge';
      case Role.MANAGER:
        return 'bi-person-check-fill';
      case Role.FINANCE:
        return 'bi-cash-coin';
      case Role.ADMIN:
        return 'bi-shield-lock-fill';
      default:
        return 'bi-person';
    }
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
}
