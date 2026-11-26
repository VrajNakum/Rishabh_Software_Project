import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { UserContextService, CurrentUser } from '../services/user-context.service';
import { Role } from '../models/enums.model';
import { BehaviorSubject } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let userContextMock: any;

  const mockUsers: CurrentUser[] = [
    { id: 2, fullName: 'Alice Johnson', email: 'alice.employee@company.com', role: Role.EMPLOYEE, departmentName: 'Engineering', managerId: 1, managerName: 'Bob Miller' },
    { id: 1, fullName: 'Bob Miller', email: 'bob.manager@company.com', role: Role.MANAGER, departmentName: 'Engineering' },
    { id: 3, fullName: 'Carol Davis', email: 'carol.finance@company.com', role: Role.FINANCE, departmentName: 'Finance' },
    { id: 4, fullName: 'Dave Wilson', email: 'dave.admin@company.com', role: Role.ADMIN, departmentName: 'Engineering' }
  ];

  beforeEach(async () => {
    vi.useFakeTimers();

    userContextMock = {
      availableUsers: [...mockUsers],
      users$: new BehaviorSubject<CurrentUser[]>(mockUsers),
      login: vi.fn(),
      loginWithUser: vi.fn(),
      findUserByEmail: vi.fn(),
      loginWithEmailOnly: vi.fn(),
      resetPassword: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: UserContextService, useValue: userContextMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create the login component with left-side quote hero and default password login card on right', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;

    // Verify left-side quote hero and stepper
    expect(compiled.querySelector('.login-hero-quote')?.textContent).toContain('Every trip, from request to refund, in one place.');
    expect(compiled.querySelector('.login-hero-desc')?.textContent).toContain('Raise a request, get it approved by your manager and finance');

    const stepLabels = compiled.querySelectorAll('.step-label');
    expect(stepLabels.length).toBe(4);
    expect(stepLabels[0].textContent).toContain('Request submitted');
    expect(stepLabels[1].textContent).toContain('Manager approves');
    expect(stepLabels[2].textContent).toContain('Finance approves');
    expect(stepLabels[3].textContent).toContain('Expenses verified and refunded');

    // Verify no demo role cards
    expect(compiled.querySelector('.quick-demo-roles')).toBeNull();
    expect(compiled.querySelector('.demo-role-card')).toBeNull();

    // Verify password field is standard without eye icon or Required badge
    const passwordInput = compiled.querySelector('#loginPassword') as HTMLInputElement;
    expect(passwordInput).toBeTruthy();
    expect(passwordInput.getAttribute('type')).toBe('password');

    const passwordGroup = passwordInput.closest('.mb-3');
    expect(passwordGroup?.querySelector('.badge')).toBeNull();
    expect(passwordGroup?.querySelector('button')).toBeNull();
  });

  it('should validate empty email input', () => {
    component.emailOrUsername = '';
    component.password = 'somePassword123';
    component.onLogin();
    expect(component.errorMessage).toContain('Please enter your corporate email address or username.');
    expect(userContextMock.login).not.toHaveBeenCalled();
  });

  it('should validate empty password input', () => {
    component.emailOrUsername = 'alice.employee@company.com';
    component.password = '';
    component.onLogin();
    expect(component.errorMessage).toContain('Please enter your corporate password to sign in.');
    expect(userContextMock.login).not.toHaveBeenCalled();
  });

  it('should call userContext.login on valid input and emit loginSuccess on success', () => {
    const emitSpy = vi.spyOn(component.loginSuccess, 'emit');
    userContextMock.login.mockReturnValue({
      success: true,
      user: mockUsers[0]
    });

    component.emailOrUsername = 'alice.employee@company.com';
    component.password = 'Alice@Emp123';
    component.onLogin();

    vi.advanceTimersByTime(200);

    expect(userContextMock.login).toHaveBeenCalledWith('alice.employee@company.com', 'Alice@Emp123');
    expect(emitSpy).toHaveBeenCalledWith(mockUsers[0]);
    expect(component.errorMessage).toBeNull();
  });

  it('should set error message on failed login', () => {
    const emitSpy = vi.spyOn(component.loginSuccess, 'emit');
    userContextMock.login.mockReturnValue({
      success: false,
      message: 'No corporate account found.'
    });

    component.emailOrUsername = 'unknown@company.com';
    component.password = 'wrongpassword';
    component.onLogin();

    vi.advanceTimersByTime(200);

    expect(userContextMock.login).toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('No corporate account found.');
  });

  it('should log in immediately when clicking quick login button', () => {
    const emitSpy = vi.spyOn(component.loginSuccess, 'emit');

    component.onQuickLogin(mockUsers[1]); // Bob Miller (Manager)

    expect(userContextMock.loginWithUser).toHaveBeenCalledWith(mockUsers[1]);
    expect(emitSpy).toHaveBeenCalledWith(mockUsers[1]);
    expect(component.emailOrUsername).toBe('bob.manager@company.com');
  });

  it('should switch to forgot password mode and populate email if already typed', () => {
    component.emailOrUsername = 'alice.employee@company.com';
    component.openForgotPassword();

    expect(component.isForgotPasswordMode).toBe(true);
    expect(component.forgotPasswordEmail).toBe('alice.employee@company.com');

    component.backToLogin();
    expect(component.isForgotPasswordMode).toBe(false);
  });

  it('should verify corporate email and allow user to join system via email ID', () => {
    const emitSpy = vi.spyOn(component.loginSuccess, 'emit');
    userContextMock.findUserByEmail.mockReturnValue(mockUsers[0]);
    userContextMock.loginWithEmailOnly.mockReturnValue({
      success: true,
      user: mockUsers[0]
    });

    component.openForgotPassword();
    component.forgotPasswordEmail = 'alice.employee@company.com';
    component.onVerifyEmail();

    vi.advanceTimersByTime(200);

    expect(userContextMock.findUserByEmail).toHaveBeenCalledWith('alice.employee@company.com');
    expect(component.verifiedUser).toEqual(mockUsers[0]);
    expect(component.forgotPasswordSuccessMessage).toContain('Account verified');

    // Join via Email ID
    component.onJoinViaEmail();
    vi.advanceTimersByTime(200);

    expect(userContextMock.loginWithEmailOnly).toHaveBeenCalledWith('alice.employee@company.com');
    expect(emitSpy).toHaveBeenCalledWith(mockUsers[0]);
  });

  it('should allow user to reset password and join system', () => {
    const emitSpy = vi.spyOn(component.loginSuccess, 'emit');
    userContextMock.findUserByEmail.mockReturnValue(mockUsers[0]);
    userContextMock.resetPassword.mockReturnValue({
      success: true,
      user: mockUsers[0]
    });

    component.openForgotPassword();
    component.verifiedUser = mockUsers[0];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const newPwdInput = compiled.querySelector('input[placeholder*="Enter new password"]') as HTMLInputElement;
    expect(newPwdInput).toBeTruthy();
    expect(newPwdInput.getAttribute('type')).toBe('password');
    expect(newPwdInput.closest('.input-group')?.querySelector('button')).toBeNull();

    // Short password check
    component.newPassword = '123';
    component.onResetPasswordAndJoin();
    expect(component.forgotPasswordErrorMessage).toContain('at least 4 characters');

    // Valid password
    component.newPassword = 'newPassword2026';
    component.onResetPasswordAndJoin();
    vi.advanceTimersByTime(200);

    expect(userContextMock.resetPassword).toHaveBeenCalledWith('alice.employee@company.com', 'newPassword2026');
    expect(emitSpy).toHaveBeenCalledWith(mockUsers[0]);
  });
});
