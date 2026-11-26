import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyProfileComponent } from './my-profile.component';
import { UserContextService, CurrentUser } from '../services/user-context.service';
import { Role } from '../models/enums.model';
import { of } from 'rxjs';

describe('MyProfileComponent', () => {
  let component: MyProfileComponent;
  let fixture: ComponentFixture<MyProfileComponent>;
  let userContextServiceMock: any;

  const mockEmployeeUser: CurrentUser = {
    id: 2,
    fullName: 'Alice Johnson',
    email: 'alice.employee@company.com',
    role: Role.EMPLOYEE,
    departmentName: 'Engineering',
    managerId: 1,
    managerName: 'Bob Miller',
    financeId: 3,
    financeName: 'Carol Davis',
    password: 'Alice@Emp123',
    bankName: 'HDFC Bank',
    bankBranch: 'Vadodara Main Branch',
    ifscCode: 'HDFC0000123',
    ifscName: 'HDFC Bank Ltd - Vadodara Branch',
    accountNumber: '50100456789123'
  };

  const mockUsersList: CurrentUser[] = [
    mockEmployeeUser,
    { id: 1, fullName: 'Bob Miller', email: 'bob.manager@company.com', role: Role.MANAGER, departmentName: 'Engineering' },
    { id: 3, fullName: 'Carol Davis', email: 'carol.finance@company.com', role: Role.FINANCE, departmentName: 'Finance' },
    { id: 4, fullName: 'Dave Wilson', email: 'dave.admin@company.com', role: Role.ADMIN, departmentName: 'Executive' }
  ];

  beforeEach(async () => {
    userContextServiceMock = {
      availableUsers: [...mockUsersList],
      managers: [mockUsersList[1]],
      updateUserProfile: vi.fn().mockImplementation((userId, profileData) => {
        return of({
          ...mockEmployeeUser,
          ...profileData
        });
      })
    };

    await TestBed.configureTestingModule({
      imports: [MyProfileComponent],
      providers: [
        { provide: UserContextService, useValue: userContextServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyProfileComponent);
    component = fixture.componentInstance;
    component.currentUser = mockEmployeeUser;
    fixture.detectChanges();
  });

  it('should create the component and initialize profile form with current user details', () => {
    expect(component).toBeTruthy();
    expect(component.editFullName).toBe('Alice Johnson');
    expect(component.editEmail).toBe('alice.employee@company.com');
    expect(component.editDepartment).toBe('Engineering');
    expect(component.editPassword).toBe('Alice@Emp123');
    expect(component.editManagerId).toBe(1);
    expect(component.editFinanceId).toBe(3);
    expect(component.editBankName).toBe('HDFC Bank');
    expect(component.editBankBranch).toBe('Vadodara Main Branch');
    expect(component.editIfscCode).toBe('HDFC0000123');
    expect(component.editIfscName).toBe('HDFC Bank Ltd - Vadodara Branch');
    expect(component.editAccountNumber).toBe('50100456789123');
  });

  it('should validate empty full name and email format', () => {
    // Empty full name
    component.editFullName = '   ';
    component.saveProfile();
    expect(component.formError).toContain('Please enter your full name');

    // Invalid email
    component.editFullName = 'Alice Johnson';
    component.editEmail = 'not-an-email';
    component.saveProfile();
    expect(component.formError).toContain('Please provide a valid corporate email format');
  });

  it('should prevent using duplicate email already registered to another user', () => {
    component.editEmail = 'bob.manager@company.com';
    component.saveProfile();
    expect(component.formError).toContain('already registered to another corporate account');
  });

  it('should validate short password', () => {
    component.editPassword = '123';
    component.saveProfile();
    expect(component.formError).toContain('Password must be at least 4 characters long');
  });

  it('should save profile changes including bank details and emit profileUpdated', () => {
    const emitSpy = vi.spyOn(component.profileUpdated, 'emit');

    component.editFullName = 'Alice Smith';
    component.editEmail = 'alice.smith@company.com';
    component.editDepartment = 'Human Resources';
    component.editPassword = 'newPassword456';
    component.editManagerId = 1;
    component.editFinanceId = 3;
    component.editBankName = 'State Bank of India';
    component.editBankBranch = 'Alkapuri Branch';
    component.editIfscCode = 'sbin0001234';
    component.editIfscName = 'SBI Alkapuri';
    component.editAccountNumber = '987654321012';

    component.saveProfile();

    expect(userContextServiceMock.updateUserProfile).toHaveBeenCalledWith(2, expect.objectContaining({
      fullName: 'Alice Smith',
      email: 'alice.smith@company.com',
      password: 'newPassword456',
      departmentName: 'Human Resources',
      bankName: 'State Bank of India',
      bankBranch: 'Alkapuri Branch',
      ifscCode: 'SBIN0001234',
      ifscName: 'SBI Alkapuri',
      accountNumber: '987654321012'
    }));

    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Alice Smith',
      email: 'alice.smith@company.com',
      departmentName: 'Human Resources',
      bankName: 'State Bank of India',
      bankBranch: 'Alkapuri Branch',
      ifscCode: 'SBIN0001234',
      ifscName: 'SBI Alkapuri',
      accountNumber: '987654321012'
    }));
    expect(component.formSuccess).toContain('Profile details updated successfully');
    expect(component.isSaving).toBe(false);
  });

  it('should render all five bank details input fields in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const bankNameInput = compiled.querySelector('input[name="bankName"]');
    const bankBranchInput = compiled.querySelector('input[name="bankBranch"]');
    const ifscCodeInput = compiled.querySelector('input[name="ifscCode"]');
    const ifscNameInput = compiled.querySelector('input[name="ifscName"]');
    const accountNumberInput = compiled.querySelector('input[name="accountNumber"]');

    expect(bankNameInput).toBeTruthy();
    expect(bankBranchInput).toBeTruthy();
    expect(ifscCodeInput).toBeTruthy();
    expect(ifscNameInput).toBeTruthy();
    expect(accountNumberInput).toBeTruthy();
  });

  it('should not contain manager and finance reassign input fields in edit profile template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const managerSelect = compiled.querySelector('select[name="managerId"]');
    const financeSelect = compiled.querySelector('select[name="financeId"]');
    expect(managerSelect).toBeNull();
    expect(financeSelect).toBeNull();
  });

  it('should discard changes and reset form to current user values', () => {
    component.editFullName = 'Modified Name';
    component.editEmail = 'modified@company.com';
    component.showPassword = true;

    component.resetForm();

    expect(component.editFullName).toBe('Alice Johnson');
    expect(component.editEmail).toBe('alice.employee@company.com');
    expect(component.showPassword).toBe(false);
  });

  it('should toggle password visibility flag', () => {
    expect(component.showPassword).toBe(false);
    component.showPassword = true;
    expect(component.showPassword).toBe(true);
  });

  it('should toggle isEditing mode when Edit and Cancel buttons are clicked', () => {
    expect(component.isEditing).toBe(false);
    component.toggleEdit();
    expect(component.isEditing).toBe(true);
    component.cancelEdit();
    expect(component.isEditing).toBe(false);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const editBtn = compiled.querySelector('button[title*="edit profile"]');
    expect(editBtn).toBeTruthy();
  });

  it('should hide Assigned Manager and Assigned Finance details when logged in as EMPLOYEE', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).not.toContain('Assigned Manager:');
    expect(text).not.toContain('Assigned Finance:');
    expect(text).not.toContain('Bob Miller');
    expect(text).not.toContain('Carol Davis');

    fixture.componentRef.setInput('currentUser', {
      id: 1,
      fullName: 'Bob Miller',
      email: 'bob.manager@company.com',
      role: Role.MANAGER,
      departmentName: 'Engineering',
      managerName: 'Dave Wilson',
      financeName: 'Carol Davis'
    });
    fixture.detectChanges();

    const managerText = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(managerText).toContain('Assigned Manager:');
    expect(managerText).toContain('Assigned Finance:');
    expect(managerText).toContain('Carol Davis');
  });
});
