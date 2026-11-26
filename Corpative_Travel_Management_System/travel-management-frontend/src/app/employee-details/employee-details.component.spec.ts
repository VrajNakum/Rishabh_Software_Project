import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeDetailsComponent } from './employee-details.component';
import { Role } from '../models/enums.model';
import { CurrentUser, UserContextService } from '../services/user-context.service';
import { of } from 'rxjs';

describe('EmployeeDetailsComponent', () => {
  let component: EmployeeDetailsComponent;
  let fixture: ComponentFixture<EmployeeDetailsComponent>;

  const sampleUsers: CurrentUser[] = [
    {
      id: 1,
      fullName: 'Bob Miller',
      email: 'bob@company.com',
      role: Role.MANAGER,
      departmentName: 'Engineering'
    },
    {
      id: 3,
      fullName: 'Carol Davis',
      email: 'carol@company.com',
      role: Role.FINANCE,
      departmentName: 'Finance'
    },
    {
      id: 2,
      fullName: 'Alice Johnson',
      email: 'alice@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Engineering',
      managerId: 1,
      managerName: 'Bob Miller',
      financeId: 3,
      financeName: 'Carol Davis',
      bankName: 'HDFC Bank',
      bankBranch: 'Vadodara Main',
      ifscCode: 'HDFC0000123',
      ifscName: 'HDFC Vadodara',
      accountNumber: '50100456789123'
    },
    {
      id: 5,
      fullName: 'Employee Missing Bank',
      email: 'nobank@company.com',
      role: Role.EMPLOYEE,
      departmentName: 'Marketing',
      managerId: 1,
      managerName: 'Bob Miller',
      financeId: 3,
      financeName: 'Carol Davis'
    }
  ];

  const userContextMock = {
    availableUsers: sampleUsers,
    users$: of(sampleUsers),
    refreshUsers: vi.fn().mockReturnValue(of(sampleUsers))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeDetailsComponent],
      providers: [{ provide: UserContextService, useValue: userContextMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeDetailsComponent);
    component = fixture.componentInstance;
    component.currentUser = sampleUsers[0]; // Manager
    fixture.detectChanges();
  });

  it('should allow access for Manager, Finance, and Admin, and deny Employee', () => {
    expect(component.canAccess).toBe(true);

    fixture.componentRef.setInput('currentUser', { ...sampleUsers[0], role: Role.FINANCE });
    fixture.detectChanges();
    expect(component.canAccess).toBe(true);

    fixture.componentRef.setInput('currentUser', { ...sampleUsers[0], role: Role.ADMIN });
    fixture.detectChanges();
    expect(component.canAccess).toBe(true);

    fixture.componentRef.setInput('currentUser', sampleUsers[2]); // EMPLOYEE
    fixture.detectChanges();
    expect(component.canAccess).toBe(false);
    expect(component.scopedUsers.length).toBe(0);
  });

  it('should display employee details and bank status cleanly', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Alice Johnson');
    expect(text).toContain('HDFC Bank');
    expect(text).toContain('HDFC0000123');
    expect(text).toContain('50100456789123');
    expect(text).toContain('Complete');
    expect(text).toContain('Required');
  });

  it('should filter by Managers and Finance Officers for non-employee portals', () => {
    expect(component.totalManagersCount).toBe(1);
    expect(component.totalFinanceCount).toBe(1);

    component.setScopeFilter('MANAGERS');
    fixture.detectChanges();
    expect(component.scopedUsers.length).toBe(1);
    expect(component.scopedUsers[0].fullName).toBe('Bob Miller');

    component.setScopeFilter('FINANCE');
    fixture.detectChanges();
    expect(component.scopedUsers.length).toBe(1);
    expect(component.scopedUsers[0].fullName).toBe('Carol Davis');
  });

  it('should open and close employee bank details modal', () => {
    component.openEmployeeModal(sampleUsers[2]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('All Required Bank Fields Verified');

    component.closeEmployeeModal();
    fixture.detectChanges();

    expect(component.selectedEmployee).toBeNull();
  });
});
