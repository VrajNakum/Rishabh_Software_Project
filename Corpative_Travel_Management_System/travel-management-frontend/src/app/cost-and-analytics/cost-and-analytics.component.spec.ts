import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CostAndAnalyticsComponent } from './cost-and-analytics.component';

describe('CostAndAnalyticsComponent', () => {
  let component: CostAndAnalyticsComponent;
  let fixture: ComponentFixture<CostAndAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CostAndAnalyticsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CostAndAnalyticsComponent);
    component = fixture.componentInstance;
    component.costSummary = {
      totalRequests: 10,
      approvedRequests: 5,
      pendingRequests: 3,
      rejectedRequests: 2,
      totalEstimatedBudget: 15000,
      totalActualReimbursedSpend: 8000
    };
    component.departmentSpends = [
      {
        departmentName: 'Engineering',
        totalTrips: 6,
        totalReimbursedSpend: 5000
      }
    ];
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render cost summary numbers in the template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total Requests');
    expect(compiled.textContent).toContain('10');
    expect(compiled.textContent).toContain('Engineering');
    expect(compiled.textContent).toContain('₹8,000.00');
  });

  it('should render gracefully with default zero values when costSummary is null', () => {
    fixture.componentRef.setInput('costSummary', null);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total Requests');
    expect(compiled.textContent).toContain('Reimbursed');
    expect(compiled.textContent).toContain('₹0.00');
  });

  it('should display department spend details and trip counts', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Engineering');
    expect(compiled.textContent).toContain('6 Trips');
    expect(compiled.textContent).toContain('₹5,000.00');
  });
});
